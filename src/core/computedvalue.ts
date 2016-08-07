import {IObservable, reportObserved, propagateMaybeChanged, propagateChangeConfirmed, legacyObservers, startBatch, endBatch, getObservers} from "./observable";
import {IDerivation, trackDerivedFunction, clearObserving, untrackedStart, untrackedEnd, shouldCompute } from "./derivation";
import {globalState} from "./globalstate";
import {allowStateChangesStart, allowStateChangesEnd} from "./action";
import {getNextId, valueDidChange, invariant, Lambda, unique, joinStrings} from "../utils/utils";
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
 * Computed values will update automatically if any observed value changes and if they are observed themselves.
 * If a computed value isn't actively used by another observer, but is inspect, it will compute lazily to return at least a consistent value.
 */
export class ComputedValue<T> implements IObservable, IComputedValue<T>, IDerivation {
	isComputing = false;

	dependenciesState = -1;
	observing = [];       // nodes we are looking at. Our value depends on these nodes
	newObserving = null; // during tracking it's an array with new observed observers

	isPendingUnobservation: boolean; // for effective unobserving
	isObserved = false;
	_observers = [];
	_observersToDelete = [];

	diffValue = 0;
	runId = 0;
	lastAccessedBy = 0;
	lowestObserverState = 0;
	unboundDepsCount = 0;
	protected value: T = undefined;
	name: string;

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
	constructor(public derivation: () => T, private scope: Object, private compareStructural: boolean, name: string) {
		this.name  = name || "ComputedValue@" + getNextId();
	}

	get observers() {
		return legacyObservers(this);
	}

	peek() {
		this.isComputing = true;
		const prevAllowStateChanges = allowStateChangesStart(false);
		const res = this.derivation.call(this.scope);
		allowStateChangesEnd(prevAllowStateChanges);
		this.isComputing = false;
		return res;
	};

	onBecomeStale() {
		propagateMaybeChanged(this);
	}

	onBecomeUnobserved() {
		clearObserving(this);
		this.value = undefined;
	}

	/**
	 * Returns the current value of this computed value.
	 * Will evaluate it's computation first if needed.
	 */
	public get(): T {
		invariant(!this.isComputing, `Cycle detected in computation ${this.name}`, this.derivation);
		startBatch();
		reportObserved(this);
		if (shouldCompute(this)) {
			if (this.trackAndCompute()) {
				propagateChangeConfirmed(this);
			}
		}
		const result = this.value;
		endBatch();
		// we are up to date. Return the value
		return result;
	}

	public recoverFromError() {
		// this.derivation.call(this.scope) in peek returned error, let's run all cleanups, that would be run
		this.isComputing = false;
		endBatch();
	}

	public set(_: T) {
		throw new Error(`[ComputedValue '${name}'] It is not possible to assign a new value to a computed value.`);
	}

	private trackAndCompute(): boolean {
		if (isSpyEnabled()) {
			spyReport({
				object: this,
				type: "compute",
				fn: this.derivation,
				target: this.scope
			});
		}
		const oldValue = this.value;
		const newValue = this.value = trackDerivedFunction(this, this.peek);
		return valueDidChange(this.compareStructural, newValue, oldValue);
	}

	observe(listener: (newValue: T, oldValue: T) => void, fireImmediately?: boolean): Lambda {
		let firstTime = true;
		let prevValue = undefined;
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

  // TODO  change whyRun messages to be adequate to new system???
	whyRun() {
		const isTracking = globalState.derivationStack.length > 0;
		const observing = unique(this.observing).map(dep => dep.name);
		const observers = unique(getObservers(this).map(dep => dep.name));
		const runReason = (
			this.isComputing
				? RunReason.GET
				: RunReason.NOT_RUNNING
		);
		if (runReason === RunReason.GET) {
			const requiredBy = globalState.derivationStack[globalState.derivationStack.length - 2];
			if (requiredBy)
				observers.push(requiredBy.name);
		}

		return (`
WhyRun? computation '${this.name}':
 * Running because: ${runReasonTexts[runReason]} ${(runReason === RunReason.NOT_RUNNING) && this.dependenciesState > 0 ? "(a next run is scheduled)" : ""}
` +
(this.dependenciesState === -1
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

export enum RunReason { GET, NOT_RUNNING }

export const runReasonTexts = {
	[RunReason.GET]: "[get] The value of this computed value was requested",
	[RunReason.NOT_RUNNING]: "[idle] This compution is currently not running"
};
