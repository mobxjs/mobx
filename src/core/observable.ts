import {IDerivation, notifyDependencyReady, notifyDependencyStale} from "./derivation";
import {invariant} from "../utils";
import globalState from "./global";

export interface IDepTreeNode {
	id: number;
	name: string;
	observers?:IDerivation[];
	observing?:IObservable[];
}

export interface IObservable extends IDepTreeNode {
	observers: IDerivation[];
	onBecomeUnobserved();
}

export function addObserver(observable: IObservable, node: IDerivation) {
    observable.observers[observable.observers.length] = node;
	// TODO: if (obs.length === 1 observable.onBecomeObserved)
}

export function removeObserver(observable: IObservable, node: IDerivation) {
    var obs = observable.observers, idx = obs.indexOf(node);
    if (idx !== -1)
        obs.splice(idx, 1);
	if (obs.length === 0)
		observable.onBecomeUnobserved();
}

export function reportObserved(observable: IObservable) {
	if (globalState.inUntracked > 0)
		return;
	const {derivationStack} = globalState;
	const l = derivationStack.length;
	if (l > 0) {
		const deps = derivationStack[l - 1].observing, depslength = deps.length;
		// this last item added check is an optimization especially for array loops,
		// because an array.length read with subsequent reads from the array
		// might trigger many observed events, while just checking the latest added items is cheap
		if (deps[depslength - 1] !== observable && deps[depslength - 2] !== observable)
			deps[depslength] = observable;
	}
}

export function propagateStaleness(observable:IObservable|IDerivation) {
	var os = observable.observers;
    if (!os)
        return;
    os = os.slice(); // TODO: slice needed?
	for(var l = os.length, i = 0; i < l; i++)
        notifyDependencyStale(os[i]);
}

export function propagateReadiness(observable:IObservable|IDerivation, valueDidActuallyChange:boolean, observersToNotify:IDerivation[] = observable.observers) {
    if (!observersToNotify)
        return;
	//    observers = observers.slice(); // TODO: slice needed?
	for(var l = observersToNotify.length, i = 0; i < l; i++)
        notifyDependencyReady(observersToNotify[i], valueDidActuallyChange);
}