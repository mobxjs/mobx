import {
    globalState,
    isolateGlobalState,
    setReactionScheduler,
    fail,
    deprecated
} from "../internal"

export function configure(options: {
    enforceActions?: boolean | "strict" | "never" | "always" | "observed"
    computedRequiresReaction?: boolean
    /**
     * (Experimental)
     * Warn if you try to create to derivation / reactive context without accessing any observable.
     */
    reactionRequiresObservable?: boolean
    /**
     * (Experimental)
     * Warn if observables are accessed outside a reactive context
     */
    observableRequiresReaction?: boolean
    computedConfigurable?: boolean
    isolateGlobalState?: boolean
    disableErrorBoundaries?: boolean
    reactionScheduler?: (f: () => void) => void
}): void {
    const {
        enforceActions,
        computedRequiresReaction,
        computedConfigurable,
        disableErrorBoundaries,
        reactionScheduler,
        reactionRequiresObservable,
        observableRequiresReaction
    } = options
    if (options.isolateGlobalState === true) {
        isolateGlobalState()
    }
    if (enforceActions !== undefined) {
        if (typeof enforceActions === "boolean" || enforceActions === "strict")
            deprecated(
                `Deprecated value for 'enforceActions', use 'false' => '"never"', 'true' => '"observed"', '"strict"' => "'always'" instead`
            )
        let ea
        switch (enforceActions) {
            case true:
            case "observed":
                ea = true
                break
            case false:
            case "never":
                ea = false
                break
            case "strict":
            case "always":
                ea = "strict"
                break
            default:
                fail(
                    `Invalid value for 'enforceActions': '${enforceActions}', expected 'never', 'always' or 'observed'`
                )
        }
        globalState.enforceActions = ea
        globalState.allowStateChanges = ea === true || ea === "strict" ? false : true
    }
    if (computedRequiresReaction !== undefined) {
        globalState.computedRequiresReaction = !!computedRequiresReaction
    }
    if (reactionRequiresObservable !== undefined) {
        globalState.reactionRequiresObservable = !!reactionRequiresObservable
    }
    if (observableRequiresReaction !== undefined) {
        globalState.observableRequiresReaction = !!observableRequiresReaction

        globalState.allowStateReads = !globalState.observableRequiresReaction
    }
    if (computedConfigurable !== undefined) {
        globalState.computedConfigurable = !!computedConfigurable
    }
    if (disableErrorBoundaries !== undefined) {
        if (disableErrorBoundaries === true)
            console.warn(
                "WARNING: Debug feature only. MobX will NOT recover from errors when `disableErrorBoundaries` is enabled."
            )
        globalState.disableErrorBoundaries = !!disableErrorBoundaries
    }
    if (reactionScheduler) {
        setReactionScheduler(reactionScheduler)
    }
}
