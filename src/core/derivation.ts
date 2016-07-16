import {IObservable, IDepTreeNode, propagateReadiness, propagateStaleness, addObserver, removeObserver, resetWindow} from "./observable";
import {globalState, resetGlobalState} from "./globalstate";
import {quickDiff, invariant} from "../utils/utils";
import {isSpyEnabled, spyReport} from "./spy";
import {FastSet} from "../utils/set";

/**
 * A derivation is everything that can be derived from the state (all the atoms) in a pure manner.
 * See https://medium.com/@mweststrate/becoming-fully-reactive-an-in-depth-explanation-of-mobservable-55995262a254#.xvbh6qd74
 */
export interface IDerivation extends IDepTreeNode, IObservable {
	observing: FastSet<IObservable>;
	staleObservers: IDerivation[];
	observers: FastSet<IDerivation>;
	dependencyStaleCount: number;
	dependencyChangeCount: number;
	onDependenciesReady(): boolean;
}

export function isComputingDerivation() {
	return globalState.derivationStack.length > 0
		&& globalState.isTracking; // filter out actions inside computations
}

export function checkIfStateModificationsAreAllowed() {
	if (!globalState.allowStateChanges) {
		invariant(false, globalState.strictMode
			? "It is not allowed to create or change state outside an `action` when MobX is in strict mode. Wrap the current method in `action` if this state change is intended"
			: "It is not allowed to change the state when a computed value or transformer is being evaluated. Use 'autorun' to create reactive functions with side-effects."
		);
	}
}

/**
 * Notify a derivation that one of the values it is observing has become stale
 */
export function notifyDependencyStale(derivation: IDerivation) {
	if (++derivation.dependencyStaleCount === 1) {
		propagateStaleness(derivation);
	}
}

/**
 * Notify a derivation that one of the values it is observing has become stable again.
 * If all observed values are stable and at least one of them has changed, the derivation
 * will be scheduled for re-evaluation.
 */
export function notifyDependencyReady(derivation: IDerivation, dependencyDidChange: boolean) {
	invariant(derivation.dependencyStaleCount > 0, "unexpected ready notification");
	if (dependencyDidChange)
		derivation.dependencyChangeCount += 1;
	if (--derivation.dependencyStaleCount === 0) {
		// all dependencies are ready
		if (derivation.dependencyChangeCount > 0) {
			// did any of the observables really change?
			derivation.dependencyChangeCount = 0;
			const changed = derivation.onDependenciesReady();
			propagateReadiness(derivation, changed);
		} else {
			// we're done, but didn't change, lets make sure verybody knows..
			propagateReadiness(derivation, false);
		}
	}
}

/**
 * Executes the provided function `f` and tracks which observables are being accessed.
 * The tracking information is stored on the `derivation` object and the derivation is registered
 * as observer of any of the accessed observables.
 */
export function trackDerivedFunction<T>(derivation: IDerivation, f: () => T) {
	// TODO:don't clone?
	const prevObserving = derivation.observing.cloneAndClear();
	globalState.derivationStack.push(derivation);
	resetWindow();
	const prevTracking = globalState.isTracking;
	globalState.isTracking = true;
	let hasException = true;
	let result: T;
	try {
		result = f.call(derivation);
		hasException = false;
	} finally {
		if (hasException) {
			const message = (
				`[mobx] An uncaught exception occurred while calculating your computed value, autorun or transformer. Or inside the render() method of an observer based React component. ` +
				`These functions should never throw exceptions as MobX will not always be able to recover from them. ` +
				`Please fix the error reported after this message or enable 'Pause on (caught) exceptions' in your debugger to find the root cause. In: '${derivation.name}'`
			);
			if (isSpyEnabled()) {
				spyReport({
					type: "error",
					object: this,
					message
				});
			}
			console.warn(message); // In next major, maybe don't emit this message at all?
			// Poor mans recovery attempt
			// Assumption here is that this is the only exception handler in MobX.
			// So functions higher up in the stack (like transanction) won't be modifying the globalState anymore after this call.
			// (Except for other trackDerivedFunction calls of course, but that is just)
			resetGlobalState();
		} else {
			globalState.isTracking = prevTracking;
			bindDependencies(derivation, prevObserving);
		}
	}
	return result;
}

function bindDependencies(derivation: IDerivation, prevObserving: IObservable[]) {
	globalState.derivationStack.length -= 1;

	// TODO: don't diff list but merge sets
	// TODO: or do a sweep-mark to see which ones need to be added / removed
	// TODO: don't copy prevObserving

	// reset all diff values to 0
	const prevLength = prevObserving.length;
	for (let i = 0; i < prevLength; i++)
		prevObserving[i].diffValue = 0;

	let newIter = derivation.observing.data.values();
	let v = newIter.next();
	while (!v.done) {
		v.value.diffValue = 0;
		v = newIter.next();
	}

	// drop count for old ones
	for (let i = 0; i < prevLength; i++)
		prevObserving[i].diffValue--;

	// increase count for new ones
	newIter = derivation.observing.data.values();
	v = newIter.next();
	while (!v.done) {
		v.value.diffValue++;
		v = newIter.next();
	}

	// register new observers
	newIter = derivation.observing.data.values();
	v = newIter.next();
	while (!v.done) {
		if (v.value.diffValue === 1)
			addObserver(v.value, derivation);
		v = newIter.next();
	}

	// remove old observer
	// remove observers after adding them, so that they don't go in lazy mode to early
	for (let i = 0; i < prevLength; i++)
		if (prevObserving[i].diffValue === -1)
			removeObserver(prevObserving[i], derivation);
}

export function untracked<T>(action: () => T): T {
	const prev = untrackedStart();
	const res = action();
	untrackedEnd(prev);
	return res;
}

export function untrackedStart() {
	const prev = globalState.isTracking;
	globalState.isTracking = false;
	return prev;
}

export function untrackedEnd(prev: boolean) {
	globalState.isTracking = prev;
}