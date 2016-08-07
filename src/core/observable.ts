import {IDerivation} from "./derivation";
import {globalState} from "./globalstate";
import {invariant} from "../utils/utils";

export interface ILegacyObservers {
	asArray(): IDerivation[];
	length: number;
}

export interface IDepTreeNode {
	name: string;
	observers?: ILegacyObservers;
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

	lowestObserverState: number; // to not repeat same propagations, see `invariantLOS`
	isPendingUnobservation: boolean; // for effective unobserving
	isObserved: boolean; // for unobserving only once ber observation
	// sets of observers grouped their state to only notify about changes.
	observers: ILegacyObservers;
	_observers: IDerivation[]; // a is observer if it occurs in _observers one time more than in _observersToDelete
	_observersToDelete: IDerivation[]; // must be empty when nothing is running

	onBecomeUnobserved();
}

export function legacyObservers(observable: IObservable): ILegacyObservers {
	return {
		get length() {
			return observable._observers.length - observable._observersToDelete.length;
		},
		asArray() {
			return getObservers(observable);
		}
	};
}

export function isObjectObservable(arg: any): arg is IObservable {
	return arg ? arg.lastAccessedBy !== undefined : false;
}

export function hasObservers(observable: IObservable): boolean {
	return observable._observers.length - observable._observersToDelete.length > 0;
}

// the trick is to only clear deleted elements when observers will be read whole anyway or when batch ends
function clearDeletedObservers(observable: IObservable) {
	const _observersToDelete = observable._observersToDelete;
	if (_observersToDelete.length !== 0) {
		const _observers = observable._observers;
		for (let i = 0; i < _observersToDelete.length; i++) {
			_observersToDelete[i].diffValue++;
		}

		let i0 = 0;
		for (let i = 0; i < _observers.length; i++) {
			if (_observers[i].diffValue === 0) {
				if (i !== i0) _observers[i0] = _observers[i];
				i0++;
			} else {
				_observers[i].diffValue--;
			}
		}

		// invariant(_observersToDelete.every(a => a.diffValue === 0), "INTERNAL ERROR, clear deleted should leave diffValue everywhere 0");
		observable._observersToDelete = [];
		_observers.length = i0;
	}
}

export function getObservers(observable: IObservable): IDerivation[] {
	clearDeletedObservers(observable);
	return observable._observers;
}

export function addObserver(observable: IObservable, node: IDerivation) {
	// invariant(node.dependenciesState !== -1, "INTERNAL ERROR, can add only dependenciesState !== -1");
	observable._observers.push(node);

	// observable.lowestObserverState = Math.min(observable.lowestObserverState, node.dependenciesState);
	if (observable.lowestObserverState > node.dependenciesState) observable.lowestObserverState = node.dependenciesState;
	if (!observable.isObserved) {
		observable.isObserved = true;
	}
}

export function removeObserver(observable: IObservable, node: IDerivation) {
	// invariant(globalState.inBatch > 0, "INTERNAL ERROR, remove should be called only inside batch");
	if (observable._observersToDelete.length === 0) {
		globalState.pendingDeletions.push(observable);
	}
	observable._observersToDelete.push(node);

	if (observable.isObserved && !hasObservers(observable)) {
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
				if (observable.isObserved && !hasObservers(observable)) {
					observable.isObserved = false;
					observable.onBecomeUnobserved(); // TODO: test if this happens only once, e.g. remove returns bool!
				}
			});
			globalState.pendingDeletions.splice(0).forEach(clearDeletedObservers);
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
	const min = getObservers(observable).reduce((a, b) => Math.min(a, b.dependenciesState), 2);
	if (min >= observable.lowestObserverState) return; // <- the only assumption about `lowestObserverState`
	throw new Error("lowestObserverState is wrong for " + msg + " because " + min  + " < " + observable.lowestObserverState);
}

export function propagateChanged(observable: IObservable) {
	// invariantLOS(observable, "changed start");
	if (observable.lowestObserverState === 2) return;
	observable.lowestObserverState = 2;

	const observers = getObservers(observable);
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

	const observers = getObservers(observable);
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

	const observers = getObservers(observable);
	for (let i = 0; i < observers.length; i++) {
		const d = observers[i];
		if (d.dependenciesState === 0) {
			d.dependenciesState = 1;
			d.onBecomeStale();
		}
	}
	// invariantLOS(observable, "maybe end");
}
