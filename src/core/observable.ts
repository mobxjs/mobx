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
	_observers: IDerivation[]; // mantain _observers in raw array for for way faster iterating in propagation.
	_observersIndexes: {}; // must be empty when nothing is running

	onBecomeUnobserved();
}

export function legacyObservers(observable: IObservable): ILegacyObservers {
	return {
		get length() {
			return observable._observers.length;
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
	return observable._observers.length > 0;
}

export function getObservers(observable: IObservable): IDerivation[] {
	return observable._observers;
}

function invariantObservers(observable: IObservable) {
	const list = observable._observers;
	const map = observable._observersIndexes;
	const l = list.length;
	for (let i = 0; i < l; i++) {
		const id = list[i].__mapid;
		if (i) {
			invariant(map[id] === i, "INTERNAL ERROR maps derivation.__mapid to index in list"); // for performance
		} else {
			invariant(!(id in map), "INTERNAL ERROR observer on index 0 shouldnt be held in map."); // for performance
		}
	}
	invariant(list.length === 0 || Object.keys(map).length === list.length - 1, "INTERNAL ERROR there is no junk in map");
}
export function addObserver(observable: IObservable, node: IDerivation) {
	// invariant(node.dependenciesState !== -1, "INTERNAL ERROR, can add only dependenciesState !== -1");
	// invariant(observable.isObserved, "INTERNAL ERROR, isObserved should be already set during reportObserved");
	// invariant(observable._observers.indexOf(node) === -1, "INTERNAL ERROR add already added node");
	// invariantObservers(observable);

	const l = observable._observers.length;
	if (l) { // because object assignment is relatively expensive, let's not store data about index 0.
		observable._observersIndexes[node.__mapid] = l;
	}
	observable._observers[l] = node;

	if (observable.lowestObserverState > node.dependenciesState) observable.lowestObserverState = node.dependenciesState;

	// invariantObservers(observable);
	// invariant(observable._observers.indexOf(node) !== -1 && (node.__mapid in observable._observersIndexes), "INTERNAL ERROR add already added node2");
}

export function removeObserver(observable: IObservable, node: IDerivation) {
	// invariant(globalState.inBatch > 0, "INTERNAL ERROR, remove should be called only inside batch");
	// invariant(observable.isObserved, "INTERNAL ERROR, remove should be called only on observed observables");
	// invariant(observable._observers.indexOf(node) !== -1, "INTERNAL ERROR remove already removed node");
	// invariantObservers(observable);

	if (observable._observers.length === 1) {
		// deleting last observer
		observable._observers.length = 0;

		if (!observable.isPendingUnobservation) {
			/**
			 * Wan't to observe/unobserve max once per observable during batch.
			 * Let's postpone it to end of the batch
			 */
			observable.isPendingUnobservation = true;
			globalState.pendingUnobservations.push(observable);
		}
	} else {
		// deleting from _observersIndexes is straight forward, to delete from _observers, let's swap `node` with last element.
		const list = observable._observers;
		const map = observable._observersIndexes;
		const filler = list.pop();
		if (filler !== node) {
			const index = map[node.__mapid] || 0;
			if (index) { // map store all indexes but 0, see comment in `addObserver`
				map[filler.__mapid] = index;
			} else {
				delete map[filler.__mapid];
			}
			list[index] = filler;
		}
		delete map[node.__mapid];
	}

	// invariantObservers(observable);
	// invariant(observable._observers.indexOf(node) === -1, "INTERNAL ERROR remove already removed node2");
}

export function startBatch() {
	globalState.inBatch++;
}

export function endBatch() {
	if (--globalState.inBatch === 0) {
		globalState.inBatch = 1;
		const list = globalState.pendingUnobservations;
		for (let i = 0; i < list.length; i++) {
			const observable = list[i];
			observable.isPendingUnobservation = false;
			if (observable.isObserved && observable._observers.length === 0) {
				observable.isObserved = false;
				observable.onBecomeUnobserved();
			}
		}
		globalState.pendingUnobservations = [];
		globalState.inBatch = 0;
	}
}

export function reportObserved(observable: IObservable) {
	const derivation = globalState.trackingDerivation;
	if (derivation !== null) {
		observable.isObserved = true;
		/**
		 * Simple optimization, give each derivation run an unique id (runId)
		 * Check if last time this observable was accessed the same runId is used
		 * if this is the case, the relation is already known
		 */
		if (derivation.runId !== observable.lastAccessedBy) {
			observable.lastAccessedBy = derivation.runId;
			derivation.newObserving[derivation.unboundDepsCount++] = observable;
		}
	} else {
		if (globalState.inBatch > 0 && !observable.isObserved) {
			// pseudoobserving by batch
			observable.isObserved = true;
			// probably will want to unobserve it at the end of the batch
			if (!observable.isPendingUnobservation) {
				observable.isPendingUnobservation = true;
				globalState.pendingUnobservations.push(observable);
			}
		}
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

	const observers = observable._observers;
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

	const observers = observable._observers;
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

	const observers = observable._observers;
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
