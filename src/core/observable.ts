import {IDerivation, notifyDependencyReady, notifyDependencyStale} from "./derivation";
import {globalState} from "./globalstate";

export interface IDepTreeNode {
	id: number;
	name: string;
	observers?: IDerivation[];
	observing?: IObservable[];
}

export interface IObservable extends IDepTreeNode {
	staleObservers: IDerivation[];
	observers: IDerivation[];
	onBecomeObserved();
	onBecomeUnobserved();
}

export function addObserver(observable: IObservable, node: IDerivation) {
	const obs = observable.observers, l = obs.length;
	obs[l] = node;
	if (l === 0)
		observable.onBecomeObserved();
}

export function removeObserver(observable: IObservable, node: IDerivation) {
	let obs = observable.observers, idx = obs.indexOf(node);
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

export function propagateStaleness(observable: IObservable|IDerivation) {
	const os = observable.observers.slice();
	for (let l = os.length, i = 0; i < l; i++)
		notifyDependencyStale(os[i]); // TODO: could check if it wasn't already stale and filter those out!
	observable.staleObservers = observable.staleObservers.concat(os); // probably inefficient!
}

export function propagateReadiness(observable: IObservable|IDerivation, valueDidActuallyChange: boolean) {
	const os = observable.staleObservers.splice(0);
	for (let l = os.length, i = 0; i < l; i++)
		notifyDependencyReady(os[i], valueDidActuallyChange);
}