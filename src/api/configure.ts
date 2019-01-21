import {
    globalState,
    fail,
    isolateGlobalState,
    deprecated,
    reserveArrayBuffer,
    setReactionScheduler
} from "../internal"

export function configure(options: {
    enforceActions?: boolean | "strict" | "never" | "always" | "observed"
    computedRequiresReaction?: boolean
    isolateGlobalState?: boolean
    disableErrorBoundaries?: boolean
    arrayBuffer?: number
    reactionScheduler?: (f: () => void) => void
}): void {
    const {
        enforceActions,
        computedRequiresReaction,
        disableErrorBoundaries,
        arrayBuffer,
        reactionScheduler
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
    if (disableErrorBoundaries !== undefined) {
        if (disableErrorBoundaries === true)
            console.warn(
                "WARNING: Debug feature only. MobX will NOT recover from errors if this is on."
            )
        globalState.disableErrorBoundaries = !!disableErrorBoundaries
    }
    if (typeof arrayBuffer === "number") {
        reserveArrayBuffer(arrayBuffer)
    }
    if (reactionScheduler) {
        setReactionScheduler(reactionScheduler)
    }
}
