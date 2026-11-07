import type { NodePath, PluginObj, PluginPass, types as t } from "@babel/core"
import { transformFlows } from "./flow"
import type { NormalizedOptions, Options } from "./options"
import { normalizeOptions, shouldProcessFile } from "./options"
import { neededTransforms } from "./precheck"
import type { TransformResult as ObserverResult } from "./transform"
import { transformProgram } from "./transform"

export interface BabelApi {
    types: typeof t
    assertVersion(range: string | number): void
}

export interface TransformResult extends ObserverResult {
    flows: string[]
}

export type BabelPlugin = (api: BabelApi, rawOptions?: Options) => PluginObj<PluginPass>

export function createBabelPlugin(standalone: boolean): BabelPlugin {
    return function mobxReactPlugin(api, rawOptions) {
        api.assertVersion("^7.0.0 || ^8.0.0-0")
        const options = normalizeOptions(rawOptions)
        return {
            name: "mobx-react-plugin",
            visitor: {
                Program: {
                    enter(program, state) {
                        const result = transformFile(api.types, program, state, options, standalone)
                        const metadata = state.file.metadata as Record<string, unknown>
                        metadata.mobxReactPlugin = result
                        if (standalone) {
                            program.skip()
                        }
                    }
                }
            }
        }
    }
}

export function hasChanges(metadata: object | undefined): boolean {
    const result = (metadata as { mobxReactPlugin?: TransformResult } | undefined)?.mobxReactPlugin
    return result !== undefined && Object.values(result).some(list => list.length > 0)
}

function transformFile(
    types: typeof t,
    program: NodePath<t.Program>,
    state: PluginPass,
    options: NormalizedOptions,
    standalone: boolean
): TransformResult {
    const result: TransformResult = { wrapped: [], directives: [], aliased: [], flows: [] }
    const filename = state.filename
    if (!shouldProcessFile(filename, state.file.opts.root ?? state.cwd, options)) {
        return result
    }
    const needed = neededTransforms(state.file.code, filename, options)
    if (needed.observer) {
        Object.assign(result, transformProgram(types, program, needed.observer, filename))
    }
    if (needed.flow) {
        result.flows = transformFlows(types, program).flows
    }
    const bindingsChanged =
        result.wrapped.length > 0 || result.aliased.length > 0 || result.flows.length > 0
    if (bindingsChanged && !standalone) {
        program.scope.crawl()
    }
    return result
}
