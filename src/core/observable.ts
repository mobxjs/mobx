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
	if (_observersToDelete.length !== 0) { // only do work if needed
		const _observers = observable._observers;
		/**
		 * Short description:
		 *   `a` - number of occurencies of derivation `d` in _observersToDelete
		 *   `b` - number of occurencies of derivation `d` in _observers
		 *   `a + 1 === b || a === b` must be always true
		 * Each addition will have one deletion, last addition might not be deleted yet,
		 * and we want to keep exactly those.
		 * After running the algorithm we want to have:
		 *   `a === 0` and (if `b` used to `a + 1` then `b === 1` else `b === 0`)
		 */
		let l = _observersToDelete.length;
		while (l--) {
			_observersToDelete[l].diffValue++;
		}

		// using i0, as iterator for result array. deleting in place.
		let i0 = 0, i = 0;
		l = _observers.length;
		while (i < l) {
			const o = _observers[i];
			if (o.diffValue === 0) { // `o` doesn't have corresponding deletion, let's keep it
				if (i !== i0) _observers[i0] = o;
				i0++;
			} else { // `o` has corresponding deletion, let's delete it
				o.diffValue--;
			}
			i++;
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
	invariant(node.dependenciesState !== -1, "INTERNAL ERROR, can add only dependenciesState !== -1");
	invariant(observable.isObserved, "INTERNAL ERROR, isObserved should be already set during reportObserved");

	observable._observers.push(node);
	if (observable.lowestObserverState > node.dependenciesState) observable.lowestObserverState = node.dependenciesState;
}

export function removeObserver(observable: IObservable, node: IDerivation) {
	invariant(globalState.inBatch > 0, "INTERNAL ERROR, remove should be called only inside batch");
	if (observable._observersToDelete.length === 0) {
		globalState.pendingDeletions.push(observable);
	}
	observable._observersToDelete.push(node);

	if (observable.isObserved && !hasObservers(observable) && !observable.isPendingUnobservation) {
		/**
		 * Wan't to observe/unobserve max once per observable during batch.
		 * Let's postpone it to end of the batch
		 */
		observable.isPendingUnobservation = true;
		globalState.pendingUnobservations.push(observable);
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
	observable.isObserved = true;
	const derivation = globalState.derivationStack[globalState.derivationStack.length - 1];
	/**
	 * Simple optimization, give each derivation run an unique id (runId)
	 * Check if last time this observable was accessed the same runId is used
	 * if this is the case, the relation is already known
	 */
	if (derivation.runId !== observable.lastAccessedBy) {
		observable.lastAccessedBy = derivation.runId;
		derivation.newObserving[derivation.unboundDepsCount++] = observable;
	}
}

function invariantLOS(observable: IObservable, msg) {
	// it's expensive so better not run it in produciton. but temporarily helpful for testing
	const min = getObservers(observable).reduce((a, b) => Math.min(a, b.dependenciesState), 2);
	if (min >= observable.lowestObserverState) return; // <- the only assumption about `lowestObserverState`
	throw new Error("lowestObserverState is wrong for " + msg + " because " + min  + " < " + observable.lowestObserverState);
}

export function propagateChanged(observable: IObservable) {
	// invariantLOS(observable, "changed start");
	if (observable.lowestObserverState === 2) return;
	observable.lowestObserverState = 2;

	const observers = getObservers(observable);
	let i = observers.length;
	while (i--) {
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
	let i = observers.length;
	while (i--) {
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
	let i = observers.length;
	while (i--) { // using while or for loop influence order of shceduling reactions, but it shuoldn't matter.
		const d = observers[i];
		if (d.dependenciesState === 0) {
			d.dependenciesState = 1;
			d.onBecomeStale();
		}
	}
	// invariantLOS(observable, "maybe end");
}
