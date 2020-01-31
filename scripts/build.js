const { rollup } = require("rollup")
const resolvePlugin = require("rollup-plugin-node-resolve")
const filesizePlugin = require("rollup-plugin-filesize")
const replacePlugin = require("rollup-plugin-replace")
const terserPlugin = require("rollup-plugin-terser").terser

const fs = require("fs-extra")
const path = require("path")
const ts = require("typescript")

// make sure we're in the right folder
process.chdir(path.resolve(__dirname, ".."))

fs.removeSync("dist")

// these are just to clear out previous way of building so there is no confusion
// can be removed after a while (few months?)
fs.removeSync("lib")
fs.removeSync(".build.es5")
fs.removeSync(".build.es6")

function runTypeScriptBuild(outDir, version, target, declarations) {
    console.log(`Running typescript build (target: ${ts.ScriptTarget[target]}) in ${outDir}/`)

    const tsConfig = path.resolve("tsconfig.json")
    const json = ts.parseConfigFileTextToJson(tsConfig, ts.sys.readFile(tsConfig), true)

    const { options } = ts.parseJsonConfigFileContent(json.config, ts.sys, path.dirname(tsConfig))

    options.rootDir = path.resolve("src", version)
    options.target = target
    options.outDir = path.resolve(outDir, version)
    options.declaration = declarations

    options.module = ts.ModuleKind.ESNext
    options.importHelpers = true
    options.noEmitHelpers = true
    if (declarations) options.declarationDir = path.resolve("dist", version, "lib")

    const rootFile = path.resolve(options.rootDir, "mobx.ts")
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

async function generateBundledModule(inputPath, version, outputFile, format, env) {
    console.log(`Generating ${version} ${outputFile} ${env} bundle.`)

    const replaceEnv = env && replacePlugin({ "process.env.NODE_ENV": JSON.stringify(env) })

    let plugins
    if (env === "production") {
        plugins = [resolvePlugin(), replaceEnv, terserPlugin(), filesizePlugin()]
    } else {
        plugins = [resolvePlugin(), replaceEnv, filesizePlugin()]
    }

    const bundle = await rollup({
        input: path.join(inputPath, version, "mobx.js"),
        plugins
    })

    await bundle.write({
        file: path.join("dist", version, "lib", outputFile),
        format,
        banner: "/** MobX - (c) Michel Weststrate 2015 - 2020 - MIT Licensed */",
        exports: "named",
        name: format === "umd" ? "mobx" : undefined
    })

    console.log(`Generation of ${version} ${outputFile} bundle finished.`)
}

function copyAssets(outPath) {
    console.log(`Copying assets ${outPath}`)
    return Promise.all([
        fs.copyFile("flow-typed/mobx.js", path.resolve(outPath, "lib", "mobx.js.flow")),
        fs.copyFile("LICENSE", path.resolve(outPath, "LICENSE")),
        fs.copyFile("README.md", path.resolve(outPath, "README.md")),
        fs.copyFile("CHANGELOG.md", path.resolve(outPath, "CHANGELOG.md"))
    ])
}

const pkg = require("../package.json")
function writePackage(versionPath, version) {
    // replace `0.y.z` with `v.y.z`, strip `v` prefix
    const pkgVersion = pkg.version.replace(/^0/, version.replace("v", ""))
    fs.writeFileSync(
        path.resolve(versionPath, "package.json"),
        JSON.stringify(
            {
                ...pkg,
                version: pkgVersion,
                scripts: {},
                devDependencies: {},
                jest: undefined,
                husky: undefined
            },
            null,
            2
        )
    )
}

function writeIndex(versionPath) {
    fs.writeFileSync(
        path.resolve(versionPath, "lib", "index.js"),
        `
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    module.exports = require('./mobx.min.js');
} else {
    module.exports = require('./mobx.js');
}
        `
    )
}

async function build(version) {
    const distPath = "dist"
    const es5Build = path.join(distPath, ".build.es5")
    const es6Build = path.join(distPath, ".build.es6")
    const versionPath = path.join(distPath, version)

    runTypeScriptBuild(es5Build, version, ts.ScriptTarget.ES5, true)
    runTypeScriptBuild(es6Build, version, ts.ScriptTarget.ES2015, false)

    await Promise.all([
        generateBundledModule(es5Build, version, "mobx.js", "cjs", "development"),
        generateBundledModule(es5Build, version, "mobx.min.js", "cjs", "production"),

        generateBundledModule(es5Build, version, "mobx.module.js", "es"),
        generateBundledModule(es6Build, version, "mobx.es6.js", "es"),

        generateBundledModule(es5Build, version, "mobx.umd.js", "umd"),
        generateBundledModule(es5Build, version, "mobx.umd.min.js", "umd", "production"),

        copyAssets(versionPath)
    ])

    writeIndex(versionPath)
    writePackage(versionPath, version)
}

Promise.all([build("v4"), build("v5")]).catch(e => {
    console.error(e)
    if (e.frame) {
        console.error(e.frame)
    }
    process.exit(1)
})
