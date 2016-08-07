import {IDerivation} from "./derivation";
import {globalState} from "./globalstate";
import {invariant} from "../utils/utils";

export class DerivationsSets {
	list: IDerivation[] = [];
	toDelete: IDerivation[] = [];

	get length() {
		return this.list.length - this.toDelete.length;
	}

	clearDeleted() {
		const toDelete = this.toDelete;
		if (toDelete.length !== 0) {
			const list = this.list;
			for (let i = 0; i < toDelete.length; i++) {
				toDelete[i].diffValue++;
			}

			let i0 = 0;
			for (let i = 0; i < list.length; i++) {
				if (list[i].diffValue === 0) {
					if (i !== i0) list[i0] = list[i];
					i0++;
				} else {
					list[i].diffValue--;
				}
			}

			// invariant(toDelete.every(a => a.diffValue === 0), "INTERNAL ERROR, clear deleted should leave diffValue everywhere 0");
			this.toDelete = [];
			list.length = i0;
		}
	}

	asArray() {
		this.clearDeleted();
		return this.list;
	}

	add(value: IDerivation) {
		// invariant(value.dependenciesState !== -1, "INTERNAL ERROR, can add only dependenciesState !== -1");
		this.list.push(value);
	}

	remove(value: IDerivation) {
		// invariant(globalState.inBatch > 0, "INTERNAL ERROR, remove should be called only inside batch");
		if (this.toDelete.length === 0) {
			globalState.pendingDeletions.push(this);
		}
		this.toDelete.push(value);
	}
	// move(targetState: number, value: IDerivation) {
	// 	const m = value.__mapid;
	// 	delete this["data" + value.dependenciesState][m];
	// 	this["data" + targetState][m] = value;
	// }
}

export interface IDepTreeNode {
	name: string;
	observers?: DerivationsSets;
	observing?: IObservable[];
}

export interface IObservable extends IDepTreeNode {
	diffValue: number;
	/**
	 * Id of the derivation *run* that last accesed this observable.
	 * If this id equals the *run* id of the current derivation,
	 * the dependency is already established
	 */
	lastAccessedBy: number;

	lowestObserverState: number;
	isPendingUnobservation: boolean; // for effective unobserving
	isObserved: boolean; // for unobserving only once ber observation
	// sets of observers grouped their state to only notify about changes.
	observers: DerivationsSets;

	onBecomeUnobserved();
}

export function addObserver(observable: IObservable, node: IDerivation) {
	observable.observers.add(node);
	observable.lowestObserverState = Math.min(observable.lowestObserverState, node.dependenciesState);
	if (!observable.isObserved) {
		observable.isObserved = true;
	}
}

export function removeObserver(observable: IObservable, node: IDerivation) {
	observable.observers.remove(node);
	if (observable.isObserved && observable.observers.length === 0) {
		if (globalState.inBatch > 0) {
			/**
			 * Wan't to observe/unobserve max once per observable during batch.
			 * Let's postpone it to end of the batch
			 */
			if (!observable.isPendingUnobservation) {
				observable.isPendingUnobservation = true;
				globalState.pendingUnobservations.push(observable);
			}
		} else {
			observable.isObserved = false;
			observable.onBecomeUnobserved(); // TODO: test if this happens only once, e.g. remove returns bool!
		}
	}
}

export function startBatch() {
	globalState.inBatch++;
}

export function endBatch() {
	if (--globalState.inBatch === 0) {
		globalState.inBatch = 1;
		while (globalState.pendingUnobservations.length > 0) {
			globalState.pendingUnobservations.splice(0).forEach(observable => {
				observable.isPendingUnobservation = false;
				if (observable.isObserved && observable.observers.length === 0) {
					observable.isObserved = false;
					observable.onBecomeUnobserved(); // TODO: test if this happens only once, e.g. remove returns bool!
				}
			});
			globalState.pendingDeletions.splice(0).forEach(d => d.clearDeleted());
		}
		globalState.inBatch = 0;
	}
}

export function reportObserved(observable: IObservable) {
	if (globalState.isTracking === false) {
		if (globalState.inBatch > 0 && !observable.isObserved) {
			// pseudoobserving by batch
			observable.isObserved = true;
			// probably will want to unobserve it at the end of the batch
			if (!observable.isPendingUnobservation) {
				observable.isPendingUnobservation = true;
				globalState.pendingUnobservations.push(observable);
			}
		}
		return;
	}
	const derivation = globalState.derivationStack[globalState.derivationStack.length - 1];
	/**
	 * Simple optimization, give each derivation run an unique id (runId)
	 * Check if last time this observable was accessed the same runId is used
	 * if this is the case, the relation is already known
	 */
	observable.isObserved = true;
	if (derivation.runId !== observable.lastAccessedBy) {
		observable.lastAccessedBy = derivation.runId;
		derivation.newObserving[derivation.unboundDepsCount++] = observable;
	}
}

function invariantLOS(observable: IObservable, msg) {
	console.log("check invariantLOS for", msg);
	const min = observable.observers.asArray().reduce((a, b) => Math.min(a, b.dependenciesState), 2);
	if (min >= observable.lowestObserverState) return;
	throw new Error("lowestObserverState is wrong for " + msg + " because " + min  + " < " + observable.lowestObserverState);
}

export function propagateChanged(observable: IObservable) {
	// invariantLOS(observable, "changed start");
	if (observable.lowestObserverState === 2) return;
	observable.lowestObserverState = 2;

	const observers = observable.observers.asArray();
	for (let i = 0; i < observers.length; i++) {
		const d = observers[i];
		if (d.dependenciesState === 0) {
			d.onBecomeStale();
		}
		d.dependenciesState = 2;
	}
	// invariantLOS(observable, "changed end");
}

export function propagateChangeConfirmed(observable: IObservable) {
	// invariantLOS(observable, "confirmed start");
	if (observable.lowestObserverState === 2) return;
	observable.lowestObserverState = 2;

	const observers = observable.observers.asArray();
	for (let i = 0; i < observers.length; i++) {
		const d = observers[i];
		if (d.dependenciesState === 1) {
			d.dependenciesState = 2;
		} else if (d.dependenciesState === 0) {
			observable.lowestObserverState = 0;
		}
	}
	// invariantLOS(observable, "confirmed end");
}

export function propagateMaybeChanged(observable: IObservable) {
	// invariantLOS(observable, "maybe start");
	if (observable.lowestObserverState !== 0) return;
	observable.lowestObserverState = 1;

	const observers = observable.observers.asArray();
	for (let i = 0; i < observers.length; i++) {
		const d = observers[i];
		if (d.dependenciesState === 0) {
			d.dependenciesState = 1;
			d.onBecomeStale();
		}
	}
	// invariantLOS(observable, "maybe end");
}
