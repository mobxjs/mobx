import {
    EMPTY_OBJECT,
    IEqualsComparer,
    IReactionDisposer,
    IReactionPublic,
    Lambda,
    Reaction,
    action,
    comparer,
    getNextId,
    isAction,
    isFunction,
    isPlainObject,
    die,
    allowStateChanges
} from "../internal"

export interface IAutorunOptions {
    delay?: number
    name?: string
    /**
     * Experimental.
     * Warns if the view doesn't track observables
     */
    requiresObservable?: boolean
    scheduler?: (callback: () => void) => any
    onError?: (error: any) => void
}

/**
 * Creates a named reactive view and keeps it alive, so that the view is always
 * updated if one of the dependencies changes, even when the view is not further used by something else.
 * @param view The reactive view
 * @returns disposer function, which can be used to stop the view from being updated in the future.
 */
export function autorun(
    view: (r: IReactionPublic) => any,
    opts: IAutorunOptions = EMPTY_OBJECT
): IReactionDisposer {
    if (__DEV__) {
        if (!isFunction(view)) die("Autorun expects a function as first argument")
        if (isAction(view)) die("Autorun does not accept actions since actions are untrackable")
    }

    const name: string = (opts && opts.name) || (view as any).name || "Autorun@" + getNextId()
    const runSync = !opts.scheduler && !opts.delay
    let reaction: Reaction

    if (runSync) {
        // normal autorun
        reaction = new Reaction(
            name,
            function (this: Reaction) {
                this.track(reactionRunner)
            },
            opts.onError,
            opts.requiresObservable
        )
    } else {
        const scheduler = createSchedulerFromOptions(opts)
        // debounced autorun
        let isScheduled = false

        reaction = new Reaction(
            name,
            () => {
                if (!isScheduled) {
                    isScheduled = true
                    scheduler(() => {
                        isScheduled = false
                        if (!reaction.isDisposed_) reaction.track(reactionRunner)
                    })
                }
            },
            opts.onError,
            opts.requiresObservable
        )
    }

    function reactionRunner() {
        view(reaction)
    }

    reaction.schedule_()
    return reaction.getDisposer_()
}

export type IReactionOptions = IAutorunOptions & {
    fireImmediately?: boolean
    equals?: IEqualsComparer<any>
}

const run = (f: Lambda) => f()

function createSchedulerFromOptions(opts: IReactionOptions) {
    return opts.scheduler
        ? opts.scheduler
        : opts.delay
        ? (f: Lambda) => setTimeout(f, opts.delay!)
        : run
}

export function reaction<T>(
    expression: (r: IReactionPublic) => T,
    effect: (arg: T, prev: T, r: IReactionPublic) => void,
    opts: IReactionOptions = EMPTY_OBJECT
): IReactionDisposer {
    if (__DEV__) {
        if (!isFunction(expression) || !isFunction(effect))
            die("First and second argument to reaction should be functions")
        if (!isPlainObject(opts)) die("Third argument of reactions should be an object")
    }
    const name = opts.name || "Reaction@" + getNextId()
    const effectAction = action(
        name,
        opts.onError ? wrapErrorHandler(opts.onError, effect) : effect
    )
    const runSync = !opts.scheduler && !opts.delay
    const scheduler = createSchedulerFromOptions(opts)

    let firstTime = true
    let isScheduled = false
    let value: T
    let oldValue: T = undefined as any // only an issue with fireImmediately

    const equals = (opts as any).compareStructural
        ? comparer.structural
        : opts.equals || comparer.default

    const r = new Reaction(
        name,
        () => {
            if (firstTime || runSync) {
                reactionRunner()
            } else if (!isScheduled) {
                isScheduled = true
                scheduler!(reactionRunner)
            }
        },
        opts.onError,
        opts.requiresObservable
    )

    function reactionRunner() {
        isScheduled = false
        if (r.isDisposed_) return
        let changed: boolean = false
        r.track(() => {
            const nextValue = allowStateChanges(false, () => expression(r))
            changed = firstTime || !equals(value, nextValue)
            oldValue = value
            value = nextValue
        })
        if (firstTime && opts.fireImmediately!) effectAction(value, oldValue, r)
        else if (!firstTime && changed) effectAction(value, oldValue, r)
        firstTime = false
    }

    r.schedule_()
    return r.getDisposer_()
}

function wrapErrorHandler(errorHandler, baseFn) {
    return function () {
        try {
            return baseFn.apply(this, arguments)
        } catch (e) {
            errorHandler.call(this, e)
        }
    }
}
