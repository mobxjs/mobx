import {
    IDerivation,
    IDerivationState,
    trackDerivedFunction,
    clearObserving,
    shouldCompute,
    isCaughtException,
    TraceMode
} from "./derivation"
import { IObservable, startBatch, endBatch } from "./observable"
import { globalState } from "./globalstate"
import {
    createInstanceofPredicate,
    getNextId,
    invariant,
    unique,
    joinStrings
} from "../utils/utils"
import { isSpyEnabled, spyReport, spyReportStart, spyReportEnd } from "./spy"
import { getMessage } from "../utils/messages"
import { trace } from "../api/whyrun"

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
    onError(handler: (error: any, derivation: IDerivation) => void)
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
    errorHandler: (error: any, derivation: IDerivation) => void

    constructor(
        public name: string = "Reaction@" + getNextId(),
        private onInvalidate: () => void
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

                this.onInvalidate()
                if (this._isTrackPending && isSpyEnabled()) {
                    // onInvalidate didn't trigger track right away..
                    spyReport({
                        object: this,
                        type: "scheduled-reaction"
                    })
                }
            }
            endBatch()
        }
    }

    track(fn: () => void) {
        startBatch()
        const notify = isSpyEnabled()
        let startTime
        if (notify) {
            startTime = Date.now()
            spyReportStart({
                object: this,
                type: "reaction",
                fn
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
        if (notify) {
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

        const message = `[mobx] Encountered an uncaught exception that was thrown by a reaction or observer component, in: '${this}`
        const messageToUser = getMessage("m037")

        console.error(
            message || messageToUser /* latter will not be true, make sure uglify doesn't remove */,
            error
        )
        /** If debugging brought you here, please, read the above message :-). Tnx! */

        if (isSpyEnabled()) {
            spyReport({
                type: "error",
                message,
                error,
                object: this
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
        const r = this.dispose.bind(this)
        r.$mobx = this
        r.onError = registerErrorHandler
        return r
    }

    toString() {
        return `Reaction[${this.name}]`
    }

    whyRun() {
        const observing = unique(this._isRunning ? this.newObserving : this.observing).map(
            dep => dep.name
        )

        return `
WhyRun? reaction '${this.name}':
 * Status: [${this.isDisposed
     ? "stopped"
     : this._isRunning ? "running" : this.isScheduled() ? "scheduled" : "idle"}]
 * This reaction will re-run if any of the following observables changes:
    ${joinStrings(observing)}
    ${this._isRunning
        ? " (... or any observable accessed during the remainder of the current run)"
        : ""}
	${getMessage("m038")}
`
    }

    trace(enterBreakPoint: boolean = false) {
        trace(this, enterBreakPoint)
    }
}

function registerErrorHandler(handler) {
    invariant(this && this.$mobx && isReaction(this.$mobx), "Invalid `this`")
    invariant(!this.$mobx.errorHandler, "Only one onErrorHandler can be registered")
    this.$mobx.errorHandler = handler
}

export function onReactionError(
    handler: (error: any, derivation: IDerivation) => void
): () => void {
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
