import { globalState, isolateGlobalState } from "../core/globalstate"
import { setReactionScheduler } from "../core/reaction"

export function configure(options: {
    enforceActions?: boolean | "strict"
    computedRequiresReaction?: boolean
    isolateGlobalState?: boolean
    disableErrorBoundaries?: boolean
    reactionScheduler?: (f: () => void) => void
}): void {
    const {
        enforceActions,
        computedRequiresReaction,
        disableErrorBoundaries,
        reactionScheduler
    } = options
    if (enforceActions !== undefined) {
        if (typeof enforceActions !== "boolean" && enforceActions !== "strict")
            return fail(`Invalid configuration for 'enforceActions': ${enforceActions}`)
        globalState.enforceActions = enforceActions
        globalState.allowStateChanges =
            enforceActions === true || enforceActions === "strict" ? false : true
    }
    if (computedRequiresReaction !== undefined) {
        globalState.computedRequiresReaction = !!computedRequiresReaction
    }
    if (options.isolateGlobalState === true) {
        isolateGlobalState()
    }
    if (disableErrorBoundaries !== undefined) {
        if (disableErrorBoundaries === true)
            console.warn(
                "WARNING: Debug feature only. MobX will NOT recover from errors if this is on."
            )
        globalState.disableErrorBoundaries = !!disableErrorBoundaries
    }
    if (reactionScheduler) {
        setReactionScheduler(reactionScheduler)
    }
}
