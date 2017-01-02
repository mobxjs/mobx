import {IObservable, reportObserved, propagateMaybeChanged, propagateChangeConfirmed, startBatch, endBatch, getObservers} from "./observable";
import {IDerivation, IDerivationState, trackDerivedFunction, clearObserving, untrackedStart, untrackedEnd, shouldCompute, handleExceptionInDerivation} from "./derivation";
import {globalState} from "./globalstate";
import {allowStateChangesStart, allowStateChangesEnd, createAction} from "./action";
import {createInstanceofPredicate, getNextId, valueDidChange, invariant, Lambda, unique, joinStrings} from "../utils/utils";
import {isSpyEnabled, spyReport} from "../core/spy";
import {autorun} from "../api/autorun";

export interface IComputedValue<T> {
	get(): T;
	set(value: T): void;
	observe(listener: (newValue: T, oldValue: T) => void, fireImmediately?: boolean): Lambda;
}

/**
 * A node in the state dependency root that observes other nodes, and can be observed itself.
 *
 * ComputedValue will remember result of the computation for duration of a batch, or being observed
 * During this time it will recompute only when one of it's direct dependencies changed,
 * but only when it is being accessed with `ComputedValue.get()`.
 *
 * Implementation description:
 * 1. First time it's being accessed it will compute and remember result
 *    give back remembered result until 2. happens
 * 2. First time any deep dependency change, propagate POSSIBLY_STALE to all observers, wait for 3.
 * 3. When it's being accessed, recompute if any shallow dependency changed.
 *    if result changed: propagate STALE to all observers, that were POSSIBLY_STALE from the last step.
 *    go to step 2. either way
 *
 * If at any point it's outside batch and it isn't observed: reset everything and go to 1.
 */
export class ComputedValue<T> implements IObservable, IComputedValue<T>, IDerivation {
	dependenciesState = IDerivationState.NOT_TRACKING;
	observing = [];       // nodes we are looking at. Our value depends on these nodes
	newObserving = null; // during tracking it's an array with new observed observers

	isPendingUnobservation: boolean = false;
	observers = [];
	observersIndexes = {};
	diffValue = 0;
	runId = 0;
	lastAccessedBy = 0;
	lowestObserverState = IDerivationState.UP_TO_DATE;
	unboundDepsCount = 0;
	__mapid = "#" + getNextId();
	protected value: T | undefined = undefined;
	name: string;
	isComputing: boolean = false; // to check for cycles
	isRunningSetter: boolean = false;
	setter: (value: T) => void;

	/**
	 * Create a new computed value based on a function expression.
	 *
	 * The `name` property is for debug purposes only.
	 *
	 * The `compareStructural` property indicates whether the return values should be compared structurally.
	 * Normally, a computed value will not notify an upstream observer if a newly produced value is strictly equal to the previously produced value.
	 * However, enabling compareStructural can be convienent if you always produce an new aggregated object and don't want to notify observers if it is structurally the same.
	 * This is useful for working with vectors, mouse coordinates etc.
	 */
	constructor(public derivation: () => T, public scope: Object | undefined, private compareStructural: boolean, name: string, setter?: (v: T) => void) {
		this.name  = name || "ComputedValue@" + getNextId();
		if (setter)
			this.setter = createAction(name + "-setter", setter) as any;
	}

	peek() {
		this.isComputing = true;
		const prevAllowStateChanges = allowStateChangesStart(false);
		const res = this.derivation.call(this.scope);
		allowStateChangesEnd(prevAllowStateChanges);
		this.isComputing = false;
		return res;
	};

	peekUntracked() {
		let hasError = true;
		try {
			const res = this.peek();
			hasError = false;
			return res;
		} finally {
			if (hasError)
				handleExceptionInDerivation(this);
		}

	}

	onBecomeStale() {
		propagateMaybeChanged(this);
	}

	onBecomeUnobserved() {
		invariant(this.dependenciesState !== IDerivationState.NOT_TRACKING, "INTERNAL ERROR only onBecomeUnobserved shouldn't be called twice in a row");
		clearObserving(this);
		this.value = undefined;
	}

	/**
	 * Returns the current value of this computed value.
	 * Will evaluate it's computation first if needed.
	 */
	public get(): T {
		invariant(!this.isComputing, `Cycle detected in computation ${this.name}`, this.derivation);
		if (globalState.inBatch === 0) {
			// just for small optimization, can be droped for simplicity
			// computed called outside of any mobx stuff. batch observing shuold be enough, don't need tracking
			// because it will never be called again inside this batch
			startBatch();
			if (shouldCompute(this))
				this.value = this.peekUntracked();
			endBatch();
		} else {

			reportObserved(this);
			if (shouldCompute(this))
				if (this.trackAndCompute())
					propagateChangeConfirmed(this);

		}
		const result = this.value!;

		return result;
	}

	public recoverFromError() {
		// this.derivation.call(this.scope) in peek returned error, let's run all cleanups, that would be run
		// note that resetGlobalState will run afterwards
		this.isComputing = false;
	}

	public set(value: T) {
		if (this.setter) {
			invariant(!this.isRunningSetter, `The setter of computed value '${this.name}' is trying to update itself. Did you intend to update an _observable_ value, instead of the computed property?`);
			this.isRunningSetter = true;
			try {
				this.setter.call(this.scope, value);
			} finally {
				this.isRunningSetter = false;
			}
		}
		else
			invariant(false, `[ComputedValue '${this.name}'] It is not possible to assign a new value to a computed value.`);
	}

	private trackAndCompute(): boolean {
		if (isSpyEnabled()) {
			spyReport({
				object: this.scope,
				type: "compute",
				fn: this.derivation
			});
		}
		const oldValue = this.value;
		const newValue = this.value = trackDerivedFunction(this, this.peek);
		return valueDidChange(this.compareStructural, newValue, oldValue);
	}

	observe(listener: (newValue: T, oldValue: T | undefined) => void, fireImmediately?: boolean): Lambda {
		let firstTime = true;
		let prevValue: T | undefined = undefined;
		return autorun(() => {
			let newValue = this.get();
			if (!firstTime || fireImmediately) {
				const prevU = untrackedStart();
				listener(newValue, prevValue);
				untrackedEnd(prevU);
			}
			firstTime = false;
			prevValue = newValue;
		});
	}

	toJSON() {
		return this.get();
	}

	toString() {
		return `${this.name}[${this.derivation.toString()}]`;
	}

	whyRun() {
		const isTracking = Boolean(globalState.trackingDerivation);
		const observing = unique(this.isComputing ? this.newObserving! : this.observing).map((dep: any) => dep.name);
		const observers = unique(getObservers(this).map(dep => dep.name));
		return (`
WhyRun? computation '${this.name}':
 * Running because: ${isTracking ? "[active] the value of this computation is needed by a reaction" : this.isComputing ? "[get] The value of this computed was requested outside a reaction" : "[idle] not running at the moment"}
` +
(this.dependenciesState === IDerivationState.NOT_TRACKING
?
` * This computation is suspended (not in use by any reaction) and won't run automatically.
	Didn't expect this computation to be suspended at this point?
	  1. Make sure this computation is used by a reaction (reaction, autorun, observer).
	  2. Check whether you are using this computation synchronously (in the same stack as they reaction that needs it).
`
:
` * This computation will re-run if any of the following observables changes:
    ${joinStrings(observing)}
    ${(this.isComputing && isTracking) ? " (... or any observable accessed during the remainder of the current run)" : ""}
	Missing items in this list?
	  1. Check whether all used values are properly marked as observable (use isObservable to verify)
	  2. Make sure you didn't dereference values too early. MobX observes props, not primitives. E.g: use 'person.name' instead of 'name' in your computation.
  * If the outcome of this computation changes, the following observers will be re-run:
    ${joinStrings(observers)}
`
)
		);
	}
}

export const isComputedValue = createInstanceofPredicate("ComputedValue", ComputedValue);
