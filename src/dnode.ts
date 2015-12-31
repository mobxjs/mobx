/**
* mobservable
* (c) 2015 - Michel Weststrate
* https://github.com/mweststrate/mobservable
*/

declare const global: any;

/**
 * Backward compatibility check
 */
if (global.__mobservableTrackingStack)
	throw new Error("[mobservable] An incompatible version of mobservable is already loaded.");



// list of IObservables being observed by the currently ongoing computation
global.__mobservableViewStack = [];

function markObservableAsObserved(observable: IObservable) {
	const ts = global.__mobservableViewStack, l = ts.length;
	if (l > 0) {
		const deps = ts[l - 1].observing, depslength = deps.length;
		// this last item added check is an optimization especially for array loops,
		// because an array.length read with subsequent reads from the array
		// might trigger many observed events, while just checking the latest added items is cheap
		if (deps[depslength - 1] !== observable && deps[depslength - 2] !== observable)
			deps[depslength] = observable;
	}
}

// TODO: this, transaction stuff etc is global state which should be shared with concurrently loaded mobservable impls.
let mobservableId = 0;
let inTransaction = 0;
const changedValues : ObservableValue<any>[] = [];
const afterTransactionItems: {():void}[] = [];

/**
* During a transaction no views are updated until the end of the transaction.
* The transaction will be run synchronously nonetheless.
* @param action a function that updates some reactive state
* @returns any value that was returned by the 'action' parameter.
*/
export function transaction<T>(action: () => T, thisArg?): T {
	inTransaction += 1;
	try {
		return action.call(thisArg);
	} finally {
		if (--inTransaction === 0) {
			const values = changedValues.splice(0);
			for (var i = 0, l = values.length; i < l; i++)
				values[i].reportReady();

			const actions = afterTransactionItems.splice(0);
			for (var i = 0, l = actions.length; i < l; i++)
				actions[i]();
		}
	}
}

// TODO: what is this good for?
export function runAfterTransaction(action: () => void) {
	if (inTransaction === 0)
		action();
	else
		afterTransactionItems.push(action);
}

function notifyObservers(observable:IObservable, valueDidActuallyChange:boolean) {
	var os = observable.observers.slice();
	for(var l = os.length, i = 0; i < l; i++)
		os[i].notifyStateChange(observable, valueDidActuallyChange);
}

export interface IObservable {
	id: number;
	name: string;
	isReady: boolean;
	setRefCount(delta: number);
	addObserver(node: IObserver);
	removeObserver(node: IObserver);
	notifyObserved();
	observers: IObserver[];
	externalRefenceCount: number;
}

export interface IObserver {
	id: number;
	name: string;
	notifyStateChange(observable: IObservable, valueDidChange: boolean);
}

export class ObservableValue<T> implements IObservable {
	id = ++mobservableId;
	isReady = true;
	observers: IObserver[] = [];       // nodes that are dependent on this node. Will be notified when our state change
	externalRefenceCount = 0;      // nr of 'things' that depend on us, excluding other DNode's. If > 0, this node will not go to sleep
	staleCount = 0;
	hasUnreportedChange = false;

	protected changeEvent = new SimpleEventEmitter(); // TODO: create lazily
	protected value: T;
	
	constructor(value:T, protected mode:ValueMode, public name?: string){
		if (!name)
			this.name = "ObservableValue#" + this.id;
		const [childmode, unwrappedValue] = getValueModeFromValue(value, ValueMode.Recursive);
		// If the value mode is recursive, modifiers like 'structure', 'reference', or 'flat' could apply
		if (this.mode === ValueMode.Recursive)
			this.mode = childmode;
		this.value = makeChildObservable(unwrappedValue, this.mode, this.name);
	}
	
	setRefCount(delta: number) {
		this.externalRefenceCount += delta;
	}

	addObserver(node: IObserver) {
		this.observers[this.observers.length] = node;
	}

	removeObserver(node: IObserver) {
		var obs = this.observers, idx = obs.indexOf(node);
		if (idx !== -1)
			obs.splice(idx, 1);
	}

	markStale() {
		this.isReady = false;
		if (++this.staleCount === 1) {
			if (transitionTracker)
				reportTransition(this, "STALE");
			notifyObservers(this, false);
		}
	}
	
	markReady(valueDidActuallyChange: boolean) {
		if (this.staleCount === 0)
			throw new Error("illegal state");
		this.hasUnreportedChange = this.hasUnreportedChange || valueDidActuallyChange;
		if (--this.staleCount === 0) {
			if (inTransaction > 0)
				changedValues.push(this);
			else
				this.reportReady();
		}
	}

	reportReady() {
		this.isReady = true;
		if (transitionTracker)
			reportTransition(this, "READY", true, this.value);
		notifyObservers(this, this.hasUnreportedChange);
		this.hasUnreportedChange = false;
	}

	set(newValue:T) {
		assertUnwrapped(newValue, "Modifiers cannot be used on non-initial values.");
		// TODO: check if derived value is running (not reactor)
		checkIfStateIsBeingModifiedDuringView(this.name);
		var oldValue = this.value;
		const changed = valueDidChange(this.mode === ValueMode.Structure, oldValue, newValue);
		if (changed) {
			this.markStale();
			this.value = makeChildObservable(newValue, this.mode, this.name);
			this.markReady(true);
			this.changeEvent.emit(this.value, oldValue);
		}
	}
	
	get():T {
		this.notifyObserved();
		return this.value;
	}
	
	notifyObserved() {
		markObservableAsObserved(this);
	}
	
	observe(listener:(newValue:T, oldValue:T)=>void, fireImmediately=false):Lambda {
		if (fireImmediately)
			listener(this.get(), undefined);
		return this.changeEvent.on(listener);
	}
	
	toString() {
		return `ObservableValue[${this.name}:${this.value}]`;
	}
}



/**
 * A node in the state dependency root that observes other nodes, and can be observed itself.
 */
export class DerivedValue<T> implements IObservable, IObserver {
	id = ++mobservableId;
	isReady = true;
	isLazy = true; // nobody is observing this derived value, so don't bother tracking upstream values
	isComputing = false;
	hasCycle = false;  // this node is part of a cycle, which is an error
	observers: IObserver[] = [];       // nodes that are dependent on this node. Will be notified when our state change
	observing: IObservable[] = [];       // nodes we are looking at. Our value depends on these nodes
	private prevObserving: IObservable[] = null; // nodes we were looking at before. Used to determine changes in the dependency tree
	private dependencyChangeCount = 0;     // nr of nodes being observed that have received a new value. If > 0, we should recompute
	private dependencyStaleCount = 0;      // nr of nodes being observed that are currently not ready
	protected isDisposed = false;            // ready to be garbage collected. Nobody is observing or ever will observe us // TODO: remove?
	externalRefenceCount = 0;      // nr of 'things' that depend on us, excluding other DNode's. If > 0, this node will not go to sleep
	protected changeEvent = new SimpleEventEmitter(); // TODO: initialize lazily
	protected value: T;
	onSleepEmitter: SimpleEventEmitter;

	// TODO: bind derivation immediately, don't store scope
	constructor(protected derivation:()=>T, private scope: Object, public name:string, private compareStructural: boolean) {
		if (!this.name)
			this.name = "DerivedValue#" + this.id;
	}
	
	addObserver(node: IObserver) {
		this.observers[this.observers.length] = node;
	}

	removeObserver(node:IObserver) {
		var obs = this.observers, idx = obs.indexOf(node);
		if (idx !== -1)
			obs.splice(idx, 1);
		this.tryToSleep();
	}
	
	setRefCount(delta:number) {
		var rc = this.externalRefenceCount += delta;
		if (rc === 0)
			this.tryToSleep();
		else if (rc === delta) // a.k.a. rc was zero.
			this.wakeUp();
	}

	markStale() {
		this.isReady = false;
		if (transitionTracker)
			reportTransition(this, "STALE");
		notifyObservers(this, false);
	}
	
	markReady(stateDidActuallyChange:boolean) {
		this.isReady = true;
		if (transitionTracker)
			reportTransition(this, "READY", true, this.value);
		notifyObservers(this, stateDidActuallyChange);
	}

	get(): T {
		if (this.isComputing)
			throw new Error(`[DerivedValue '${this.name}'] Cycle detected`);
		if (!this.isReady && inTransaction > 0) {
			// in-transaction lazy inspection of the value, derive on the fly..
			return this.derivation.call(this.scope);
		}
		if (this.isLazy) {
			if (isComputingView()) {
				// somebody depends on the outcome of this computation
				this.wakeUp(); // note: wakeup triggers a compute if needed
				markObservableAsObserved(this);
			} else {
				// nobody depends on this computable;
				// so just compute fresh value and continue to sleep
				this.compute(false, false);
			}
		} else {
			// we are already up to date, somebody is just inspecting our current value
			markObservableAsObserved(this);
		}
	
		if (this.hasCycle) // TODO: is this check needed? and for which branches? otherwise this function can be simpler
			throw new Error(`[DerivedValue '${this.name}'] Cycle detected`);
		return this.value;
	}
	
	set(x) {
		throw new Error(`[DerivedValue '${name}'] View functions do not accept new values`);
	}

	tryToSleep() {
		if (!this.isLazy && this.observers.length === 0 && this.externalRefenceCount === 0) {
			for (var i = 0, l = this.observing.length; i < l; i++)
				this.observing[i].removeObserver(this);
			this.observing = [];
			this.isLazy = true;
			if (this.onSleepEmitter)
				this.onSleepEmitter.emit(this.value);
			this.value = undefined;
		}
	}

    public onceSleep(onSleep: (lastValue:any) => void) {
        if (this.onSleepEmitter === null)
            this.onSleepEmitter = new SimpleEventEmitter();
        this.onSleepEmitter.once(onSleep);
    }

	wakeUp() {
		if (this.isLazy) {
			this.isLazy = false;
			this.compute(true, false);
		}
	}

	// the state of something we are observing has changed..
	notifyStateChange(observable:IObservable, stateDidActuallyChange:boolean) {
		if (!observable.isReady) {
			if (++this.dependencyStaleCount === 1)
				this.markStale();
		} else { // not stale, thus ready since pending states are not propagated
			invariant(this.dependencyStaleCount > 0);
			if (stateDidActuallyChange)
				this.dependencyChangeCount += 1;
			if (--this.dependencyStaleCount === 0) { // all dependencies are ready
				// did any of the observables really change?
				if (this.dependencyChangeCount > 0) {
					this.dependencyChangeCount = 0;
					this.compute(true, true);
				} else
					// we're done, but didn't change, lets make sure verybody knows..
					this.markReady(false);
			}
		}
	}

	compute(track:boolean, markReady:boolean) {
		if (track)
			this.trackDependencies();
		if (transitionTracker)
			reportTransition(this, "PENDING");
		var hasError = true;
		var oldValue = this.value;
		try {
			this.isComputing = true;
			// TODO: strict check withStrict(this.externalRefenceCount === 0, () => { // TODO: always with strict once autorun has own derivable
			this.value = this.derivation.call(this.scope);
			// });
			hasError = false;
		} finally {
			if (hasError)
				// TODO: merge with computable view, use this.func.toString
				console.error(`[DerivedValue '${this.name}'] There was an uncaught error during the computation of a derived value. Please check the next exception.`);
			this.isComputing = false
			if (track)
				this.bindDependencies();
			const changed = valueDidChange(this.compareStructural, this.value, oldValue)
			if (markReady)
				this.markReady(changed);
			if (changed)
				this.changeEvent.emit(this.value, oldValue);
		}
	}

	private trackDependencies() {
		this.prevObserving = this.observing;
		this.observing = [];
		global.__mobservableViewStack.push(this);
	}

	private bindDependencies() {
		global.__mobservableViewStack.length -= 1;
	
		var [added, removed] = quickDiff(this.observing, this.prevObserving);
		this.prevObserving = null;
	
		this.hasCycle = false;
		for (var i = 0, l = added.length; i < l; i++) {
			var dependency = added[i];
			if (dependency instanceof DerivedValue){
				if (dependency.findCycle(this)) {
					this.hasCycle = true;
					// don't observe anything that caused a cycle, or we are stuck forever!
					this.observing.splice(this.observing.indexOf(added[i]), 1);
					dependency.hasCycle = true; // for completeness sake..
					continue;
				}
			}
			added[i].addObserver(this);
		}
	
		// remove observers after adding them, so that they don't go in lazy mode to early
		for (var i = 0, l = removed.length; i < l; i++)
			removed[i].removeObserver(this);
	}

	private findCycle(node: DerivedValue<any>):boolean {
		var obs = this.observing;
		if (obs.indexOf(node) !== -1)
			return true;
		for(var l = obs.length, i = 0; i < l; i++)
			if (obs[i] instanceof DerivedValue && (<DerivedValue<any>> obs[i]).findCycle(node))
				return true;
		return false;
	}
	
	observe(listener: (newValue: T, oldValue: T) => void, fireImmediately = false): Lambda {
		this.setRefCount(+1); // awake
		if (fireImmediately)
			listener(this.get(), undefined);
		var disposer = this.changeEvent.on(listener);
		return once(() => {
			this.setRefCount(-1);
			disposer();
		});
	}

	notifyObserved() {
		markObservableAsObserved(this);
	}

	toString() {
		return `DerivedValue[${this.name}:${this.value}]`;
	}
}

export function stackDepth () {
	return global.__mobservableViewStack.length;
}

export function isComputingView() {
	return global.__mobservableViewStack.length > 0;
}

export function checkIfStateIsBeingModifiedDuringView(name: string) {
    if (getStrict() === true && isComputingView()) {
        // TODO: add url with detailed error subscription / best practice here:
        const ts = global.__mobservableViewStack;
        throw new Error(
`[mobservable] It is not allowed to change the state during the computation of a reactive view. Should the data you are trying to modify actually be a view? 
Use 'mobservable.extras.withStrict(false, block)' to allow changes to be made inside views (unrecommended).
View name: ${name}.
Current stack size is ${ts.length}, active view: "${ts[ts.length -1].toString()}".`
        );
    }
}

export function untracked<T>(action:()=>T):T {
    try {
		// TODO: blegh!
        var dnode = new DerivedValue<boolean>(() => true, null, "untracked", false);
        (<any>dnode).$UNTRACKED_MARKER = true;
        global.__mobservableViewStack.push(dnode);
        return action();
    } finally {
        global.__mobservableViewStack.pop();
    }
}

// TODO: move back to top?
import {transitionTracker, reportTransition} from './extras';
import {quickDiff, once, invariant} from './utils';
import {Lambda} from './interfaces';
import SimpleEventEmitter from './simpleeventemitter';
import {getStrict, ValueMode, getValueModeFromValue, makeChildObservable, assertUnwrapped, valueDidChange, withStrict} from './core';
import {deepEquals} from './utils';
