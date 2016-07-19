import {IDerivation, notifyDependencyReady, notifyDependencyStale} from "./derivation";
import {globalState} from "./globalstate";
import {SimpleSet} from "../utils/set";

export interface IDepTreeNode {
	name: string;
	observers?: SimpleSet<IDerivation>;
	observing?: IObservable[];
}

export interface IObservable extends IDepTreeNode {
	diffValue: number;
	laRunId: number;
	staleObservers: IDerivation[];
	observers: SimpleSet<IDerivation>;
	onBecomeObserved();
	onBecomeUnobserved();
}

export function addObserver(observable: IObservable, node: IDerivation) {
	const wasEmpty = observable.observers.length === 0;
	observable.observers.add(node);
	if (wasEmpty)
		observable.onBecomeObserved();
}

export function removeObserver(observable: IObservable, node: IDerivation) {
	observable.observers.remove(node);
	if (observable.observers.length === 0)
		observable.onBecomeUnobserved(); // TODO: test if this happens only once, e.g. remove returns bool!
}

export function reportObserved(observable: IObservable) {
	if (globalState.isTracking === false)
		return;
	const derivation = globalState.derivationStack[globalState.derivationStack.length - 1];
	/**
	 * Simple optimization, give each derivation run an unique id (runId)
	 * Check if last time this observable was accessed the same runId is used
	 * if this is the case, the relation is already known
	 */
	if (derivation.runId !== observable.laRunId) {
		observable.laRunId = derivation.runId;
		derivation.observing[derivation.l++] = observable;
	}
}

export function propagateStaleness(observable: IObservable|IDerivation) {
	const os = observable.observers.asArray();
	const l = os.length;
	for (let i = 0; i < l; i++)
		notifyDependencyStale(os[i]);
	observable.staleObservers = observable.staleObservers.concat(os);
}

export function propagateReadiness(observable: IObservable|IDerivation, valueDidActuallyChange: boolean) {
	observable.staleObservers.splice(0).forEach(
		o => notifyDependencyReady(o, valueDidActuallyChange)
	);
}
