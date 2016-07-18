import {IObservable, reportObserved, removeObserver} from "./observable";
import {IDerivation, trackDerivedFunction, isComputingDerivation, untrackedStart, untrackedEnd} from "./derivation";
import {globalState} from "./globalstate";
import {allowStateChangesStart, allowStateChangesEnd} from "./action";
import {getNextId, valueDidChange, invariant, Lambda, unique, joinStrings} from "../utils/utils";
import {isSpyEnabled, spyReport} from "../core/spy";
import {autorun} from "../api/autorun";
import {FastSet} from "../utils/set";

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
	isLazy = true; // nobody is observing this derived value, so don't bother tracking upstream values
	isComputing = false;
	staleObservers: IDerivation[] = [];
	observers = new FastSet<IDerivation>();      // nodes that are dependent on this node. Will be notified when our state change
	observing = [];       // nodes we are looking at. Our value depends on these nodes
	diffValue = 0;
	runId = 0;
	laRunId = 0;
	l = 0;
	dependencyChangeCount = 0;     // nr of nodes being observed that have received a new value. If > 0, we should recompute
	dependencyStaleCount = 0;      // nr of nodes being observed that are currently not ready
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

	peek() {
		this.isComputing = true;
		const prevAllowStateChanges = allowStateChangesStart(false);
		const res = this.derivation.call(this.scope);
		allowStateChangesEnd(prevAllowStateChanges);
		this.isComputing = false;
		return res;
	};

	onBecomeObserved() {
		// noop, handled by .get()
	}

	onBecomeUnobserved() {
		this.observing.forEach(dep => removeObserver(dep, this));
		this.observing.splice(0);

		this.isLazy = true;
		this.value = undefined;
	}

	onDependenciesReady(): boolean {
		const changed = this.trackAndCompute();
		return changed;
	}

	/**
	 * Returns the current value of this computed value.
	 * Will evaluate it's computation first if needed.
	 */
	public get(): T {
		invariant(!this.isComputing, `Cycle detected in computation ${this.name}`, this.derivation);
		reportObserved(this);
		if (this.dependencyStaleCount > 0) {
			// This is worst case, somebody is inspecting our value while we are stale.
			// This can happen in two cases:
			// 1) somebody explicitly requests our value during a transaction
			// 2) this computed value is used in another computed value in which it wasn't used
			//    before, and hence it is required now 'too early'. See for an example issue 165.
			// we have no other option than to (possible recursively) forcefully recompute.
			return this.peek();
		}
		if (this.isLazy) {
			if (isComputingDerivation()) {
				// somebody depends on the outcome of this computation
				this.isLazy = false;
				this.trackAndCompute();
			} else {
				// nobody depends on this computable;
				// so just compute fresh value and continue to sleep
				return this.peek();
			}
		}
		// we are up to date. Return the value
		return this.value;
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

	whyRun() {
		const isTracking = globalState.derivationStack.length > 0;
		const observing = unique(this.observing).map(dep => dep.name);
		const observers = unique(this.observers.asArray()).map(dep => dep.name);
		const runReason = (
			this.isComputing
				? isTracking
					? !this.observers.isEmpty() // this computation already had observers
							? RunReason.INVALIDATED
							: RunReason.REQUIRED
					: RunReason.PEEK
				: RunReason.NOT_RUNNING
		);
		if (runReason === RunReason.REQUIRED) {
			const requiredBy = globalState.derivationStack[globalState.derivationStack.length - 2];
			if (requiredBy)
				observers.push(requiredBy.name);
		}

		return (`
WhyRun? computation '${this.name}':
 * Running because: ${runReasonTexts[runReason]} ${(runReason === RunReason.NOT_RUNNING) && this.dependencyStaleCount > 0 ? "(a next run is scheduled)" : ""}
` +
(this.isLazy
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

export enum RunReason { PEEK, INVALIDATED, REQUIRED, NOT_RUNNING }

export const runReasonTexts = {
	[RunReason.PEEK]: "[peek] The value of this computed value was requested outside an reaction",
	[RunReason.INVALIDATED]: "[invalidated] Some observables used by this computation did change",
	[RunReason.REQUIRED]: "[started] This computation is required by another computed value / reaction",
	[RunReason.NOT_RUNNING]: "[idle] This compution is currently not running"
};
