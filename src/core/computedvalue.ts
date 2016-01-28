import {IObservable, reportObserved, removeObserver} from "./observable";
import {IDerivation, trackDerivedFunction} from "./derivation";
import globalState, {getNextId, isComputingDerivation} from "./global";
import SimpleEventEmitter from "../simpleeventemitter";
import {autorun, ValueMode, getValueModeFromValue, makeChildObservable, assertUnwrapped, valueDidChange} from '../core';
import {Lambda} from "../interfaces";
import {invariant} from "../utils";
import {reportTransition} from "../extras";

/**
 * A node in the state dependency root that observes other nodes, and can be observed itself.
 */
export default class ComputedValue<T> implements IObservable, IDerivation {
	id = getNextId();
	isLazy = true; // nobody is observing this derived value, so don't bother tracking upstream values
	isComputing = false;
	hasCycle = false;  // this node is part of a cycle, which is an error
	observers: IDerivation[] = [];       // nodes that are dependent on this node. Will be notified when our state change
	observing: IObservable[] = [];       // nodes we are looking at. Our value depends on these nodes
	dependencyChangeCount = 0;     // nr of nodes being observed that have received a new value. If > 0, we should recompute
	dependencyStaleCount = 0;      // nr of nodes being observed that are currently not ready
	protected value: T = undefined;
	onSleepEmitter: SimpleEventEmitter =  null;;
	peek:()=>T;
	
	constructor(public derivation:()=>T, private scope: Object, public name:string, private compareStructural: boolean) {
		if (!this.name)
			this.name = "DerivedValue#" + this.id;
		this.peek = () => {
			this.isComputing = true;
			globalState.isComputingComputedValue++;
			const prevAllowStateChanges = globalState.allowStateChanges;
			globalState.allowStateChanges = false;
			
			const res = derivation.call(scope);
			
			globalState.allowStateChanges = prevAllowStateChanges;
			globalState.isComputingComputedValue--;
			this.isComputing = false
			return res;
		} 
	}

	onBecomeObserved() {
		// noop, handled by .get()
	}
	
	onBecomeUnobserved() {
		for (var i = 0, l = this.observing.length; i < l; i++)
			removeObserver(this.observing[i], this);
		this.observing = [];
		this.isLazy = true;
		if (this.onSleepEmitter)
			this.onSleepEmitter.emit(this.value);
		this.value = undefined;
	}

	onDependenciesReady(): boolean {
		const changed = this.trackAndCompute()
		reportTransition(this, "READY", changed);
		return changed;
	}

	get(): T {
		if (this.isComputing)
			throw new Error(`[DerivedValue '${this.name}'] Cycle detected`);
		if (this.dependencyStaleCount > 0 && globalState.inTransaction > 0) {
			// somebody is inspecting this computed value while being stale (because it is in a transaction)
			// so peek into the value
			return this.peek();
		}
		if (this.isLazy) {
			if (isComputingDerivation()) {
				// somebody depends on the outcome of this computation
				this.isLazy = false;
				this.trackAndCompute();
				reportObserved(this);
			} else {
				// nobody depends on this computable;
				// so just compute fresh value and continue to sleep
				return this.peek();
				// TODO: this.value should be cleaned up again!
			}
		} else {
			// we are already up to date, somebody is just inspecting our current value
			reportObserved(this);
		}
	
		if (this.hasCycle) // TODO: is this check needed? and for which branches? otherwise this function can be simpler
			throw new Error(`[DerivedValue '${this.name}'] Cycle detected`);
		return this.value;
	}
	
	set(_) {
		throw new Error(`[DerivedValue '${name}'] View functions do not accept new values`);
	}

    public onceSleep(onSleep: (lastValue:any) => void) {
        if (this.onSleepEmitter === null)
            this.onSleepEmitter = new SimpleEventEmitter();
        this.onSleepEmitter.once(onSleep);
    }

	trackAndCompute(): boolean {
		var oldValue = this.value;
		this.value = trackDerivedFunction(this, this.peek);
		return valueDidChange(this.compareStructural, this.value, oldValue)
	}

	toString() {
		return `ComputedValue[${this.name}]`;
	}
	
		// TODO: refactor to mobservable.observe
	observe(listener:(newValue:T, oldValue:T)=>void, fireImmediately=false):Lambda {
		let firstTime = true;
		let prevValue = undefined;
		return autorun(() => {
			var newValue = this.get();
			if (!firstTime || fireImmediately) {
				listener(newValue, prevValue);
			}
			firstTime = false;
			prevValue = newValue;
		});
	}
}
