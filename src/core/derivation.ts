import {IObservable, IDepTreeNode, addObserver, removeObserver} from "./observable";
import {globalState, resetGlobalState} from "./globalstate";
import {invariant} from "../utils/utils";
import {isSpyEnabled, spyReport} from "./spy";
import {ISetEntry} from "../utils/set";
import {ComputedValue} from "./computedvalue";

/**
 * A derivation is everything that can be derived from the state (all the atoms) in a pure manner.
 * See https://medium.com/@mweststrate/becoming-fully-reactive-an-in-depth-explanation-of-mobservable-55995262a254#.xvbh6qd74
 */
export interface IDerivation extends IDepTreeNode, ISetEntry {
	observing: IObservable[];
	newObserving: IObservable[];
	/**
	 * Describes state of observing dependencies to know whet it's needed to rerun
	 * -1 <- not tracking dependencies
	 * 0 <- all up to date
	 * 1 <- some dependencies might have changed
	 * 2 <- for sure dependency changed
	 */
	dependenciesState: number;
	/**
	 * Id of the current run of a derivation. Each time the derivation is tracked
	 * this number is increased by one. This number is globally unique
	 */
	runId: number;
	/**
	 * amount of dependencies used by the derivation in this run, which has not been bound yet.
	 */
	unboundDepsCount: number;
	onBecomeStale();
	recoverFromError();
}

export function shouldCompute(derivation: IDerivation): boolean {
	const dependenciesState = derivation.dependenciesState;
	if (dependenciesState === 0) return false;
	if (dependenciesState === -1 || dependenciesState === 2) return true;
	// derivation.dependencyChange === 1
	for (let i = 0; i < derivation.observing.length; i++) {
		const obj = derivation.observing[i];
		if (obj instanceof ComputedValue) {
			obj.get();
			if (derivation.dependenciesState === 2) return true;
		}
	}
	changeDependenciesState(0, derivation);
	return false;
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
 * Executes the provided function `f` and tracks which observables are being accessed.
 * The tracking information is stored on the `derivation` object and the derivation is registered
 * as observer of any of the accessed observables.
 */
export function trackDerivedFunction<T>(derivation: IDerivation, f: () => T) {
	// pre allocate array allocation + room for variation in deps
	// array will be trimmed by bindDependencies
	let prevDependenciesState = derivation.dependenciesState
	if (prevDependenciesState !== 0) {
		changeDependenciesState(0, derivation);
	}
	derivation.newObserving = new Array(derivation.observing.length + 100);
	derivation.unboundDepsCount = 0;
	derivation.runId = ++globalState.runId;
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
			derivation.dependenciesState = prevDependenciesState;
			derivation.newObserving = null;
			derivation.unboundDepsCount = 0;
			derivation.recoverFromError();
			resetGlobalState();
		} else {
			// if (derivation.dependenciesState !== 0) {
			// 	changeDependenciesState(0, derivation);
			// }
			globalState.isTracking = prevTracking;
			globalState.derivationStack.length -= 1;
			bindDependencies(derivation);
		}
	}
	return result;
}

function bindDependencies(derivation: IDerivation) {
	const prevObserving = derivation.observing;
	const prevLength = prevObserving.length;
	// trim and determina new observing length
	const observing = derivation.observing = derivation.newObserving;
	const observingLength = observing.length = derivation.unboundDepsCount;

	// derivation.observing should be unique to avoid weird corner cases
	const uniqueObserving = derivation.observing = [];
	derivation.newObserving = null; // <- newObserving shouldn't be outside tracking

	// Idea of this algorithm is start with marking all observables in observing and prevObserving with weight 0
	// After that all prevObserving weights are decreased with -1
	// And all new observing are increased with +1.
	// After that holds: 0 = old dep that is still in use, -1 = old dep, no longer in use, +1 = (seemingly) new dep, was not in use before

	// This process is optimized by making sure deps are always left 'clean', with value 0, so that they don't need to be reset at the start of this process
	// after that, all prevObserving items are marked with -1 directly, instead of 0 and doing -- after that
	for (let i = 0; i < observingLength; i++) {
		const dep = observing[i];
		if ((++dep.diffValue) === 1) {
			uniqueObserving.push(dep);
		}
	}

	// further the -1 and removeObserver can be done in one go.
	for (let i = 0; i < prevLength; i++) {
		const dep = prevObserving[i];
		if (--prevObserving[i].diffValue === -1) {
			dep.diffValue = 0; // this also short circuits add if a dep is multiple times in the observing list
			removeObserver(dep, derivation);
		}
	}

	for (let i = 0; i < uniqueObserving.length; i++) {
		const dep = uniqueObserving[i];
		if (dep.diffValue > 0) {
			dep.diffValue = 0; // this also short circuits add if a dep is multiple times in the observing list
			addObserver(dep, derivation);
		}
	}
}

export function clearObserving(derivation: IDerivation) {
	const obs = derivation.observing;
	const l = obs.length;
	for (let i = 0; i < l; i++)
		removeObserver(obs[i], derivation);
	derivation.dependenciesState = -1;
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

export function changeDependenciesState(targetState, derivation: IDerivation) {
	const oldState = derivation.dependenciesState;
	if (oldState === targetState) return;
	derivation.dependenciesState = targetState;
	const obs = derivation.observing;
	const l = obs.length;

	const m = derivation.__mapid;

	// just because it can be bottleneck
	if (oldState === 0) {
		if (targetState === 2)
			for (let i = 0; i < l; i++) {
				const o = obs[i];
				delete o.observers.data0[m];
				o.observers.data2[m] = derivation;
			}
		else // targetState === 1
			for (let i = 0; i < l; i++) {
				const o = obs[i];
				delete o.observers.data0[m];
				o.observers.data1[m] = derivation;
			}
	}
	else if (oldState === 1) {
		if (targetState === 2)
			for (let i = 0; i < l; i++) {
				const o = obs[i];
				delete o.observers.data1[m];
				o.observers.data2[m] = derivation;
			}
		else // targetState === 0
			for (let i = 0; i < l; i++) {
				const o = obs[i];
				delete o.observers.data1[m];
				o.observers.data0[m] = derivation;
			}
	}
	else { // oldState === 2
		if (targetState === 0)
			for (let i = 0; i < l; i++) {
				const o = obs[i];
				delete o.observers.data2[m];
				o.observers.data0[m] = derivation;
			}
		else // targetState === 1
			for (let i = 0; i < l; i++) {
				const o = obs[i];
				delete o.observers.data2[m];
				o.observers.data1[m] = derivation;
			}
	}
}
