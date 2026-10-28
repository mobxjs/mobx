import { transformSync } from "@babel/core"
import type { PluginItem } from "@babel/core"
import mobxReactPlugin = require("../../src/babel")

interface TransformOptions {
    options?: mobxReactPlugin.Options
    filename?: string
    sourceType?: "module" | "script"
    plugins?: PluginItem[]
    presets?: PluginItem[]
}

export function transform(code: string, opts: TransformOptions = {}): string {
    const {
        options = {},
        filename = "/project/src/Component.tsx",
        sourceType = "module",
        plugins = [],
        presets = []
    } = opts
    return transformSync(code, {
        filename,
        cwd: "/project",
        sourceType,
        babelrc: false,
        configFile: false,
        browserslistConfigFile: false,
        parserOpts: { plugins: ["jsx", "typescript", "decorators", "decoratorAutoAccessors"] },
        plugins: [[mobxReactPlugin, options], ...plugins],
        presets
    })!.code!
}

export function expectTransform(input: string, expected: string, opts?: TransformOptions) {
    expect(transform(input, opts)).toBe(expected)
}

export function code(strings: TemplateStringsArray): string {
    return strings[0].replace(/^\n/, "").replace(/\n[ \t]*$/, "")
}
