import {IObservable, propagateReadiness, propagateStaleness, reportObserved} from "./observable";
import {invariant, noop} from "../utils/utils";
import {globalState, getNextId} from "./globalstate";
import {reportTransition} from "../api/extras";
import {runReactions} from "./transaction";
import {IDerivation} from "./derivation";

export interface IAtom extends IObservable {
	isDirty: boolean;
}

/**
 * Used by the transaction manager to signal observers that an atom is ready as soon as the transaction has ended.
 */
export function propagateAtomReady(atom: IAtom, observersToNotify: IDerivation[] = atom.observers) {
	invariant(atom.isDirty);
	atom.isDirty = false;
	reportTransition(atom, "READY", true);
	propagateReadiness(atom, true, observersToNotify);
}

/**
 * Anything that can be used to _store_ state is an Atom in mobservable. Atom's have two important jobs
 * 
 * 1) detect when they are being _used_ and report this (using reportObserved). This allows mobservable to make the connection between running functions and the data they used
 * 2) they should notify mobservable whenever they have _changed_. This way mobservable can re-run any functions (derivations) that are using this atom. 
 */
export class Atom implements IAtom {
	id = getNextId();
	name: string;
	isDirty = false;
	observers = [];

	/**
	 * Create a new atom. For debugging purposes it is recommended to give it a name.
	 * The onBecomeObserved and onBecomeUnobserved callbacks can be used for resource management.
	 */
	constructor(name?: string, public onBecomeObserved: () => void = noop, public onBecomeUnobserved = noop) {
		this.name = name || ("Atom#" + this.id);
	}

	/**
	 * Invoke this method to notify mobservable that your atom has been used somehow. 
	 */
	reportObserved() {
		reportObserved(this);
	}

	/**
	 * Invoke this method _after_ this method has changed to signal mobservable that all its observers should invalidate.
	 */
	reportChanged() {
		if (!this.isDirty) {
			const {observers} = this;
			this.reportStale();
			this.reportReady(true, observers.slice());
		}
	}

	private reportStale() {
		if (!this.isDirty) {
			this.isDirty = true;
			reportTransition(this, "STALE");
			propagateStaleness(this);
		}
	}

	private reportReady(changed: boolean = true, observersToNotify = this.observers.slice()) {
		invariant(this.isDirty);
		if (globalState.inTransaction > 0)
			globalState.changedAtoms.push({atom: this, observersToNotify: observersToNotify});
		else {
			propagateAtomReady(this);
			runReactions();
		}
	}

	toString() {
		return `${this.name}`;
	}
}