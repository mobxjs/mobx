import {IDerivation, changeDependenciesState} from "./derivation";
import {globalState} from "./globalstate";

export class DerivationsSets {
	size: number = 0;
	data0 = {};
	data1 = {};
	data2 = {};

	get length() {
		return this.size;
	}
	asArray() {
		const res = new Array(this.size);
		let i = 0;
		for (let key in this.data0) {
			res[i] = this.data0[key];
			i++;
		}
		for (let key in this.data1) {
			res[i] = this.data1[key];
			i++;
		}
		for (let key in this.data2) {
			res[i] = this.data2[key];
			i++;
		}
		return res;
	}
	add(value: IDerivation) {
		const data = this["data" + value.dependenciesState];
		const m = value.__mapid;
		if (!(m in data)) {
			data[m] = value;
			this.size++;
		}
	}
	remove(value: IDerivation) {
		const data = this["data" + value.dependenciesState];
		const m = value.__mapid;
		if (m in data) {
			delete data[m];
			this.size--;
		}
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

	isPendingUnobservation: boolean; // for effective unobserving
	isObserved: boolean; // for unobserving only once ber observation
	// sets of observers grouped their state to only notify about changes.
	observers: DerivationsSets;

	onBecomeObserved();
	onBecomeUnobserved();
}

export function addObserver(observable: IObservable, node: IDerivation) {
	observable.observers.add(node);
	if (!observable.isObserved) {
		observable.isObserved = true;
		observable.onBecomeObserved();
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
		globalState.pendingUnobservations.splice(0).forEach(observable => {
			observable.isPendingUnobservation = false;
			if (observable.isObserved && observable.observers.length === 0) {
				observable.isObserved = false;
				observable.onBecomeUnobserved(); // TODO: test if this happens only once, e.g. remove returns bool!
			}
		});
	}
}

export function reportObserved(observable: IObservable) {
	if (globalState.isTracking === false) {
		if (globalState.inBatch > 0 && !observable.isObserved) {
			// pseudoobserving by batch
			observable.isObserved = true;
			observable.onBecomeObserved();
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

export function propagateChanged(observable: IObservable) {
	const observers0 = observable.observers.data0;
	for (let key in observers0) {
		const derivation = observers0[key];

		changeDependenciesState(2, derivation);
		derivation.onBecomeStale();
	}

	const observers1 = observable.observers.data1;
	for (let key in observers1) {
		const derivation = observers1[key];

		changeDependenciesState(2, derivation);
	}
}

export function propagateChangeConfirmed(observable: IObservable) {
	const observers1 = observable.observers.data1;
	for (let key in observers1) {
		const derivation = observers1[key];

		changeDependenciesState(2, derivation);
	}
}

export function propagateMaybeChanged(observable: IObservable) {
	const observers0 = observable.observers.data0;
	for (let key in observers0) {
		const derivation = observers0[key];

		changeDependenciesState(1, derivation);
		derivation.onBecomeStale();
	}
}
