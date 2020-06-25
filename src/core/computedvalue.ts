import {
    CaughtException,
    IDerivation,
    IDerivationState_,
    IEqualsComparer,
    IObservable,
    IValueDidChange,
    Lambda,
    TraceMode,
    autorun,
    clearObserving,
    comparer,
    createAction,
    createInstanceofPredicate,
    endBatch,
    getNextId,
    globalState,
    isCaughtException,
    isSpyEnabled,
    propagateChangeConfirmed,
    propagateMaybeChanged,
    reportObserved,
    shouldCompute,
    spyReport,
    startBatch,
    toPrimitive,
    trackDerivedFunction,
    untrackedEnd,
    untrackedStart,
    UPDATE,
    die,
    allowStateChangesStart,
    allowStateChangesEnd
} from "../internal"

export interface IComputedValue<T> {
    get(): T
    set(value: T): void
    observe(listener: (change: IValueDidChange<T>) => void, fireImmediately?: boolean): Lambda
}

export interface IComputedValueOptions<T> {
    get?: () => T
    set?: (value: T) => void
    name?: string
    equals?: IEqualsComparer<T>
    context?: any
    requiresReaction?: boolean
    keepAlive?: boolean
}

const COMPUTE = "compute"

/**
 * A node in the state dependency root that observes other nodes, and can be observed itself.
 *
 * ComputedValue will remember the result of the computation for the duration of the batch, or
 * while being observed.
 *
 * During this time it will recompute only when one of its direct dependencies changed,
 * but only when it is being accessed with `ComputedValue.get()`.
 *
 * Implementation description:
 * 1. First time it's being accessed it will compute and remember result
 *    give back remembered result until 2. happens
 * 2. First time any deep dependency change, propagate POSSIBLY_STALE to all observers, wait for 3.
 * 3. When it's being accessed, recompute if any shallow dependency changed.
 *    if result changed: propagate STALE to all observers, that were POSSIBLY_STALE from the last step.
 *    go to step 2. either way
 *
 * If at any point it's outside batch and it isn't observed: reset everything and go to 1.
 */
export class ComputedValue<T> implements IObservable, IComputedValue<T>, IDerivation {
    dependenciesState_ = IDerivationState_.NOT_TRACKING_
    observing_: IObservable[] = [] // nodes we are looking at. Our value depends on these nodes
    newObserving_ = null // during tracking it's an array with new observed observers
    isBeingObserved_ = false
    isPendingUnobservation_: boolean = false
    observers_ = new Set<IDerivation>()
    diffValue_ = 0
    runId_ = 0
    lastAccessedBy_ = 0
    lowestObserverState_ = IDerivationState_.UP_TO_DATE_
    unboundDepsCount_ = 0
    mapid_ = "#" + getNextId()
    protected value_: T | undefined | CaughtException = new CaughtException(null)
    name_: string
    triggeredBy_?: string
    isComputing_: boolean = false // to check for cycles
    isRunningSetter_: boolean = false
    derivation_: () => T
    setter_?: (value: T) => void
    isTracing_: TraceMode = TraceMode.NONE
    scope_: Object | undefined
    private equals_: IEqualsComparer<any>
    private requiresReaction_: boolean
    private keepAlive_: boolean

    /**
     * Create a new computed value based on a function expression.
     *
     * The `name` property is for debug purposes only.
     *
     * The `equals` property specifies the comparer function to use to determine if a newly produced
     * value differs from the previous value. Two comparers are provided in the library; `defaultComparer`
     * compares based on identity comparison (===), and `structualComparer` deeply compares the structure.
     * Structural comparison can be convenient if you always produce a new aggregated object and
     * don't want to notify observers if it is structurally the same.
     * This is useful for working with vectors, mouse coordinates etc.
     */
    constructor(options: IComputedValueOptions<T>) {
        if (!options.get) die(31)
        this.derivation_ = options.get!
        this.name_ = options.name || "ComputedValue@" + getNextId()
        if (options.set) this.setter_ = createAction(this.name_ + "-setter", options.set) as any
        this.equals_ =
            options.equals ||
            ((options as any).compareStructural || (options as any).struct
                ? comparer.structural
                : comparer.default)
        this.scope_ = options.context
        this.requiresReaction_ = !!options.requiresReaction
        this.keepAlive_ = !!options.keepAlive
    }

    onBecomeStale_() {
        propagateMaybeChanged(this)
    }

    // TODO: rename?
    public onBecomeObservedListeners: Set<Lambda> | undefined
    public onBecomeUnobservedListeners: Set<Lambda> | undefined

    public onBecomeObserved() {
        if (this.onBecomeObservedListeners) {
            this.onBecomeObservedListeners.forEach(listener => listener())
        }
    }

    public onBecomeUnobserved() {
        if (this.onBecomeUnobservedListeners) {
            this.onBecomeUnobservedListeners.forEach(listener => listener())
        }
    }

    /**
     * Returns the current value of this computed value.
     * Will evaluate its computation first if needed.
     */
    public get(): T {
        if (this.isComputing_) die(32, this.name_, this.derivation_)
        if (globalState.inBatch === 0 && this.observers_.size === 0 && !this.keepAlive_) {
            if (shouldCompute(this)) {
                this.warnAboutUntrackedRead_()
                startBatch() // See perf test 'computed memoization'
                this.value_ = this.computeValue_(false)
                endBatch()
            }
        } else {
            reportObserved(this)
            if (shouldCompute(this)) if (this.trackAndCompute_()) propagateChangeConfirmed(this)
        }
        const result = this.value_!

        if (isCaughtException(result)) throw result.cause
        return result
    }

    // TODO: kill?
    public peek(): T {
        const res = this.computeValue_(false)
        if (isCaughtException(res)) throw res.cause
        return res
    }

    public set(value: T) {
        if (this.setter_) {
            if (this.isRunningSetter_) die(33, this.name_)
            this.isRunningSetter_ = true
            try {
                this.setter_.call(this.scope_, value)
            } finally {
                this.isRunningSetter_ = false
            }
        } else die(34, this.name_)
    }

    private trackAndCompute_(): boolean {
        if (__DEV__ && isSpyEnabled()) {
            spyReport({
                object: this.scope_,
                type: COMPUTE,
                name: this.name_
            })
        }
        const oldValue = this.value_
        const wasSuspended =
            /* see #1208 */ this.dependenciesState_ === IDerivationState_.NOT_TRACKING_
        const newValue = this.computeValue_(true)

        const changed =
            wasSuspended ||
            isCaughtException(oldValue) ||
            isCaughtException(newValue) ||
            !this.equals_(oldValue, newValue)

        if (changed) {
            this.value_ = newValue
        }

        return changed
    }

    computeValue_(track: boolean) {
        this.isComputing_ = true
        // don't allow state changes during computation
        const prev = allowStateChangesStart(false)
        let res: T | CaughtException
        if (track) {
            res = trackDerivedFunction(this, this.derivation_, this.scope_)
        } else {
            if (globalState.disableErrorBoundaries === true) {
                res = this.derivation_.call(this.scope_)
            } else {
                try {
                    res = this.derivation_.call(this.scope_)
                } catch (e) {
                    res = new CaughtException(e)
                }
            }
        }
        allowStateChangesEnd(prev)
        this.isComputing_ = false
        return res
    }

    suspend_() {
        if (!this.keepAlive_) {
            clearObserving(this)
            this.value_ = undefined // don't hold on to computed value!
        }
    }

    // TODO: rename
    observe(listener: (change: IValueDidChange<T>) => void, fireImmediately?: boolean): Lambda {
        let firstTime = true
        let prevValue: T | undefined = undefined
        return autorun(() => {
            let newValue = this.get()
            if (!firstTime || fireImmediately) {
                const prevU = untrackedStart()
                listener({
                    type: UPDATE,
                    object: this,
                    newValue,
                    oldValue: prevValue
                })
                untrackedEnd(prevU)
            }
            firstTime = false
            prevValue = newValue
        })
    }

    warnAboutUntrackedRead_() {
        if (!__DEV__) return
        if (this.requiresReaction_ === true) {
            die(`[mobx] Computed value ${this.name_} is read outside a reactive context`)
        }
        if (this.isTracing_ !== TraceMode.NONE) {
            console.log(
                `[mobx.trace] '${this.name_}' is being read outside a reactive context. Doing a full recompute`
            )
        }
        if (globalState.computedRequiresReaction) {
            console.warn(
                `[mobx] Computed value ${this.name_} is being read outside a reactive context. Doing a full recompute`
            )
        }
    }

    toString() {
        return `${this.name_}[${this.derivation_.toString()}]`
    }

    valueOf(): T {
        return toPrimitive(this.get())
    }

    [Symbol.toPrimitive]() {
        return this.valueOf()
    }
}

export const isComputedValue = createInstanceofPredicate("ComputedValue", ComputedValue)
