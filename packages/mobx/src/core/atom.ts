import {
    IDerivationState_,
    IObservable,
    IDerivation,
    createInstanceofPredicate,
    endBatch,
    getNextId,
    noop,
    onBecomeObserved,
    onBecomeUnobserved,
    propagateChanged,
    reportObserved,
    startBatch,
    Lambda
} from "../internal"

import { getFlag, setFlag } from "../utils/utils"

export const $mobx = Symbol("mobx administration")

export interface IAtom extends IObservable {
    reportObserved(): boolean
    reportChanged(): void
}

export class Atom implements IAtom {
    private static readonly isBeingObservedMask_ = 0b001
    private static readonly isPendingUnobservationMask_ = 0b010
    private static readonly diffValueMask_ = 0b100
    private flags_ = 0b000

    observers_ = new Set<IDerivation>()

    lastAccessedBy_ = 0
    lowestObserverState_ = IDerivationState_.NOT_TRACKING_
    /**
     * Create a new atom. For debugging purposes it is recommended to give it a name.
     * The onBecomeObserved and onBecomeUnobserved callbacks can be used for resource management.
     */
    constructor(public name_ = __DEV__ ? "Atom@" + getNextId() : "Atom") {}

    // for effective unobserving. BaseAtom has true, for extra optimization, so its onBecomeUnobserved never gets called, because it's not needed
    get isBeingObserved(): boolean {
        return getFlag(this.flags_, Atom.isBeingObservedMask_)
    }
    set isBeingObserved(newValue: boolean) {
        this.flags_ = setFlag(this.flags_, Atom.isBeingObservedMask_, newValue)
    }

    get isPendingUnobservation(): boolean {
        return getFlag(this.flags_, Atom.isPendingUnobservationMask_)
    }
    set isPendingUnobservation(newValue: boolean) {
        this.flags_ = setFlag(this.flags_, Atom.isPendingUnobservationMask_, newValue)
    }

    get diffValue(): 0 | 1 {
        return getFlag(this.flags_, Atom.diffValueMask_) ? 1 : 0
    }
    set diffValue(newValue: 0 | 1) {
        this.flags_ = setFlag(this.flags_, Atom.diffValueMask_, newValue === 1 ? true : false)
    }

    // onBecomeObservedListeners
    public onBOL: Set<Lambda> | undefined
    // onBecomeUnobservedListeners
    public onBUOL: Set<Lambda> | undefined

    public onBO() {
        if (this.onBOL) {
            this.onBOL.forEach(listener => listener())
        }
    }

    public onBUO() {
        if (this.onBUOL) {
            this.onBUOL.forEach(listener => listener())
        }
    }

    /**
     * Invoke this method to notify mobx that your atom has been used somehow.
     * Returns true if there is currently a reactive context.
     */
    public reportObserved(): boolean {
        return reportObserved(this)
    }

    /**
     * Invoke this method _after_ this method has changed to signal mobx that all its observers should invalidate.
     */
    public reportChanged() {
        startBatch()
        propagateChanged(this)
        endBatch()
    }

    toString() {
        return this.name_
    }
}

export const isAtom = createInstanceofPredicate("Atom", Atom)

export function createAtom(
    name: string,
    onBecomeObservedHandler: () => void = noop,
    onBecomeUnobservedHandler: () => void = noop
): IAtom {
    const atom = new Atom(name)
    // default `noop` listener will not initialize the hook Set
    if (onBecomeObservedHandler !== noop) {
        onBecomeObserved(atom, onBecomeObservedHandler)
    }

    if (onBecomeUnobservedHandler !== noop) {
        onBecomeUnobserved(atom, onBecomeUnobservedHandler)
    }
    return atom
}
