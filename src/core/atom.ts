
export interface IAtom extends IObservable {
}

/**
 * Anything that can be used to _store_ state is an Atom in mobx. Atom's have two important jobs
 *
 * 1) detect when they are being _used_ and report this (using reportObserved). This allows mobx to make the connection between running functions and the data they used
 * 2) they should notify mobx whenever they have _changed_. This way mobx can re-run any functions (derivations) that are using this atom.
 */
export class BaseAtom implements IAtom {
	isPendingUnobservation: boolean; // for effective unobserving
	isObserved = false;
	observers = new DerivationsSets();

	diffValue = 0;
	lastAccessedBy = 0;
	lowestObserverState = 0;
	/**
	 * Create a new atom. For debugging purposes it is recommended to give it a name.
	 * The onBecomeObserved and onBecomeUnobserved callbacks can be used for resource management.
	 */
	constructor(public name = "Atom@" + getNextId()) { }

	public onBecomeUnobserved() {
		// noop
	}

	/**
	 * Invoke this method to notify mobx that your atom has been used somehow.
	 */
	public reportObserved() {
		reportObserved(this);
	}

	/**
	 * Invoke this method _after_ this method has changed to signal mobx that all its observers should invalidate.
	 */
	public reportChanged() {
		transactionStart("propagatingAtomChange", null, false);
		propagateChanged(this);
		transactionEnd(false);
	}

	toString() {
		return this.name;
	}
}

export class Atom extends BaseAtom implements IAtom {
	public isBeingTracked = false;

	/**
	 * Create a new atom. For debugging purposes it is recommended to give it a name.
	 * The onBecomeObserved and onBecomeUnobserved callbacks can be used for resource management.
	 */
	constructor(public name = "Atom@" + getNextId(), public onBecomeObservedHandler: () => void = noop, public onBecomeUnobservedHandler: () => void = noop) {
		super(name);
	}

	public reportObserved(): boolean {
		super.reportObserved();
		const tracking = globalState.isTracking;
		if (tracking && !this.isBeingTracked) {
			this.isBeingTracked = true;
			this.onBecomeObservedHandler();
		}
		return tracking;
	}

	public onBecomeUnobserved() {
		this.isBeingTracked = false;
		this.onBecomeUnobservedHandler();
	}
}

import {globalState} from "./globalstate";
import {IObservable, propagateChanged, reportObserved, DerivationsSets} from "./observable";
import {transactionStart, transactionEnd} from "../core/transaction";
import {noop, getNextId} from "../utils/utils";
