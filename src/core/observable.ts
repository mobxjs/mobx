import {IDerivation, changeDependenciesState} from "./derivation";
import {globalState} from "./globalstate";
import {SimpleSet} from "../utils/set";

export interface IDepTreeNode {
	name: string;
	observers0?: SimpleSet<IDerivation>;
	observers1?: SimpleSet<IDerivation>;
	observers2?: SimpleSet<IDerivation>;
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
	observers0: SimpleSet<IDerivation>;
	observers1: SimpleSet<IDerivation>;
	observers2: SimpleSet<IDerivation>;

	onBecomeObserved();
	onBecomeUnobserved();
}

export function observersArray(node: IDepTreeNode) {
	if (!node.observers0) return [];
	return node.observers0.asArray().concat(node.observers1.asArray()).concat(node.observers2.asArray());
}

export function hasObservers(node: IDepTreeNode) {
	if (!node.observers0) return false;
	return Boolean(node.observers0.length || node.observers1.length || node.observers2.length);
}

export function addObserver(observable: IObservable, node: IDerivation) {
	observable["observers" + node.dependenciesState].add(node);
	if (!observable.isObserved) {
		observable.isObserved = true;
		observable.onBecomeObserved();
	}
}

export function removeObserver(observable: IObservable, node: IDerivation) {
	observable["observers" + node.dependenciesState].remove(node);
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
		globalState.pendingUnobservations.splice(0).forEach(observable => {
			if (observable.isObserved && !hasObservers(observable)) {
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
			observable.isPendingUnobservation = true;
			globalState.pendingUnobservations.push(observable);
		}
		return;
	}
	const derivation = globalState.derivationStack[globalState.derivationStack.length - 1];
	/**
	 * Simple optimization, give each derivation run an unique id (runId)
	 * Check if last time this observable was accessed the same runId is used
	 * if this is the case, the relation is already known
	 */
	if (derivation.runId !== observable.lastAccessedBy) {
		observable.lastAccessedBy = derivation.runId;
		derivation.observing[derivation.unboundDepsCount++] = observable;
	}
}

export function propagateChanged(observable: IObservable) {
	observable.observers0.asArray().forEach(derivation => {
		changeDependenciesState(2, derivation);
		derivation.onBecomeStale();
	});

	observable.observers1.asArray().forEach(derivation => {
		changeDependenciesState(2, derivation);
	});
}

export function propagateMaybeChanged(observable: IObservable) {
	observable.observers0.asArray().forEach(derivation => {
		changeDependenciesState(1, derivation);
		derivation.onBecomeStale();
	});
}
