import { transformAsync } from "@babel/core"
import type { ParserOptions, PluginItem, TransformOptions } from "@babel/core"
import generate from "@babel/generator"
import babelPlugin = require("./babel")
import { normalizeOptions, shouldProcessFile } from "./options"
import { createBabelPlugin, hasChanges } from "./plugin"
import { neededTransforms, TS_FILE_RE } from "./precheck"
import { OBSERVER_SOURCE } from "./transform"

const DEFAULT_INCLUDE = /\.[cm]?[jt]sx?$/
// Babel accepts `false`, the typings do not.
const NO_INPUT_SOURCE_MAP = false as unknown as TransformOptions["inputSourceMap"]

const standaloneBabelPlugin = createBabelPlugin(true)

function mobxReactPlugin(options: mobxReactPlugin.Options = {}): mobxReactPlugin.VitePlugin {
    const { babel: babelOptions, include, exclude, ...pluginOptions } = options
    const normalized = normalizeOptions({
        ...pluginOptions,
        include: include ?? DEFAULT_INCLUDE,
        exclude
    })
    const extraTransforms = Boolean(babelOptions?.plugins?.length || babelOptions?.presets?.length)
    const plugins: PluginItem[] = [
        [extraTransforms ? babelPlugin : standaloneBabelPlugin, pluginOptions],
        ...(babelOptions?.plugins ?? [])
    ]
    let root = process.cwd()

    return {
        name: "mobx-react-plugin",
        enforce: "pre",
        config(userConfig) {
            if (
                normalized.observer === null ||
                userConfig?.optimizeDeps?.exclude?.includes(OBSERVER_SOURCE)
            ) {
                return null
            }
            return { optimizeDeps: { include: [OBSERVER_SOURCE] } }
        },
        configResolved(config) {
            root = config.root
        },
        async transform(code, id) {
            if (id.startsWith("\0")) {
                return null
            }
            const filename = id.split("?")[0]
            if (!shouldProcessFile(filename, root, normalized)) {
                return null
            }
            if (!extraTransforms) {
                const needed = neededTransforms(code, filename, normalized)
                if (!needed.observer && !needed.flow) {
                    return null
                }
            }
            const result = await transformAsync(code, {
                ...babelOptions,
                filename,
                sourceFileName: filename,
                babelrc: false,
                configFile: false,
                browserslistConfigFile: false,
                inputSourceMap: NO_INPUT_SOURCE_MAP,
                sourceType: "module",
                parserOpts: {
                    ...babelOptions?.parserOpts,
                    plugins: resolveParserPlugins(filename, babelOptions?.parserOpts?.plugins)
                },
                plugins,
                code: false,
                ast: true
            })
            if (!result?.ast || (!extraTransforms && !hasChanges(result.metadata))) {
                return null
            }
            const output = generate(
                result.ast,
                { ...babelOptions?.generatorOpts, sourceMaps: true, sourceFileName: filename },
                code
            )
            return { code: output.code, map: output.map }
        }
    }
}

function resolveParserPlugins(
    filename: string,
    babelOptionPlugins: ParserOptions["plugins"] | undefined
): NonNullable<ParserOptions["plugins"]> {
    const plugins: NonNullable<ParserOptions["plugins"]> = []
    if (!TS_FILE_RE.test(filename)) {
        plugins.push("jsx")
    }
    if (/\.[cm]?tsx?$/.test(filename)) {
        plugins.push("typescript")
    }
    plugins.push("decorators", "decoratorAutoAccessors")
    if (babelOptionPlugins) {
        plugins.push(...babelOptionPlugins)
    }
    return plugins
}

namespace mobxReactPlugin {
    export interface VitePlugin {
        name: string
        enforce: "pre"
        config(userConfig?: {
            optimizeDeps?: { exclude?: string[] }
        }): { optimizeDeps: { include: string[] } } | null
        configResolved(config: { root: string }): void
        transform(
            code: string,
            id: string
        ): Promise<{ code: string; map: TransformSourceMap | null | undefined } | null>
    }
    export interface TransformSourceMap {
        version: number
        sources: string[]
        names: string[]
        sourceRoot?: string | undefined
        sourcesContent?: string[] | undefined
        mappings: string
        file: string
    }
    export interface Options extends babelPlugin.Options {
        /**
         * Extra Babel options merged into the transform call (advanced). Code generation
         * options go in `generatorOpts`.
         */
        babel?: TransformOptions
    }
}

export = mobxReactPlugin
