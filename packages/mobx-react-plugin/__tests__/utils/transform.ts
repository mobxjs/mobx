import { transformSync } from "@babel/core"
import type { ParserOptions, PluginItem } from "@babel/core"
import mobxReactPlugin = require("../../src/babel")

interface TransformOptions {
    options?: mobxReactPlugin.Options | false
    filename?: string
    cwd?: string
    sourceType?: "module" | "script" | "unambiguous"
    plugins?: PluginItem[]
    presets?: PluginItem[]
    parserPlugins?: ParserOptions["plugins"]
}

const DEFAULT_PARSER_PLUGINS: NonNullable<ParserOptions["plugins"]> = [
    "jsx",
    "typescript",
    "decorators",
    "decoratorAutoAccessors"
]

export function transform(code: string, opts: TransformOptions = {}): string {
    const {
        options = {},
        filename = "/project/src/Component.tsx",
        cwd = "/project",
        sourceType = "module",
        plugins = [],
        presets = [],
        parserPlugins = DEFAULT_PARSER_PLUGINS
    } = opts
    const result = transformSync(code, {
        filename,
        cwd,
        sourceType,
        babelrc: false,
        configFile: false,
        browserslistConfigFile: false,
        parserOpts: { plugins: parserPlugins },
        plugins: [...(options === false ? [] : [[mobxReactPlugin, options]]), ...plugins],
        presets
    })
    return result!.code!
}

/** Strips a leading newline so expected outputs can be written as template literals. */
export function code(strings: TemplateStringsArray, ...values: unknown[]): string {
    const raw = strings.reduce(
        (acc, str, i) => acc + str + (i < values.length ? String(values[i]) : ""),
        ""
    )
    return raw.replace(/^\n/, "").replace(/\n[ \t]*$/, "")
}
