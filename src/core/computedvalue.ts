import {IObservable, reportObserved, removeObserver} from "./observable";
import {IDerivation, trackDerivedFunction, isComputingDerivation, untracked} from "./derivation";
import {globalState} from "./globalstate";
import {getNextId, valueDidChange, invariant, Lambda} from "../utils/utils";
import {autorun} from "../api/autorun";
import {isSpyEnabled, spyReport} from "../core/spy";

/**
 * A node in the state dependency root that observes other nodes, and can be observed itself.
 *
 * Computed values will update automatically if any observed value changes and if they are observed themselves.
 * If a computed value isn't actively used by another observer, but is inspect, it will compute lazily to return at least a consistent value.
 */
export class ComputedValue<T> implements IObservable, IDerivation {
	isLazy = true; // nobody is observing this derived value, so don't bother tracking upstream values
	isComputing = false;
	staleObservers: IDerivation[] = [];
	observers: IDerivation[] = [];      // nodes that are dependent on this node. Will be notified when our state change
	observing: IObservable[] = [];       // nodes we are looking at. Our value depends on these nodes
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
		const prevAllowStateChanges = globalState.allowStateChanges;
		globalState.allowStateChanges = false;

		const res = this.derivation.call(this.scope);

		globalState.allowStateChanges = prevAllowStateChanges;
		this.isComputing = false;
		return res;
	};

	onBecomeObserved() {
		// noop, handled by .get()
	}

	onBecomeUnobserved() {
		for (let i = 0, l = this.observing.length; i < l; i++)
			removeObserver(this.observing[i], this);
		this.observing = [];
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
		invariant(!this.isComputing, `Cycle detected`, this.derivation);
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
				untracked(() => {
					listener(newValue, prevValue);
				});
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
}
