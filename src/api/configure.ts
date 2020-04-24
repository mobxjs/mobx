import {
    globalState,
    isolateGlobalState,
    setReactionScheduler,
    fail,
    deprecated,
    assertES5
} from "../internal"

export function configure(options: {
    enforceActions?: boolean | "strict" | "never" | "always" | "observed"
    computedRequiresReaction?: boolean
    /**
     * Warn if you try to create to derivation / reactive context without accessing any observable.
     */
    reactionRequiresObservable?: boolean
    /**
     * Warn if observables are accessed outside a reactive context
     */
    observableRequiresReaction?: boolean
    computedConfigurable?: boolean
    isolateGlobalState?: boolean
    disableErrorBoundaries?: boolean
    reactionScheduler?: (f: () => void) => void
    useProxies?: "always" | "never" | "ifavailable"
}): void {
    const {
        enforceActions,
        computedRequiresReaction,
        computedConfigurable,
        disableErrorBoundaries,
        reactionScheduler,
        reactionRequiresObservable,
        observableRequiresReaction,
        useProxies
    } = options
    if (options.isolateGlobalState === true) {
        isolateGlobalState()
    }
    if (useProxies !== undefined) {
        if (useProxies !== "always") {
            assertES5()
        }
        globalState.useProxies =
            useProxies === "always"
                ? true
                : useProxies === "never"
                ? false
                : typeof Proxy !== "undefined"
    }
    if (enforceActions !== undefined) {
        let ea
        switch (enforceActions) {
            case "observed":
                ea = true
                break
            case "never":
                ea = false
                break
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
