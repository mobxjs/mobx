import {
    $mobx,
    IDerivation,
    IDerivationState,
    IObservable,
    Lambda,
    TraceMode,
    clearObserving,
    createInstanceofPredicate,
    endBatch,
    getNextId,
    globalState,
    isCaughtException,
    isSpyEnabled,
    shouldCompute,
    spyReport,
    spyReportEnd,
    spyReportStart,
    startBatch,
    trace,
    trackDerivedFunction
} from "../internal"

/**
 * Reactions are a special kind of derivations. Several things distinguishes them from normal reactive computations
 *
 * 1) They will always run, whether they are used by other computations or not.
 * This means that they are very suitable for triggering side effects like logging, updating the DOM and making network requests.
 * 2) They are not observable themselves
 * 3) They will always run after any 'normal' derivations
 * 4) They are allowed to change the state and thereby triggering themselves again, as long as they make sure the state propagates to a stable state in a reasonable amount of iterations.
 *
 * The state machine of a Reaction is as follows:
 *
 * 1) after creating, the reaction should be started by calling `runReaction` or by scheduling it (see also `autorun`)
 * 2) the `onInvalidate` handler should somehow result in a call to `this.track(someFunction)`
 * 3) all observables accessed in `someFunction` will be observed by this reaction.
 * 4) as soon as some of the dependencies has changed the Reaction will be rescheduled for another run (after the current mutation or transaction). `isScheduled` will yield true once a dependency is stale and during this period
 * 5) `onInvalidate` will be called, and we are back at step 1.
 *
 */

export interface IReactionPublic {
    dispose(): void
    trace(enterBreakPoint?: boolean): void
}

export interface IReactionDisposer {
    (): void
    $mobx: Reaction
}

export class Reaction implements IDerivation, IReactionPublic {
    observing: IObservable[] = [] // nodes we are looking at. Our value depends on these nodes
    newObserving: IObservable[] = []
    dependenciesState = IDerivationState.NOT_TRACKING
    diffValue = 0
    runId = 0
    unboundDepsCount = 0
    __mapid = "#" + getNextId()
    isDisposed = false
    _isScheduled = false
    _isTrackPending = false
    _isRunning = false
    isTracing: TraceMode = TraceMode.NONE

    constructor(
        public name: string = "Reaction@" + getNextId(),
        private onInvalidate: () => void,
        private errorHandler?: (error: any, derivation: IDerivation) => void,
        public requiresObservable = false
    ) {}

    onBecomeStale() {
        this.schedule()
    }

    schedule() {
        if (!this._isScheduled) {
            this._isScheduled = true
            globalState.pendingReactions.push(this)
            runReactions()
        }
    }

    isScheduled() {
        return this._isScheduled
    }

    /**
     * internal, use schedule() if you intend to kick off a reaction
     */
    runReaction() {
        if (!this.isDisposed) {
            startBatch()
            this._isScheduled = false
            if (shouldCompute(this)) {
                this._isTrackPending = true

                try {
                    this.onInvalidate()
                    if (
                        this._isTrackPending &&
                        isSpyEnabled() &&
                        process.env.NODE_ENV !== "production"
                    ) {
                        // onInvalidate didn't trigger track right away..
                        spyReport({
                            name: this.name,
                            type: "scheduled-reaction"
                        })
                    }
                } catch (e) {
                    this.reportExceptionInDerivation(e)
                }
            }
            endBatch()
        }
    }

    track(fn: () => void) {
        if (this.isDisposed) {
            return
            // console.warn("Reaction already disposed") // Note: Not a warning / error in mobx 4 either
        }
        startBatch()
        const notify = isSpyEnabled()
        let startTime
        if (notify && process.env.NODE_ENV !== "production") {
            startTime = Date.now()
            spyReportStart({
                name: this.name,
                type: "reaction"
            })
        }
        this._isRunning = true
        const result = trackDerivedFunction(this, fn, undefined)
        this._isRunning = false
        this._isTrackPending = false
        if (this.isDisposed) {
            // disposed during last run. Clean up everything that was bound after the dispose call.
            clearObserving(this)
        }
        if (isCaughtException(result)) this.reportExceptionInDerivation(result.cause)
        if (notify && process.env.NODE_ENV !== "production") {
            spyReportEnd({
                time: Date.now() - startTime
            })
        }
        endBatch()
    }

    reportExceptionInDerivation(error: any) {
        if (this.errorHandler) {
            this.errorHandler(error, this)
            return
        }

        if (globalState.disableErrorBoundaries) throw error

        const message = `[mobx] Encountered an uncaught exception that was thrown by a reaction or observer component, in: '${this}'`
        if (globalState.suppressReactionErrors) {
            console.warn(`[mobx] (error in reaction '${this.name}' suppressed, fix error of causing action below)`) // prettier-ignore
        } else {
            console.error(message, error)
            /** If debugging brought you here, please, read the above message :-). Tnx! */
        }

        if (isSpyEnabled()) {
            spyReport({
                type: "error",
                name: this.name,
                message,
                error: "" + error
            })
        }

        globalState.globalReactionErrorHandlers.forEach(f => f(error, this))
    }

    dispose() {
        if (!this.isDisposed) {
            this.isDisposed = true
            if (!this._isRunning) {
                // if disposed while running, clean up later. Maybe not optimal, but rare case
                startBatch()
                clearObserving(this)
                endBatch()
            }
        }
    }

    getDisposer(): IReactionDisposer {
        const r = this.dispose.bind(this) as IReactionDisposer
        r[$mobx] = this
        return r
    }

    toString() {
        return `Reaction[${this.name}]`
    }

    trace(enterBreakPoint: boolean = false) {
        trace(this, enterBreakPoint)
    }
}

export function onReactionError(handler: (error: any, derivation: IDerivation) => void): Lambda {
    globalState.globalReactionErrorHandlers.push(handler)
    return () => {
        const idx = globalState.globalReactionErrorHandlers.indexOf(handler)
        if (idx >= 0) globalState.globalReactionErrorHandlers.splice(idx, 1)
    }
}

/**
 * Magic number alert!
 * Defines within how many times a reaction is allowed to re-trigger itself
 * until it is assumed that this is gonna be a never ending loop...
 */
const MAX_REACTION_ITERATIONS = 100

let reactionScheduler: (fn: () => void) => void = f => f()

export function runReactions() {
    // Trampolining, if runReactions are already running, new reactions will be picked up
    if (globalState.inBatch > 0 || globalState.isRunningReactions) return
    reactionScheduler(runReactionsHelper)
}

function runReactionsHelper() {
    globalState.isRunningReactions = true
    const allReactions = globalState.pendingReactions
    let iterations = 0

    // While running reactions, new reactions might be triggered.
    // Hence we work with two variables and check whether
    // we converge to no remaining reactions after a while.
    while (allReactions.length > 0) {
        if (++iterations === MAX_REACTION_ITERATIONS) {
            console.error(
                `Reaction doesn't converge to a stable state after ${MAX_REACTION_ITERATIONS} iterations.` +
                    ` Probably there is a cycle in the reactive function: ${allReactions[0]}`
            )
            allReactions.splice(0) // clear reactions
        }
        let remainingReactions = allReactions.splice(0)
        for (let i = 0, l = remainingReactions.length; i < l; i++)
            remainingReactions[i].runReaction()
    }
    globalState.isRunningReactions = false
}

export const isReaction = createInstanceofPredicate("Reaction", Reaction)

export function setReactionScheduler(fn: (f: () => void) => void) {
    const baseScheduler = reactionScheduler
    reactionScheduler = f => fn(() => baseScheduler(f))
}
