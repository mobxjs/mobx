import { Lambda, getNextId, invariant, fail, EMPTY_OBJECT, deprecated } from "../utils/utils"
import { isModifierDescriptor } from "../types/modifiers"
import { Reaction, IReactionPublic, IReactionDisposer } from "../core/reaction"
import { untrackedStart, untrackedEnd } from "../core/derivation"
import { action, isAction, runInAction } from "./action"
import { IEqualsComparer, comparer } from "../types/comparer"

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
    view: (r: IReactionPublic) => any,
    opts?: IAutorunOptions
): IReactionDisposer {
    invariant(typeof view === "function", "Autorun expects a function as first argument")
    invariant(
        isAction(view) === false,
        "Autorun does not accept actions since actions are untrackable"
    )

    const name: string = (opts && opts.name) || (view as any).name || "Autorun@" + getNextId()
    const delay = (opts && opts.delay) || 0
    let reaction: Reaction

    if (delay === 0) {
        // normal autorun
        reaction = new Reaction(name, function(this: Reaction) {
            this.track(reactionRunner)
        })
    } else {
        // debounced autorun
        let isScheduled = false

        reaction = new Reaction(name, () => {
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
    predicate: () => boolean,
    effect: Lambda,
    opts?: { name?: string }
): IReactionDisposer {
    return autorun(r => {
        if (predicate()) {
            r.dispose()
            const prevUntracked = untrackedStart()
            effect()
            untrackedEnd(prevUntracked)
        }
    }, opts)
}

export type IReactionOptions = IAutorunOptions & {
    fireImmediately?: boolean
    compareStructural?: boolean
    equals?: IEqualsComparer<any>
}

export function reaction<T>(
    expression: (r: IReactionPublic) => T,
    effect: (arg: T, r: IReactionPublic) => void,
    opts: IReactionOptions = EMPTY_OBJECT
): IReactionDisposer {
    invariant(typeof expression === "function", "First argument to reaction should be a function")
    if (typeof opts === "boolean") {
        opts = { fireImmediately: opts }
        deprecated(
            `Using fireImmediately as argument is deprecated. Use '{ fireImmediately: true }' instead`
        )
    }
    invariant(typeof opts === "object", "Third argument of reactions should be an object")
    const name = opts.name || "Reaction@" + getNextId()
    const fireImmediately = opts.fireImmediately === true
    const delay = opts.delay || 0
    // TODO: creates ugly spy events, use `effect = (r) => runInAction(opts.name, () => effect(r))` instead?
    const effectAction = action(name, effect)

    let firstTime = true
    let isScheduled = false
    let value: T

    const equals = opts.compareStructural ? comparer.structural : opts.equals || comparer.default

    const r = new Reaction(name, () => {
        if (firstTime || delay < 1) {
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
