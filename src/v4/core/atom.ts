import {
    IObservable,
    propagateChanged,
    reportObserved,
    startBatch,
    endBatch,
    IDerivationState,
    getNextId,
    createInstanceofPredicate,
    noop,
    onBecomeObserved,
    onBecomeUnobserved
} from "../internal"

export interface IAtom extends IObservable {
    reportObserved()
    reportChanged()
}

/**
 * Anything that can be used to _store_ state is an Atom in mobx. Atoms have two important jobs
 *
 * 1) detect when they are being _used_ and report this (using reportObserved). This allows mobx to make the connection between running functions and the data they used
 * 2) they should notify mobx whenever they have _changed_. This way mobx can re-run any functions (derivations) that are using this atom.
 */
export class Atom implements IAtom {
    isPendingUnobservation = false // for effective unobserving. BaseAtom has true, for extra optimization, so its onBecomeUnobserved never gets called, because it's not needed
    isBeingObserved = false
    observers = []
    observersIndexes = {}

    diffValue = 0
    lastAccessedBy = 0
    lowestObserverState = IDerivationState.NOT_TRACKING
    /**
     * Create a new atom. For debugging purposes it is recommended to give it a name.
     * The onBecomeObserved and onBecomeUnobserved callbacks can be used for resource management.
     */
    constructor(public name = "Atom@" + getNextId()) {}

    public onBecomeUnobserved() {
        // noop
    }

    public onBecomeObserved() {
        /* noop */
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
        return this.name
    }
}

export const isAtom = createInstanceofPredicate("Atom", Atom)

export function createAtom(
    name: string,
    onBecomeObservedHandler: () => void = noop,
    onBecomeUnobservedHandler: () => void = noop
): IAtom {
    const atom = new Atom(name)
    onBecomeObserved(atom, onBecomeObservedHandler)
    onBecomeUnobserved(atom, onBecomeUnobservedHandler)
    return atom
}
