export interface IAtom extends IObservable {}

// TODO: unify Atom / BaseAtom
/**
 * Anything that can be used to _store_ state is an Atom in mobx. Atoms have two important jobs
 *
 * 1) detect when they are being _used_ and report this (using reportObserved). This allows mobx to make the connection between running functions and the data they used
 * 2) they should notify mobx whenever they have _changed_. This way mobx can re-run any functions (derivations) that are using this atom.
 */
export class BaseAtom implements IAtom {
	isPendingUnobservation = true // for effective unobserving. BaseAtom has true, for extra optimization, so its onBecomeUnobserved never gets called, because it's not needed
	observers = []
	observersIndexes = {}

	diffValue = 0
	lastAccessedBy = 0
	lowestObserverState = IDerivationState.NOT_TRACKING
	/**
     * Create a new atom. For debugging purposes it is recommended to give it a name.
     * The onBecomeObserved and onBecomeUnobserved callbacks can be used for resource management.
     */
	constructor(readonly context: MobxState, public readonly name = "Atom@" + context.nextId()) {}

	public onBecomeUnobserved() {
		// noop
	}

	/**
     * Invoke this method to notify mobx that your atom has been used somehow.
     */
	public reportObserved() {
		reportObserved(this)
	}

	/**
     * Invoke this method _after_ this method has changed to signal mobx that all its observers should invalidate.
     */
	public reportChanged() {
		startBatch(this.context)
		propagateChanged(this)
		endBatch(this.context)
	}

	toString() {
		return this.name
	}
}

export class Atom extends BaseAtom implements IAtom {
	isPendingUnobservation = false // for effective unobserving.
	public isBeingTracked = false

	/**
     * Create a new atom. For debugging purposes it is recommended to give it a name.
     * The onBecomeObserved and onBecomeUnobserved callbacks can be used for resource management.
     */
	constructor(
		context: MobxState,
		public name = "Atom@" + context.nextId(),
		public onBecomeObservedHandler: () => void = noop,
		public onBecomeUnobservedHandler: () => void = noop
	) {
		super(context, name)
	}

	public reportObserved(): boolean {
		startBatch(this.context)

		super.reportObserved()

		if (!this.isBeingTracked) {
			this.isBeingTracked = true
			this.onBecomeObservedHandler()
		}

		endBatch(this.context)
		return !!this.context.trackingDerivation
		// return doesn't really give useful info, because it can be as well calling computed which calls atom (no reactions)
		// also it could not trigger when calculating reaction dependent on Atom because Atom's value was cached by computed called by given reaction.
	}

	public onBecomeUnobserved() {
		this.isBeingTracked = false
		this.onBecomeUnobservedHandler()
	}
}

import { MobxState } from "./mobxstate"
import { IObservable, propagateChanged, reportObserved, startBatch, endBatch } from "./observable"
import { IDerivationState } from "./derivation"
import { noop, createInstanceofPredicate } from "../utils/utils"

export const isAtom = createInstanceofPredicate("Atom", BaseAtom)
