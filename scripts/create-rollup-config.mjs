import { DEFAULT_EXTENSIONS } from "@babel/core"
import { babel } from "@rollup/plugin-babel"
import commonjs from "@rollup/plugin-commonjs"
import json from "@rollup/plugin-json"
import { DEFAULTS as nodeResolveDefaults, nodeResolve } from "@rollup/plugin-node-resolve"
import replace from "@rollup/plugin-replace"
import fs from "fs-extra"
import path from "node:path"
import sourcemaps from "rollup-plugin-sourcemaps"
import { terser } from "rollup-plugin-terser"
import typescript from "typescript"
import typescript2 from "rollup-plugin-typescript2"

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

const privatePropertyTerserOptions = {
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

const writeCjsEntry = packageBase => {
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

const createConfig = ({
    format,
    env,
    declarations,
    extraOutputs = [],
    input,
    packageBase,
    packageName,
    globals
}) => {
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
        globals,
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
            nodeResolve({
                mainFields: ["module", "main", "browser"],
                extensions: [...nodeResolveDefaults.extensions, ".jsx"]
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
            shouldMinify && terser(privatePropertyTerserOptions)
        ].filter(Boolean)
    }
}

export default function createRollupConfig({
    packageName,
    packageBase = packageName,
    input,
    globals = {}
}) {
    const target = process.env.TARGET
    const isTest = target === "test"
    const isPublish = target === "publish"
    const sharedOptions = { input, packageBase, packageName, globals }
    const configs = []

    configs.push(
        createConfig({ ...sharedOptions, format: "cjs", env: "development", declarations: true })
    )
    configs.push(
        createConfig({ ...sharedOptions, format: "cjs", env: "production", declarations: false })
    )

    if (!isTest) {
        if (isPublish) {
            configs.push(
                createConfig({
                    ...sharedOptions,
                    format: "esm",
                    env: "development",
                    declarations: false
                })
            )
            configs.push(
                createConfig({
                    ...sharedOptions,
                    format: "esm",
                    env: "production",
                    declarations: false
                })
            )
        }

        configs.push(
            createConfig({
                ...sharedOptions,
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
        configs.push(
            createConfig({
                ...sharedOptions,
                format: "umd",
                env: "development",
                declarations: false
            })
        )
        configs.push(
            createConfig({
                ...sharedOptions,
                format: "umd",
                env: "production",
                declarations: false
            })
        )
    }

    fs.emptyDirSync(dist)
    writeCjsEntry(packageBase)

    return configs
}
