import { globalState, isolateGlobalState } from "../core/globalstate"

export function configure(options: {
    enforceActions?: boolean
    warnOnUnsafeComputationReads?: boolean
    isolateGlobalState?: boolean
}): void {
    if (options.enforceActions !== undefined) {
        globalState.enforceActions = !!options.enforceActions
        globalState.allowStateChanges = !options.enforceActions
    }
    if (options.warnOnUnsafeComputationReads) {
        globalState.warnOnUnsafeComputationReads = !!options.warnOnUnsafeComputationReads
    }
    if (options.isolateGlobalState === true) {
        isolateGlobalState()
    }
}
