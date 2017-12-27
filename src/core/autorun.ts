import { Lambda, invariant, fail, EMPTY_OBJECT } from "./utils"
import { isModifierDescriptor } from "../types/modifiers"
import { Reaction, IReactionPublic, IReactionDisposer } from "../core/reaction"
import { untrackedStart, untrackedEnd } from "../core/derivation"
import { isAction, runInAction, createAction } from "./action"
import { IEqualsComparer, comparer } from "./comparer"
import { getMessage } from "../utils/messages"
import { MobxState } from "./mobxstate";

/**
 * Creates a named reactive view and keeps it alive, so that the view is always
 * updated if one of the dependencies changes, even when the view is not further used by something else.
 * @param name The view name
 * @param view The reactive view
 * @returns disposer function, which can be used to stop the view from being updated in the future.
 */
export function autorun(
    context: MobxState,
    name: string =  "Autorun@" + (context.nextId()),
    view: (r: IReactionPublic) => any,
): IReactionDisposer {
    invariant(typeof view === "function", getMessage("m004"))
    invariant(isAction(view) === false, getMessage("m005"))

    const reaction = new Reaction(context, name, function() {
        this.track(reactionRunner)
    })

    function reactionRunner() {
        view(reaction)
    }

    reaction.schedule()

    return reaction.getDisposer()
}

/**
 * Similar to 'observer', observes the given predicate until it returns true.
 * Once it returns true, the 'effect' function is invoked an the observation is cancelled.
 * @param name
 * @param predicate
 * @param effect
 * @returns disposer function to prematurely end the observer.
 */
export function when(
    context: MobxState,
    name: string,
    predicate: () => boolean,
    effect: Lambda,
): IReactionDisposer {
    return autorun(context, name, r => {
        if (predicate()) {
            r.dispose()
            const prevUntracked = untrackedStart(context)
            effect();
            untrackedEnd(context, prevUntracked)
        }
    })
}

export function autorunAsync(
    context: MobxState,
    name: string,
    func: (r: IReactionPublic) => any,
    delay?: number,
): IReactionDisposer {
    invariant(isAction(func) === false, getMessage("m006"))
    if (delay === void 0) delay = 1

    let isScheduled = false

    const r = new Reaction(context, name, () => {
        if (!isScheduled) {
            isScheduled = true
            setTimeout(() => {
                isScheduled = false
                if (!r.isDisposed) r.track(reactionRunner)
            }, delay)
        }
    })

    function reactionRunner() {
        func(r)
    }

    r.schedule()
    return r.getDisposer()
}

export interface IReactionOptions {
    fireImmediately?: boolean
    delay?: number
    compareStructural?: boolean // TODO: remove in 4.0 in favor of equals
    /** alias for compareStructural */
    struct?: boolean // TODO: remove in 4.0 in favor of equals
    equals?: IEqualsComparer<any>
    name?: string
}

/**
 *
 * Basically sugar for computed(expr).observe(action(effect))
 * or
 * autorun(() => action(effect)(expr));
 */
export function reaction<T>(
    context: MobxState,
    expression: (r: IReactionPublic) => T,
    effect: (arg: T, r: IReactionPublic) => void,
    opts: IReactionOptions = EMPTY_OBJECT
): IReactionDisposer {
    if (opts.struct || opts.compareStructural) {
        fail(getMessage("m039"))
    }
    if (arguments.length > 4) {
        fail(getMessage("m007"))
    }
    if (isModifierDescriptor(expression)) {
        fail(getMessage("m008"))
    }

    const name = opts.name || "Reaction@" + (context.nextId())
    const fireImmediately = opts.fireImmediately === true
    const delay = opts.delay || 0

    // TODO: creates ugly spy events, use `effect = (r) => runInAction(opts.name, () => effect(r))` instead
    const effectAction = createAction(context, name!, effect)

    let firstTime = true
    let isScheduled = false
    let value: T

    const equals = opts.equals || comparer.default

    const r = new Reaction(context, name, () => {
        if (firstTime || (delay) < 1) {
            reactionRunner()
        } else if (!isScheduled) {
            isScheduled = true
            setTimeout(() => {
                isScheduled = false
                reactionRunner()
            }, delay)
        }
    })

    function reactionRunner() {
        if (r.isDisposed) return
        let changed = false
        r.track(() => {
            const nextValue = expression(r)
            changed = firstTime || !equals(value, nextValue)
            value = nextValue
        })
        if (firstTime && opts.fireImmediately!) effect(value, r)
        if (!firstTime && (changed as boolean) === true) effect(value, r)
        if (firstTime) firstTime = false
    }

    r.schedule()
    return r.getDisposer()
}
