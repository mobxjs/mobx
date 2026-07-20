import { globalState, isolateGlobalState, setReactionScheduler } from "../internal"

const ALWAYS = "always"
const OBSERVED = "observed"

export function configure(options: {
    enforceActions?: "never" | "always" | "observed"
    computedRequiresReaction?: boolean
    /**
     * Warn if you try to create to derivation / reactive context without accessing any observable.
     */
    reactionRequiresObservable?: boolean
    /**
     * Warn if observables are accessed outside a reactive context
     */
    observableRequiresReaction?: boolean
    isolateGlobalState?: boolean
    disableErrorBoundaries?: boolean
    safeDescriptors?: boolean
    reactionScheduler?: (f: () => void) => void
}): void {
    if (options.isolateGlobalState === true) {
        isolateGlobalState()
    }
    const { enforceActions } = options
    if (enforceActions !== undefined) {
        const ea = enforceActions === ALWAYS ? ALWAYS : enforceActions === OBSERVED
        globalState.enforceActions = ea
        globalState.allowStateChanges = ea === true || ea === ALWAYS ? false : true
    }
    ;[
        "computedRequiresReaction",
        "reactionRequiresObservable",
        "observableRequiresReaction",
        "disableErrorBoundaries",
        "safeDescriptors"
    ].forEach(key => {
        if (key in options) {
            globalState[key] = !!options[key]
        }
    })
    globalState.allowStateReads = !globalState.observableRequiresReaction
    if (__DEV__ && globalState.disableErrorBoundaries === true) {
        console.warn(
            "WARNING: Debug feature only. MobX will NOT recover from errors when `disableErrorBoundaries` is enabled."
        )
    }
    if (options.reactionScheduler) {
        setReactionScheduler(options.reactionScheduler)
    }
}
