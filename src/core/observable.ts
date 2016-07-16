import {IDerivation, notifyDependencyReady, notifyDependencyStale} from "./derivation";
import {globalState} from "./globalstate";
import {Set} from "../utils/set";

export interface IDepTreeNode {
	name: string;
	observers?: Set<IDerivation>;
	observing?: Set<IObservable>;
}

export interface IObservable extends IDepTreeNode {
	staleObservers: IDerivation[];
	observers: Set<IDerivation>;
	onBecomeObserved();
	onBecomeUnobserved();
}

export function addObserver(observable: IObservable, node: IDerivation) {
	const wasEmpty = observable.observers.isEmpty();
	observable.observers.add(node);
	if (wasEmpty)
		observable.onBecomeObserved();
}

export function removeObserver(observable: IObservable, node: IDerivation) {
	observable.observers.remove(node);
	if (observable.observers.isEmpty())
		observable.onBecomeUnobserved(); // TODO: test if this happens only once, e.g. remove returns bool!
}

export function reportObserved(observable: IObservable) {
	if (globalState.isTracking === false)
		return;
	globalState.derivationStack[globalState.derivationStack.length - 1].observing.add(observable);
	// TODO: still use diff with last few optimization?
}

export function propagateStaleness(observable: IObservable|IDerivation) {
	const os = observable.observers.asArray();
	os.forEach(notifyDependencyStale);
	observable.staleObservers = observable.staleObservers.concat(os); // TODO: could be faster if this was set as well?
}

export function propagateReadiness(observable: IObservable|IDerivation, valueDidActuallyChange: boolean) {
	observable.staleObservers.splice(0).forEach(
		o => notifyDependencyReady(o, valueDidActuallyChange)
	);
}
