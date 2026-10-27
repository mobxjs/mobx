import { transformAsync } from "@babel/core"
import type { ParserOptions, TransformOptions } from "@babel/core"
import babelPlugin = require("./babel")
import { normalizeOptions, shouldProcessFile } from "./options"

const DEFAULT_INCLUDE = /\.[cm]?[jt]sx?$/

function mobxReactPlugin(options: mobxReactPlugin.Options = {}): mobxReactPlugin.VitePlugin {
    const { parserPlugins, babel: babelOptions, include, exclude, ...pluginOptions } = options
    const filter = normalizeOptions({ include: include ?? DEFAULT_INCLUDE, exclude })
    let root = process.cwd()

    return {
        name: "mobx-react-plugin",
        enforce: "pre",
        configResolved(config) {
            root = config.root
        },
        async transform(code, id) {
            if (id.startsWith("\0")) {
                return null
            }
            const filename = id.split("?")[0]
            if (!shouldProcessFile(filename, root, filter)) {
                return null
            }
            const result = await transformAsync(code, {
                ...babelOptions,
                filename,
                sourceFileName: filename,
                babelrc: false,
                configFile: false,
                browserslistConfigFile: false,
                sourceMaps: true,
                sourceType: "module",
                parserOpts: {
                    ...babelOptions?.parserOpts,
                    plugins: resolveParserPlugins(
                        filename,
                        parserPlugins,
                        babelOptions?.parserOpts?.plugins
                    )
                },
                plugins: [[babelPlugin, pluginOptions], ...(babelOptions?.plugins ?? [])]
            })
            if (!result || result.code == null) {
                return null
            }
            const meta = (
                result.metadata as { mobxReactPlugin?: babelPlugin.TransformResult } | undefined
            )?.mobxReactPlugin
            const extraTransforms = Boolean(
                babelOptions?.plugins?.length || babelOptions?.presets?.length
            )
            if (
                !extraTransforms &&
                (!meta || Object.values(meta).every(list => list.length === 0))
            ) {
                return null
            }
            return { code: result.code, map: result.map }
        }
    }
}

function resolveParserPlugins(
    filename: string,
    userPlugins: ParserOptions["plugins"] | undefined,
    babelOptionPlugins: ParserOptions["plugins"] | undefined
): NonNullable<ParserOptions["plugins"]> {
    const plugins: NonNullable<ParserOptions["plugins"]> = []
    if (!/\.[cm]?ts$/.test(filename)) {
        plugins.push("jsx")
    }
    if (/\.[cm]?tsx?$/.test(filename)) {
        plugins.push("typescript")
    }
    if (userPlugins) {
        plugins.push(...userPlugins)
    } else {
        plugins.push("decorators", "decoratorAutoAccessors")
    }
    if (babelOptionPlugins) {
        plugins.push(...babelOptionPlugins)
    }
    return plugins
}

namespace mobxReactPlugin {
    export interface VitePlugin {
        name: string
        enforce: "pre"
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
         * Babel parser plugins enabled when parsing your sources, in addition to `jsx`
         * and (for `.ts`/`.tsx` files) `typescript`.
         * @default ["decorators", "decoratorAutoAccessors"]
         * @example ["decorators-legacy"]
         */
        parserPlugins?: ParserOptions["plugins"]
        /**
         * Extra Babel options merged into the transform call (advanced).
         */
        babel?: TransformOptions
    }
}

export = mobxReactPlugin
