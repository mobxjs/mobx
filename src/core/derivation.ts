import {IObservable, IDepTreeNode, propagateReadiness, propagateStaleness, addObserver, removeObserver} from "./observable";
import {globalState, resetGlobalState} from "./globalstate";
import {invariant} from "../utils/utils";
import {isSpyEnabled, spyReport} from "./spy";
import {SimpleSet, ISetEntry} from "../utils/set";

/**
 * A derivation is everything that can be derived from the state (all the atoms) in a pure manner.
 * See https://medium.com/@mweststrate/becoming-fully-reactive-an-in-depth-explanation-of-mobservable-55995262a254#.xvbh6qd74
 */
export interface IDerivation extends IDepTreeNode, IObservable, ISetEntry {
	observing: IObservable[]; // TODO: should be array
	staleObservers: IDerivation[];
	observers: SimpleSet<IDerivation>;
	dependencyStaleCount: number;
	dependencyChangeCount: number;
	onDependenciesReady(): boolean;
	runId: number;
	l: number; // TODO: rename
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

let runId = 1; // TODO: global state

/**
 * Executes the provided function `f` and tracks which observables are being accessed.
 * The tracking information is stored on the `derivation` object and the derivation is registered
 * as observer of any of the accessed observables.
 */
export function trackDerivedFunction<T>(derivation: IDerivation, f: () => T) {
	const prevObserving = derivation.observing;
	// pre allocate array allocation + room for variation in deps
	// array will be trimmed by bindDependencies
	derivation.observing = new Array(prevObserving.length + 100);
	derivation.l = 0;
	derivation.runId = ++runId;
	globalState.derivationStack.push(derivation);
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
			derivation.l = 0;
			derivation.observing = prevObserving;
			resetGlobalState();
		} else {
			globalState.isTracking = prevTracking;
			globalState.derivationStack.length -= 1;
			bindDependencies(derivation, prevObserving);
		}
	}
	return result;
}

function bindDependencies(derivation: IDerivation, prevObserving: IObservable[]) {
	const prevLength = prevObserving.length;
	// trim and determina new observing length
	const observing = derivation.observing;
	const newLength = observing.length = derivation.l;

	// Idea of this algorithm is start with marking all observables in observing and prevObserving with weight 0
	// After that all prevObserving weights are decreased with -1
	// And all new observing are increased with +1.
	// After that holds: 0 = old dep that is still in use, -1 = old dep, no longer in use, +1 = new dep, was not in use before

	// This process is optimized by making sure deps are always left 'clean', with value 0, so that they don't need to be reset at the start of this process
	// after that, all prevObserving items are marked with -1 directly, instead of 0 and doing -- after that
	// further the +1 and addObserver can be done in one go.

	// TODO: do these things still need to be sets? what about arrays and using --1, < 0 and > 0?
	for (let i = 0; i < prevLength; i++)
		prevObserving[i].diffValue--; // expected 0 here, but -1 disables next loop:

	for (let i = 0; i < newLength; i++) {
		const dep = observing[i];
		if ((++dep.diffValue) > 0) {
			dep.diffValue = 0; // this also short circuits add if a dep is multiple times in the observing list
			addObserver(dep, derivation);
		}
	}

	for (let i = 0; i < prevLength; i++) {
		const dep = prevObserving[i];
		if (dep.diffValue < 0) {
			dep.diffValue = 0; // this also short circuits add if a dep is multiple times in the observing list
			removeObserver(dep, derivation);
		}
	}
}

export function clearObserving(derivation: IDerivation) {
	const obs = derivation.observing;
	const l = obs.length;
	for (let i = 0; i < l; i++)
		removeObserver(obs[i], derivation);
	obs.length = 0;
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