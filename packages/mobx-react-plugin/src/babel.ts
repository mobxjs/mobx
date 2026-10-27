import type { PluginObj, PluginPass, types as t } from "@babel/core"
import { transformFlows } from "./flow"
import { normalizeOptions, shouldProcessFile } from "./options"
import { transformProgram } from "./transform"

interface BabelApi {
    types: typeof t
    assertVersion(range: string | number): void
}

/**
 * Babel merges the visitors of all plugins into one traversal, so all work happens in
 * `Program:enter`: that is the only way to reliably run before React Compiler, which
 * also works there. List this plugin before `babel-plugin-react-compiler`.
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
        wrapped: string[]
        directives: string[]
        /** Already observed components whose recursive self references were redirected (mobxjs/mobx#3836). */
        aliased: string[]
        flows: string[]
    }
}

export = mobxReactPlugin
