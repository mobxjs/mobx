import {IObservable, reportObserved, propagateMaybeChanged, propagateChangeConfirmed, startBatch, endBatch, getObservers} from "./observable";
import {IDerivation, IDerivationState, trackDerivedFunction, clearObserving, untrackedStart, untrackedEnd, shouldCompute, CaughtException, isCaughtException} from "./derivation";
import {globalState} from "./globalstate";
import {createAction} from "./action";
import {createInstanceofPredicate, getNextId, valueDidChange, invariant, Lambda, unique, joinStrings, primitiveSymbol, toPrimitive} from "../utils/utils";
import {isSpyEnabled, spyReport} from "./spy";
import {autorun} from "../api/autorun";
import {IValueDidChange} from "../types/observablevalue";
import {getMessage} from "../utils/messages";


export interface IComputedValue<T> {
	get(): T;
	set(value: T): void;
	observe(listener: (change: IValueDidChange<T>) => void, fireImmediately?: boolean): Lambda;
}

/**
 * A node in the state dependency root that observes other nodes, and can be observed itself.
 *
 * ComputedValue will remember result of the computation for duration of a batch, or being observed
 * During this time it will recompute only when one of its direct dependencies changed,
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
	protected value: T | undefined | CaughtException = undefined;
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
	 * However, enabling compareStructural can be convenient if you always produce an new aggregated object and don't want to notify observers if it is structurally the same.
	 * This is useful for working with vectors, mouse coordinates etc.
	 */
	constructor(public derivation: () => T, public scope: Object | undefined, private compareStructural: boolean, name: string, setter?: (v: T) => void) {
		this.name  = name || "ComputedValue@" + getNextId();
		if (setter)
			this.setter = createAction(name + "-setter", setter) as any;
	}

	onBecomeStale() {
		propagateMaybeChanged(this);
	}

	onBecomeUnobserved() {
		clearObserving(this);
		this.value = undefined;
	}

	/**
	 * Returns the current value of this computed value.
	 * Will evaluate its computation first if needed.
	 */
	public get(): T {
		invariant(!this.isComputing, `Cycle detected in computation ${this.name}`, this.derivation);
		if (globalState.inBatch === 0) {
			// just for small optimization, can be droped for simplicity
			// computed called outside of any mobx stuff. batch observing shuold be enough, don't need tracking
			// because it will never be called again inside this batch
			startBatch();
			if (shouldCompute(this))
				this.value = this.computeValue(false);
			endBatch();
		} else {
			reportObserved(this);
			if (shouldCompute(this))
				if (this.trackAndCompute())
					propagateChangeConfirmed(this);
		}
		const result = this.value!;

		if (isCaughtException(result))
			throw result.cause;
		return result;
	}

	public peek(): T {
		const res = this.computeValue(false);
		if (isCaughtException(res))
			throw res.cause;
		return res;
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
		const newValue = this.value = this.computeValue(true);
		return isCaughtException(newValue) || valueDidChange(this.compareStructural, newValue, oldValue);
	}

	computeValue(track: boolean) {
		this.isComputing = true;
		globalState.computationDepth++;
		let res: T | CaughtException;
		if (track) {
			res = trackDerivedFunction(this, this.derivation, this.scope);
		} else {
			try {
				res = this.derivation.call(this.scope);
			} catch (e) {
				res = new CaughtException(e);
			}
		}
		globalState.computationDepth--;
		this.isComputing = false;
		return res;
	};

	observe(listener: (change: IValueDidChange<T>) => void, fireImmediately?: boolean): Lambda {
		let firstTime = true;
		let prevValue: T | undefined = undefined;
		return autorun(() => {
			let newValue = this.get();
			if (!firstTime || fireImmediately) {
				const prevU = untrackedStart();
				listener({
					type: "update",
					object: this,
					newValue,
					oldValue: prevValue
				});
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

	valueOf(): T {
		return toPrimitive(this.get());
	};

	whyRun() {
		const isTracking = Boolean(globalState.trackingDerivation);
		const observing = unique(this.isComputing ? this.newObserving! : this.observing).map((dep: any) => dep.name);
		const observers = unique(getObservers(this).map(dep => dep.name));
		return (`
WhyRun? computation '${this.name}':
 * Running because: ${isTracking ? "[active] the value of this computation is needed by a reaction" : this.isComputing ? "[get] The value of this computed was requested outside a reaction" : "[idle] not running at the moment"}
` +
(this.dependenciesState === IDerivationState.NOT_TRACKING ? getMessage("m032")  :
` * This computation will re-run if any of the following observables changes:
    ${joinStrings(observing)}
    ${(this.isComputing && isTracking) ? " (... or any observable accessed during the remainder of the current run)" : ""}
	${getMessage("m038")}

  * If the outcome of this computation changes, the following observers will be re-run:
    ${joinStrings(observers)}
`
)
		);
	}
}

ComputedValue.prototype[primitiveSymbol()] = ComputedValue.prototype.valueOf;

export const isComputedValue = createInstanceofPredicate("ComputedValue", ComputedValue);
