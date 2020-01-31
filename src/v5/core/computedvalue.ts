import {
    CaughtException,
    IDerivation,
    IDerivationState,
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
    fail,
    getNextId,
    globalState,
    invariant,
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
    untrackedStart
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
    dependenciesState = IDerivationState.NOT_TRACKING
    observing: IObservable[] = [] // nodes we are looking at. Our value depends on these nodes
    newObserving = null // during tracking it's an array with new observed observers
    isBeingObserved = false
    isPendingUnobservation: boolean = false
    observers = new Set<IDerivation>()
    diffValue = 0
    runId = 0
    lastAccessedBy = 0
    lowestObserverState = IDerivationState.UP_TO_DATE
    unboundDepsCount = 0
    __mapid = "#" + getNextId()
    protected value: T | undefined | CaughtException = new CaughtException(null)
    name: string
    triggeredBy?: string
    isComputing: boolean = false // to check for cycles
    isRunningSetter: boolean = false
    derivation: () => T
    setter?: (value: T) => void
    isTracing: TraceMode = TraceMode.NONE
    public scope: Object | undefined
    private equals: IEqualsComparer<any>
    private requiresReaction: boolean
    private keepAlive: boolean

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
        invariant(options.get, "missing option for computed: get")
        this.derivation = options.get!
        this.name = options.name || "ComputedValue@" + getNextId()
        if (options.set) this.setter = createAction(this.name + "-setter", options.set) as any
        this.equals =
            options.equals ||
            ((options as any).compareStructural || (options as any).struct
                ? comparer.structural
                : comparer.default)
        this.scope = options.context
        this.requiresReaction = !!options.requiresReaction
        this.keepAlive = !!options.keepAlive
    }

    onBecomeStale() {
        propagateMaybeChanged(this)
    }

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
        if (this.isComputing) fail(`Cycle detected in computation ${this.name}: ${this.derivation}`)
        if (globalState.inBatch === 0 && this.observers.size === 0 && !this.keepAlive) {
            if (shouldCompute(this)) {
                this.warnAboutUntrackedRead()
                startBatch() // See perf test 'computed memoization'
                this.value = this.computeValue(false)
                endBatch()
            }
        } else {
            reportObserved(this)
            if (shouldCompute(this)) if (this.trackAndCompute()) propagateChangeConfirmed(this)
        }
        const result = this.value!

        if (isCaughtException(result)) throw result.cause
        return result
    }

    public peek(): T {
        const res = this.computeValue(false)
        if (isCaughtException(res)) throw res.cause
        return res
    }

    public set(value: T) {
        if (this.setter) {
            invariant(
                !this.isRunningSetter,
                `The setter of computed value '${
                    this.name
                }' is trying to update itself. Did you intend to update an _observable_ value, instead of the computed property?`
            )
            this.isRunningSetter = true
            try {
                this.setter.call(this.scope, value)
            } finally {
                this.isRunningSetter = false
            }
        } else
            invariant(
                false,
                process.env.NODE_ENV !== "production" &&
                    `[ComputedValue '${
                        this.name
                    }'] It is not possible to assign a new value to a computed value.`
            )
    }

    private trackAndCompute(): boolean {
        if (isSpyEnabled() && process.env.NODE_ENV !== "production") {
            spyReport({
                object: this.scope,
                type: "compute",
                name: this.name
            })
        }
        const oldValue = this.value
        const wasSuspended =
            /* see #1208 */ this.dependenciesState === IDerivationState.NOT_TRACKING
        const newValue = this.computeValue(true)

        const changed =
            wasSuspended ||
            isCaughtException(oldValue) ||
            isCaughtException(newValue) ||
            !this.equals(oldValue, newValue)

        if (changed) {
            this.value = newValue
        }

        return changed
    }

    computeValue(track: boolean) {
        this.isComputing = true
        globalState.computationDepth++
        let res: T | CaughtException
        if (track) {
            res = trackDerivedFunction(this, this.derivation, this.scope)
        } else {
            if (globalState.disableErrorBoundaries === true) {
                res = this.derivation.call(this.scope)
            } else {
                try {
                    res = this.derivation.call(this.scope)
                } catch (e) {
                    res = new CaughtException(e)
                }
            }
        }
        globalState.computationDepth--
        this.isComputing = false
        return res
    }

    suspend() {
        if (!this.keepAlive) {
            clearObserving(this)
            this.value = undefined // don't hold on to computed value!
        }
    }

    observe(listener: (change: IValueDidChange<T>) => void, fireImmediately?: boolean): Lambda {
        let firstTime = true
        let prevValue: T | undefined = undefined
        return autorun(() => {
            let newValue = this.get()
            if (!firstTime || fireImmediately) {
                const prevU = untrackedStart()
                listener({
                    type: "update",
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

    warnAboutUntrackedRead() {
        if (process.env.NODE_ENV === "production") return
        if (this.requiresReaction === true) {
            fail(`[mobx] Computed value ${this.name} is read outside a reactive context`)
        }
        if (this.isTracing !== TraceMode.NONE) {
            console.log(
                `[mobx.trace] '${
                    this.name
                }' is being read outside a reactive context. Doing a full recompute`
            )
        }
        if (globalState.computedRequiresReaction) {
            console.warn(
                `[mobx] Computed value ${
                    this.name
                } is being read outside a reactive context. Doing a full recompute`
            )
        }
    }

    toJSON() {
        return this.get()
    }

    toString() {
        return `${this.name}[${this.derivation.toString()}]`
    }

    valueOf(): T {
        return toPrimitive(this.get())
    }

    [Symbol.toPrimitive]() {
        return this.valueOf()
    }
}

export const isComputedValue = createInstanceofPredicate("ComputedValue", ComputedValue)
