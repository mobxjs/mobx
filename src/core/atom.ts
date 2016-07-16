
export interface IAtom extends IObservable {
	isDirty: boolean;
}

/**
 * Used by the transaction manager to signal observers that an atom is ready as soon as the transaction has ended.
 */
export function propagateAtomReady(atom: IAtom) {
	invariant(atom.isDirty, "atom not dirty");
	atom.isDirty = false;
	propagateReadiness(atom, true);
}

/**
 * Anything that can be used to _store_ state is an Atom in mobx. Atom's have two important jobs
 *
 * 1) detect when they are being _used_ and report this (using reportObserved). This allows mobx to make the connection between running functions and the data they used
 * 2) they should notify mobx whenever they have _changed_. This way mobx can re-run any functions (derivations) that are using this atom.
 */
export class Atom implements IAtom {
	isDirty = false;
	staleObservers = [];
	observers = new FastSet<IDerivation>();
	diffValue = 0;

	/**
	 * Create a new atom. For debugging purposes it is recommended to give it a name.
	 * The onBecomeObserved and onBecomeUnobserved callbacks can be used for resource management.
	 */
	constructor(public name = "Atom@" + getNextId(), public onBecomeObserved: () => void = noop, public onBecomeUnobserved = noop) { }

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
		if (!this.isDirty) {
			this.reportStale();
			this.reportReady();
		}
	}

	private reportStale() {
		if (!this.isDirty) {
			this.isDirty = true;
			propagateStaleness(this);
		}
	}

	private reportReady() {
		invariant(this.isDirty, "atom not dirty");
		if (globalState.inTransaction > 0)
			globalState.changedAtoms.push(this);
		else {
			propagateAtomReady(this);
			runReactions();
		}
	}

	toString() {
		return this.name;
	}
}

import {globalState} from "./globalstate";
import {IObservable, propagateReadiness, propagateStaleness, reportObserved} from "./observable";
import {IDerivation} from "./derivation";
import {runReactions} from "./reaction";
import {invariant, noop, getNextId} from "../utils/utils";
import {FastSet} from "../utils/set";
