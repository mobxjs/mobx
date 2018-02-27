import { globalState, isolateGlobalState, disableErrorBoundaries } from "../core/globalstate"

export function configure(options: {
    enforceActions?: boolean
    computedRequiresReaction?: boolean
    isolateGlobalState?: boolean
    disableErrorBoundaries?: boolean
}): void {
    if (options.enforceActions !== undefined) {
        globalState.enforceActions = !!options.enforceActions
        globalState.allowStateChanges = !options.enforceActions
    }
    if (options.computedRequiresReaction !== undefined) {
        globalState.computedRequiresReaction = !!options.computedRequiresReaction
    }
    if (options.isolateGlobalState === true) {
        isolateGlobalState()
    }
    if (options.disableErrorBoundaries !== undefined) {
        globalState.disableErrorBoundaries = !!disableErrorBoundaries
    }
}
