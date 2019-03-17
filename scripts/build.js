const { rollup } = require("rollup")
const resolvePlugin = require("rollup-plugin-node-resolve")
const filesizePlugin = require("rollup-plugin-filesize")
const replacePlugin = require("rollup-plugin-replace")
const uglifyPlugin = require("rollup-plugin-uglify").uglify

const fs = require("fs-extra")
const path = require("path")
const ts = require("typescript")

// make sure we're in the right folder
process.chdir(path.resolve(__dirname, ".."))

fs.removeSync("lib")
fs.removeSync(".build.es5")
fs.removeSync(".build.es6")

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
                    `${ts.DiagnosticCategory[d.category]} ${d.code} (${d.file}:${d.start}): ${
                        d.messageText
                    }`
            )
            .join("\n")

        throw new Error(`Failed to compile typescript:\n\n${message}`)
    }
}

async function generateBundledModule(inputFile, outputFile, format, production) {
    console.log(`Generating ${outputFile} bundle.`)

    function getEnvVariables(production) {
        return { "process.env.NODE_ENV": production ? "'production'" : "'development'" }
    }

    let plugins
    if (production) {
        plugins = [
            resolvePlugin(),
            replacePlugin(getEnvVariables(true)),
            uglifyPlugin(),
            filesizePlugin()
        ]
    } else {
        plugins = [resolvePlugin(), filesizePlugin()]
    }

    const bundle = await rollup({
        input: inputFile,
        plugins
    })

    await bundle.write({
        file: outputFile,
        format,
        banner: "/** MobX - (c) Michel Weststrate 2015 - 2018 - MIT Licensed */",
        exports: "named",
        name: format === "umd" ? "mobx" : undefined
    })

    console.log(`Generation of ${outputFile} bundle finished.`)
}

function copyFlowDefinitions() {
    console.log("Copying flowtype definitions")
    fs.copyFileSync("flow-typed/mobx.js", "lib/mobx.js.flow")
    console.log("Copying of flowtype definitions done")
}

async function build() {
    runTypeScriptBuild(".build.es5", ts.ScriptTarget.ES5, true)
    runTypeScriptBuild(".build.es6", ts.ScriptTarget.ES2015, false)

    const es5Build = path.join(".build.es5", "mobx.js")
    const es6Build = path.join(".build.es6", "mobx.js")

    await Promise.all([
        generateBundledModule(es5Build, path.join("lib", "mobx.js"), "cjs", false),
        generateBundledModule(es5Build, path.join("lib", "mobx.min.js"), "cjs", true),

        generateBundledModule(es5Build, path.join("lib", "mobx.module.js"), "es", false),

        generateBundledModule(es6Build, path.join("lib", "mobx.es6.js"), "es", false),

        generateBundledModule(es5Build, path.join("lib", "mobx.umd.js"), "umd", false),
        generateBundledModule(es5Build, path.join("lib", "mobx.umd.min.js"), "umd", true)
    ])
    copyFlowDefinitions()
}

build().catch(e => {
    console.error(e)
    if (e.frame) {
        console.error(e.frame)
    }
    process.exit(1)
})
