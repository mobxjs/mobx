import {IObservable, IDepTreeNode, addObserver, removeObserver, endBatch} from "./observable";
import {globalState, resetGlobalState} from "./globalstate";
import {invariant} from "../utils/utils";
import {isSpyEnabled, spyReport} from "./spy";
import {isComputedValue} from "./computedvalue";

export enum IDerivationState {
	// before being run or (outside batch and not being observed)
	// at this point derivation is not holding any data about dependency tree
	NOT_TRACKING = -1,
	// no shallow dependency changed since last computation
	// won't recalculate derivation
	// this is what makes mobx fast
	UP_TO_DATE = 0,
	// some deep dependency changed, but don't know if shallow dependency changed
	// will require to check first if UP_TO_DATE or POSSIBLY_STALE
	// currently only ComputedValue will propagate POSSIBLY_STALE
	//
	// having this state is second big optimization:
	// don't have to recompute on every dependency change, but only when it's needed
	POSSIBLY_STALE = 1,
	// shallow dependency changed
	// will need to recompute when it's needed
	STALE = 2
}

/**
 * A derivation is everything that can be derived from the state (all the atoms) in a pure manner.
 * See https://medium.com/@mweststrate/becoming-fully-reactive-an-in-depth-explanation-of-mobservable-55995262a254#.xvbh6qd74
 * TODO: the one above is outdated, new one?
 */
export interface IDerivation extends IDepTreeNode {
	observing: IObservable[];
	newObserving: IObservable[];
	dependenciesState: IDerivationState;
	/**
	 * Id of the current run of a derivation. Each time the derivation is tracked
	 * this number is increased by one. This number is globally unique
	 */
	runId: number;
	/**
	 * amount of dependencies used by the derivation in this run, which has not been bound yet.
	 */
	unboundDepsCount: number;
	__mapid: string;
	onBecomeStale();
	recoverFromError(); // TODO: revisit implementation of error handling
}

/**
 * Finds out wether any dependency of derivation actually changed
 * If dependenciesState is 1 it will recalculate dependencies,
 * if any dependency changed it will propagate it by changing dependenciesState to 2.
 *
 * By iterating over dependencies in the same order they were reported and stoping on first change
 * all recalculations are called only for ComputedValues that will be tracked anyway by derivation.
 * That is because we assume that if first x dependencies of derivation doesn't change
 * than derivation shuold run the same way up until accessing x-th dependency.
 */
export function shouldCompute(derivation: IDerivation): boolean {
	switch (derivation.dependenciesState) {
		case IDerivationState.UP_TO_DATE: return false;
		case IDerivationState.NOT_TRACKING: case IDerivationState.STALE: return true;
		case IDerivationState.POSSIBLY_STALE: {
			let hasError = true;
			const prevUntracked = untrackedStart(); // no need for those computeds to be reported, they will be picked up in trackDerivedFunction.
			try {
				const obs = derivation.observing, l = obs.length;
				for (let i = 0; i < l; i++) {
					const obj = obs[i];
					if (isComputedValue(obj)) {
						obj.get();
						// if ComputedValue `obj` actually changed it will be computed and propagated to its observers.
						// and `derivation` is an observer of `obj`
						if (derivation.dependenciesState === IDerivationState.STALE) {
							hasError = false;
							untrackedEnd(prevUntracked);
							return true;
						}
					}
				}
				hasError = false;
				changeDependenciesStateTo0(derivation);
				untrackedEnd(prevUntracked);
				return false;
			} finally {
				if (hasError) {
					changeDependenciesStateTo0(derivation);
				}
			}
		}
	}
}

export function isComputingDerivation() {
	return globalState.trackingDerivation !== null; // filter out actions inside computations
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
	changeDependenciesStateTo0(derivation);
	derivation.newObserving = new Array(derivation.observing.length + 100);
	derivation.unboundDepsCount = 0;
	derivation.runId = ++globalState.runId;
	const prevTracking = globalState.trackingDerivation;
	globalState.trackingDerivation = derivation;
	let hasException = false;
	let result: T;
	try {
		result = f.call(derivation);
	} catch(e){
		hasException = true;
		handleExceptionInDerivation(derivation, e);
		throw e;
	} finally {
		if (!hasException) {
			globalState.trackingDerivation = prevTracking;
			bindDependencies(derivation);
		}
	}
	return result;
}

export function handleExceptionInDerivation(derivation: IDerivation, cause?:Error) {
	const message = (
		`[mobx] An uncaught exception occurred while calculating your computed value, autorun or transformer. Or inside the render() method of an observer based React component. ` +
		`These functions should never throw exceptions as MobX will not always be able to recover from them. ` +
		`Please fix the error reported after this message or enable 'Pause on (caught) exceptions' in your debugger to find the root cause. In: '${derivation.name}'. ` +
		`For more details see https://github.com/mobxjs/mobx/issues/462`
	);
	if (isSpyEnabled()) {
		spyReport({
			type: "error",
			message,
			cause
		});
	}
	console.warn(message); // In next major, maybe don't emit this message at all?
	// Poor mans recovery attempt
	// Assumption here is that this is the only exception handler in MobX.
	// So functions higher up in the stack (like transanction) won't be modifying the globalState anymore after this call.
	// (Except for other trackDerivedFunction calls of course, but that is just)
	changeDependenciesStateTo0(derivation);
	derivation.newObserving = null;
	derivation.unboundDepsCount = 0;
	derivation.recoverFromError();
	// close current batch, make sure pending unobservations are executed
	endBatch();
	resetGlobalState();
}

/**
 * diffs newObserving with obsering.
 * update observing to be newObserving with unique observables
 * notify observers that become observed/unobserved
 */
function bindDependencies(derivation: IDerivation) {
	// invariant(derivation.dependenciesState !== IDerivationState.NOT_TRACKING, "INTERNAL ERROR bindDependencies expects derivation.dependenciesState !== -1");

	const prevObserving = derivation.observing;
	const observing = derivation.observing = derivation.newObserving;

	derivation.newObserving = null; // newObserving shouldn't be needed outside tracking

	// Go through all new observables and check diffValue: (this list can contain duplicates):
	//   0: first occurence, change to 1 and keep it
	//   1: extra occurence, drop it
	let i0 = 0, l = derivation.unboundDepsCount;
	for (let i = 0; i < l; i++) {
		const dep = observing[i];
		if (dep.diffValue === 0) {
			dep.diffValue = 1;
			if (i0 !== i) observing[i0] = dep;
			i0++;
		}
	}
	observing.length = i0;

	// Go through all old observables and check diffValue: (it is unique after last bindDependencies)
	//   0: it's not in new observables, unobserve it
	//   1: it keeps being observed, don't want to notify it. change to 0
	l = prevObserving.length;
	while (l--) {
		const dep = prevObserving[l];
		if (dep.diffValue === 0) {
			removeObserver(dep, derivation);
		}
		dep.diffValue = 0;
	}

	// Go through all new observables and check diffValue: (now it should be unique)
	//   0: it was set to 0 in last loop. don't need to do anything.
	//   1: it wasn't observed, let's observe it. set back to 0
	while (i0--) {
		const dep = observing[i0];
		if (dep.diffValue === 1) {
			dep.diffValue = 0;
			addObserver(dep, derivation);
		}
	}
}

export function clearObserving(derivation: IDerivation) {
	// invariant(globalState.inBatch > 0, "INTERNAL ERROR clearObserving should be called only inside batch");
	const obs = derivation.observing;
	let i = obs.length;
	while (i--)
		removeObserver(obs[i], derivation);

	derivation.dependenciesState = IDerivationState.NOT_TRACKING;
	obs.length = 0;
}

export function untracked<T>(action: () => T): T {
	const prev = untrackedStart();
	const res = action();
	untrackedEnd(prev);
	return res;
}

export function untrackedStart(): IDerivation {
	const prev = globalState.trackingDerivation;
	globalState.trackingDerivation = null;
	return prev;
}

export function untrackedEnd(prev: IDerivation) {
	globalState.trackingDerivation = prev;
}

/**
 * needed to keep `lowestObserverState` correct. when changing from (2 or 1) to 0
 *
 */
export function changeDependenciesStateTo0(derivation: IDerivation) {
	if (derivation.dependenciesState === IDerivationState.UP_TO_DATE) return;
	derivation.dependenciesState = IDerivationState.UP_TO_DATE;

	const obs = derivation.observing;
	let i = obs.length;
	while (i--)
		obs[i].lowestObserverState = IDerivationState.UP_TO_DATE;
}
