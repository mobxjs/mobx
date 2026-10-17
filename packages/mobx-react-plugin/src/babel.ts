import type { PluginObj, PluginPass, types as t } from "@babel/core"
import { transformFlows } from "./flow"
import { normalizeOptions, shouldProcessFile } from "./options"
import { transformProgram } from "./transform"

interface BabelApi {
    types: typeof t
    assertVersion(range: string | number): void
}

/**
 * Babel plugin: automatically wraps React components in MobX `observer` and
 * marks them (and custom hooks) with `"use no memo"` so React Compiler leaves
 * them to MobX.
 *
 * All work happens in `Program:enter`. Babel merges the visitors of all plugins
 * into one traversal, so a plugin that used per-function visitors could never
 * reliably run before React Compiler (which also does everything in
 * `Program:enter`). List this plugin *before* `babel-plugin-react-compiler`.
 *
 * It also turns `async` methods of observable classes into MobX flows
 * (the `flow` option).
 *
 * ```js
 * // babel.config.js (Metro / React Native, webpack, Next.js, ...)
 * module.exports = {
 *     plugins: [["mobx-react-plugin/babel", { observer: true, flow: true }], "babel-plugin-react-compiler"]
 * }
 * ```
 */
function mobxReactPlugin(
    api: BabelApi,
    rawOptions?: mobxReactPlugin.Options
): PluginObj<PluginPass> {
    api.assertVersion("^7.0.0 || ^8.0.0-0")
    const options = normalizeOptions(rawOptions)
    return {
        name: "mobx-react-plugin",
        visitor: {
            Program: {
                enter(program, state) {
                    const filename = state.filename
                    const root = (state.file.opts as { root?: string | null }).root ?? state.cwd
                    if (!shouldProcessFile(filename, root, options)) {
                        return
                    }
                    const result: mobxReactPlugin.TransformResult = {
                        wrapped: [],
                        directives: [],
                        aliased: [],
                        flows: []
                    }
                    if (options.observer) {
                        const observed = transformProgram(
                            api.types,
                            program,
                            options.observer,
                            filename
                        )
                        result.wrapped = observed.wrapped
                        result.directives = observed.directives
                        result.aliased = observed.aliased
                    }
                    if (options.flow) {
                        result.flows = transformFlows(api.types, program).flows
                    }
                    const metadata = state.file.metadata as Record<string, unknown>
                    metadata.mobxReactPlugin = result
                }
            }
        }
    }
}

namespace mobxReactPlugin {
    export type Options = import("./options").Options
    export type ObserverOptions = import("./options").ObserverOptions
    export type FilterPattern = import("./options").FilterPattern
    export interface TransformResult {
        /** Names of the components that were wrapped in `observer`. */
        wrapped: string[]
        /** Names of the components and hooks that received the `"use no memo"` directive. */
        directives: string[]
        /** Already observed components whose recursive self references were redirected (mobxjs/mobx#3836). */
        aliased: string[]
        /** `Class.method` names of the async functions that were turned into flows. */
        flows: string[]
    }
}

export = mobxReactPlugin
