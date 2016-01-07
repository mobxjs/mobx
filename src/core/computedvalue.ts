import {IObservable, reportObserved, removeObserver} from "./observable";
import {IDerivation, trackDerivedFunction} from "./derivation";
import state, {getNextId, isComputingDerivation} from "./global";
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
	protected value: T;
	onSleepEmitter: SimpleEventEmitter;
	boundDerivation:()=>T
	
	// TODO: bind derivation immediately, don't store scope
	constructor(public derivation:()=>T, private scope: Object, public name:string, private compareStructural: boolean) {
		if (!this.name)
			this.name = "DerivedValue#" + this.id;
		this.boundDerivation = () => derivation.call(scope); // TODO: use bind? 
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
		const changed = this.compute(true)
		reportTransition(this, "READY", changed);
		return changed;
	}

	get(): T {
		if (this.isComputing)
			throw new Error(`[DerivedValue '${this.name}'] Cycle detected`);
		if (this.dependencyStaleCount > 0 && state.inTransaction > 0) {
			return this.boundDerivation();
		}
		if (this.isLazy) {
			if (isComputingDerivation()) {
				// somebody depends on the outcome of this computation
				this.isLazy = false;
				this.compute(true);
				reportObserved(this);
			} else {
				// nobody depends on this computable;
				// so just compute fresh value and continue to sleep
				this.compute(false);
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

	compute(track:boolean) {
		var oldValue = this.value;
		this.isComputing = true;
		if (!track)
			this.value = this.boundDerivation();
		else 			
			this.value = trackDerivedFunction(this, this.boundDerivation);
		this.isComputing = false
		return valueDidChange(this.compareStructural, this.value, oldValue)
	}


/* TODO: enable 
	private findCycle(node: DerivedValue<any>):boolean {
		var obs = this.observing;
		if (obs.indexOf(node) !== -1)
			return true;
		for(var l = obs.length, i = 0; i < l; i++)
			if (obs[i] instanceof DerivedValue && (<DerivedValue<any>> obs[i]).findCycle(node))
				return true;
		return false;
	}
*/
	toString() {
		return `ComputedValue[${this.name}:${this.value}]`;
	}
	
		// TODO: remove
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
