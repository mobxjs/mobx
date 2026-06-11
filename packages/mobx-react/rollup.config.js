const fs = require("fs-extra")
const path = require("path")
const { DEFAULT_EXTENSIONS } = require("@babel/core")
const typescript = require("typescript")
const babel = require("@rollup/plugin-babel").default
const commonjs = require("@rollup/plugin-commonjs")
const json = require("@rollup/plugin-json")
const nodeResolve = require("@rollup/plugin-node-resolve")
const replace = require("@rollup/plugin-replace")
const sourcemaps = require("rollup-plugin-sourcemaps")
const typescript2 = require("rollup-plugin-typescript2")
const { terser } = require("rollup-plugin-terser")

const packageName = "mobxReact"
const packageBase = "mobxreact"
const input = "src/index.ts"
const target = process.env.TARGET
const isTest = target === "test"
const isPublish = target === "publish"

const dist = "dist"

const tsconfigDefaults = {
    exclude: [
        "**/*.spec.ts",
        "**/*.test.ts",
        "**/*.spec.tsx",
        "**/*.test.tsx",
        "node_modules",
        "bower_components",
        "jspm_packages",
        dist
    ],
    compilerOptions: {
        sourceMap: true,
        declaration: true,
        jsx: "react"
    }
}

const defaultTerserOptions = format => ({
    sourcemap: true,
    output: { comments: false },
    compress: {
        keep_infinity: true,
        pure_getters: true,
        passes: 10
    },
    ecma: 5,
    toplevel: format === "cjs",
    warnings: true
})

const mobxReactTerserOptions = {
    sourcemap: true,
    module: true,
    compress: {
        hoist_funs: true,
        passes: 2,
        keep_fargs: false,
        pure_getters: true,
        unsafe: false
    },
    mangle: {
        properties: {
            regex: /_$/
        }
    }
}

const writeCjsEntry = () => {
    const contents = `
'use strict'

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./${packageBase}.cjs.production.min.js')
} else {
  module.exports = require('./${packageBase}.cjs.development.js')
}
`
    fs.outputFileSync(path.join(dist, "index.js"), contents)
}

const copyMtsTypes = () => ({
    name: "copy-mts-types",
    closeBundle() {
        const dts = path.join(dist, "index.d.ts")
        const dmts = path.join(dist, "index.d.mts")

        if (fs.existsSync(dts)) {
            fs.copyFileSync(dts, dmts)
        }
    }
})

const stripShebang = () => ({
    name: "strip-shebang",
    transform(code) {
        return {
            code: code.replace(/^#!(.*)/, ""),
            map: null
        }
    }
})

const babelPlugin = () =>
    babel({
        babelHelpers: "bundled",
        exclude: "node_modules/**",
        extensions: [...DEFAULT_EXTENSIONS, ".ts", ".tsx"],
        babelrc: false,
        configFile: false,
        passPerPreset: true,
        presets: [
            [
                "@babel/preset-env",
                {
                    bugfixes: true,
                    ignoreBrowserslistConfig: true,
                    loose: true,
                    modules: false,
                    targets: {
                        esmodules: true
                    }
                }
            ]
        ],
        plugins: [
            "babel-plugin-annotate-pure-calls",
            "babel-plugin-dev-expression",
            ["@babel/plugin-proposal-class-properties", { loose: true }]
        ].filter(Boolean)
    })

const createConfig = ({ format, env, declarations, extraOutputs = [] }) => {
    const shouldMinify = env === "production"
    const outputName = [`${dist}/${packageBase}`, format, env, shouldMinify ? "min" : "", "js"]
        .filter(Boolean)
        .join(".")

    const output = {
        file: outputName,
        format,
        freeze: false,
        esModule: true,
        name: packageName,
        sourcemap: true,
        globals: {
            react: "React",
            mobx: "mobx",
            "mobx-react-lite": "mobxReactLite"
        },
        exports: "named"
    }

    return {
        input,
        external(id) {
            if (id.startsWith("regenerator-runtime")) {
                return false
            }
            return !id.startsWith(".") && !path.isAbsolute(id)
        },
        treeshake: {
            propertyReadSideEffects: false
        },
        output: [output, ...extraOutputs],
        plugins: [
            nodeResolve.default({
                mainFields: ["module", "main", "browser"],
                extensions: [...nodeResolve.DEFAULTS.extensions, ".jsx"]
            }),
            commonjs({
                include: format === "umd" ? /\/node_modules\// : /\/regenerator-runtime\//
            }),
            json(),
            stripShebang(),
            typescript2({
                typescript,
                tsconfig: "tsconfig.json",
                tsconfigDefaults,
                tsconfigOverride: {
                    compilerOptions: {
                        target: "esnext",
                        ...(declarations ? {} : { declaration: false, declarationMap: false })
                    }
                },
                check: declarations,
                useTsconfigDeclarationDir: false
            }),
            babelPlugin(),
            env !== undefined &&
                replace({
                    preventAssignment: true,
                    values: {
                        "process.env.NODE_ENV": JSON.stringify(env)
                    }
                }),
            sourcemaps(),
            shouldMinify && terser(defaultTerserOptions(format)),
            shouldMinify && terser(mobxReactTerserOptions),
            declarations && copyMtsTypes()
        ].filter(Boolean)
    }
}

const configs = []

configs.push(createConfig({ format: "cjs", env: "development", declarations: true }))
configs.push(createConfig({ format: "cjs", env: "production", declarations: false }))

if (!isTest) {
    if (isPublish) {
        configs.push(createConfig({ format: "esm", env: "development", declarations: false }))
        configs.push(createConfig({ format: "esm", env: "production", declarations: false }))
    }

    configs.push(
        createConfig({
            format: "esm",
            declarations: false,
            extraOutputs: [
                {
                    file: `${dist}/${packageBase}.mjs`,
                    format: "esm",
                    freeze: false,
                    esModule: true,
                    sourcemap: true,
                    exports: "named"
                }
            ]
        })
    )
    configs.push(createConfig({ format: "umd", env: "development", declarations: false }))
    configs.push(createConfig({ format: "umd", env: "production", declarations: false }))
}

fs.emptyDirSync(dist)
writeCjsEntry()

module.exports = configs
