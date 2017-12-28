import { Lambda, invariant, fail, EMPTY_OBJECT } from "./utils"
import { Reaction, IReactionPublic, IReactionDisposer } from "../core/reaction"
import { untrackedStart, untrackedEnd } from "../core/derivation"
import { isAction, runInAction, createAction } from "../core/action"
import { IEqualsComparer, defaultComparer } from "./comparer"
import { getMessage } from "../utils/messages"
import { MobxState } from "../core/mobxstate";

export interface IAutorunOptions {
    delay?: number
    name?: string
}

/**
 * Creates a named reactive view and keeps it alive, so that the view is always
 * updated if one of the dependencies changes, even when the view is not further used by something else.
 * @param view The reactive view
 * @returns disposer function, which can be used to stop the view from being updated in the future.
 */
export function autorun(
    context: MobxState,
    view: (r: IReactionPublic) => any,
    opts?: IAutorunOptions
): IReactionDisposer {
    invariant(typeof view === "function", getMessage("m004"))
    invariant(isAction(view) === false, getMessage("m005"))

    const name: string = (opts && opts.name) || "Autorun@" + (context.nextId())
    const delay = (opts && opts.delay) || 0
    let reaction: Reaction;

    if (delay === 0) {
        // normal autorun
        reaction = new Reaction(context, name, function(this: Reaction) {
            this.track(reactionRunner)
        })
    } else {
        // debounced autorun
        let isScheduled = false

        reaction = new Reaction(context, name, () => {
            if (!isScheduled) {
                isScheduled = true
                setTimeout(() => {
                    isScheduled = false
                    if (!reaction.isDisposed) reaction.track(reactionRunner)
                }, delay)
            }
        })
    }

    function reactionRunner() {
        view(reaction)
    }

    reaction.schedule()
    return reaction.getDisposer()
}

export function when(
    context: MobxState,
    predicate: () => boolean,
    effect: Lambda,
    opts?: { name?: string }
): IReactionDisposer {
    return autorun(context, r => {
        if (predicate()) {
            r.dispose()
            const prevUntracked = untrackedStart(context)
            effect();
            untrackedEnd(context, prevUntracked)
        }
    }, opts)
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

    const name = opts.name || "Reaction@" + (context.nextId())
    const fireImmediately = opts.fireImmediately === true
    const delay = opts.delay || 0

    // TODO: creates ugly spy events, use `effect = (r) => runInAction(opts.name, () => effect(r))` instead
    const effectAction = createAction(context, name!, effect)

    let firstTime = true
    let isScheduled = false
    let value: T

    const equals = opts.equals || defaultComparer

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
