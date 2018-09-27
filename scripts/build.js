const rollup = require("rollup")
const fs = require("fs-extra")
const path = require("path")
const ts = require("typescript")
const shell = require("shelljs")
const exec = shell.exec

// exit upon first error
shell.set("-e")

const binFolder = path.resolve("node_modules/.bin/")

function getCmd(cmd) {
    if (process.platform === "win32") {
        return path.join(binFolder, cmd + ".cmd")
    }
    return cmd
}

// make sure we're in the right folder
process.chdir(path.resolve(__dirname, ".."))

fs.removeSync("lib")
fs.removeSync(".build.cjs")
fs.removeSync(".build.es")

function runTypeScriptBuild(outDir, target, declarations) {
    console.log(`Running typescript build (target: ${ts.ScriptTarget[target]}) in ${outDir}/`)

    const tsConfig = path.resolve("tsconfig.json")
    const json = ts.parseConfigFileTextToJson(tsConfig, ts.sys.readFile(tsConfig), true)

    const { options } = ts.parseJsonConfigFileContent(json.config, ts.sys, path.dirname(tsConfig))

    options.target = target
    options.outDir = outDir
    options.declaration = declarations

    options.module = ts.ModuleKind.ES2015
    options.importHelpers = true
    options.noEmitHelpers = true
    if (declarations) options.declarationDir = path.resolve(".", "lib")

    const rootFile = path.resolve("src", "mobx.ts")
    const host = ts.createCompilerHost(options, true)
    const prog = ts.createProgram([rootFile], options, host)
    const result = prog.emit()
    if (result.emitSkipped) {
        const message = result.diagnostics
            .map(
                d =>
                    `${ts.DiagnosticCategory[
                        d.category
                    ]} ${d.code} (${d.file}:${d.start}): ${d.messageText}`
            )
            .join("\n")

        throw new Error(`Failed to compile typescript:\n\n${message}`)
    }
}

const rollupPlugins = [require("rollup-plugin-node-resolve")(), require("rollup-plugin-filesize")()]

function generateBundledModule(inputFile, outputFile, format) {
    console.log(`Generating ${outputFile} bundle.`)

    return rollup
        .rollup({
            entry: inputFile,
            plugins: rollupPlugins
        })
        .then(bundle =>
            bundle.write({
                dest: outputFile,
                format,
                banner: "/** MobX - (c) Michel Weststrate 2015, 2016 - MIT Licensed */",
                exports: "named"
            })
        )
}

function generateUmd() {
    console.log("Generating mobx.umd.js")
    exec("browserify -s mobx -e lib/mobx.js -o lib/mobx.umd.js")
}

function generateMinified() {
    const prodEnv = {
        ...process.env,
        NODE_ENV: "production"
    }

    console.log("Generating mobx.min.js and mobx.umd.min.js")
    exec(`${getCmd(`envify`)} lib/mobx.js > lib/mobx.prod.js`, { env: prodEnv })
    exec(
        `${binFolder}/uglifyjs -m sort,toplevel -c warnings=false --screw-ie8 --preamble "/** MobX - (c) Michel Weststrate 2015, 2016 - MIT Licensed */" --source-map lib/mobx.min.js.map -o lib/mobx.min.js lib/mobx.prod.js`
    )
    exec(`${getCmd(`envify`)} lib/mobx.umd.js > lib/mobx.prod.umd.js`, {
        env: prodEnv
    })
    exec(
        `${binFolder}/uglifyjs -m sort,toplevel -c warnings=false --screw-ie8 --preamble "/** MobX - (c) Michel Weststrate 2015, 2016 - MIT Licensed */" --source-map lib/mobx.umd.min.js.map -o lib/mobx.umd.min.js lib/mobx.prod.umd.js`
    )
    shell.rm("lib/mobx.prod.js", "lib/mobx.prod.umd.js")
}

function copyFlowDefinitions() {
    console.log("Copying flowtype definitions")
    exec(`${getCmd(`ncp`)} flow-typed/mobx.js lib/mobx.js.flow`)
}

function build() {
    runTypeScriptBuild(".build.cjs", ts.ScriptTarget.ES5, true)
    runTypeScriptBuild(".build.es", ts.ScriptTarget.ES5, false)
    return Promise.all([
        generateBundledModule(
            path.resolve(".build.cjs", "mobx.js"),
            path.resolve("lib", "mobx.js"),
            "cjs"
        ),

        generateBundledModule(
            path.resolve(".build.es", "mobx.js"),
            path.resolve("lib", "mobx.module.js"),
            "es"
        )
    ]).then(() => {
        generateUmd()
        generateMinified()
        copyFlowDefinitions()
    })
}

build().catch(e => {
    console.error(e)
    if (e.frame) {
        console.error(e.frame)
    }
    process.exit(1)
})
