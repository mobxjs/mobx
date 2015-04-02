/// <reference path="./typings/node-0.10.d.ts" />

/**
 * MOBservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */

import events = require('events');

export interface Lambda {
	():void;
}

export interface IProperty<T,S> {
	():T;
	(value:T):S;
	subscribe(callback:(newValue:T, oldValue:T)=>void):Lambda;
}

// TODO: rename to observable, make root export
// TODO: how to dinstinguish beteween observing refs, and arrays / objects
// TODO: make observableMap(map) function that makes properties observable, seals the object, introduces observe function?
export function property<T,S>(value?:T|{():T}, scope?:S):IProperty<T,S> {
	var prop:Property<T,S> = null;

	if (typeof value === "function")
		prop = new ComputedProperty(<()=>T>value, scope);
	else
		prop = new Property(<T>value, scope);

	var propFunc = function(value?:T):T|S {
		if (arguments.length > 0)
			return <S> prop.set(value);
		else
			return <T> prop.get();
	};
	(<any>propFunc).subscribe = prop.subscribe.bind(prop);
	(<any>propFunc).prop = prop;
	(<any>propFunc).toString = function() { return prop.toString(); };

	return <IProperty<T,S>> propFunc;
}

export function guard<T>(func:()=>T, onInvalidate:Lambda):[T,Lambda] {
	var dnode = new DNode();
	var retVal:T;
	dnode.compute = function() {
		retVal = func();
		dnode.compute = function() {
			if (dnode.getObserversCount())
				throw new Error("A guarded function should not have observers!");
			dnode.dispose();
			onInvalidate();
			return false;
		}
		return false; // Note, nobody should observe a guarded funct !
	}
	dnode.computeNextValue();
	return [retVal, () => dnode.dispose()];
}

export function array<T>(values?:T[]): ObservableArray<T> {
	return new ObservableArray(values);
}

export function batch(action:Lambda) {
	Scheduler.batch(action);
}

export function onReady(listener:Lambda):Lambda {
	return Scheduler.onReady(listener);
}

export function onceReady(listener:Lambda) {
	Scheduler.onceReady(listener);
}

export function defineProperty<T>(object:Object, name:string, initialValue?:T) {
	var _property = property(initialValue, object);
	Object.defineProperty(object, name, {
		get: function() {
			return _property();
		},
		set: function(value) {
			_property(value);
		},
		enumerable: true,
		configurable: true
	});
}

class Property<T,S> {
	protected events = new events.EventEmitter();
	protected dependencyState:DNode = new DNode();

	constructor(protected _value?:T, protected scope?:S){

	}

	set(value:T):S {
		if (value !== this._value) {
			var oldValue = this._value;
			this.dependencyState.markStale();
			this._value = value;
			this.dependencyState.markReady(true);
			this.events.emit('change', value, oldValue);
		}

		return this.scope;
	}

	get():T {
		this.dependencyState.notifyObserved();
		return this._value;
	}

	// TODO: subscribe -> observe for consistency?
	subscribe(listener:(newValue:T, oldValue:T)=>void, fireImmediately=false):Lambda {
		var current = this.get(); // make sure the values are initialized
		if (fireImmediately)
			listener(current, undefined);

		this.events.addListener('change', listener);
		return () => {
			this.events.removeListener('change', listener);
		};
	}

	toString() {
		return `Property[${this._value}]`;
	}
}

class ComputedProperty<U,S> extends Property<U,S> {
	private initialized = false;

	constructor(protected func:()=>U, scope:S) {
		super(undefined, scope);
		if (!func)
			throw new Error("ComputedProperty requires a function");

		this.dependencyState.compute = this.compute.bind(this);
	}

	get():U {
		// the first evaluation of a computed function is lazy, to save lots of calculations when its dependencies are initialized
		// (and it is cheaper anyways)
		if (!this.initialized) {
			this.initialized = true; // prevents endless recursion in cycles (cycles themselves are only detected after finishing the computation)
			this.dependencyState.computeNextValue();
		}

		return super.get(); // assumption: Compute<> is always synchronous for computed properties
	}

	set(_:U):S {
		throw new Error("Computed cannot retrieve a new value!");
	}

	compute() {
		var newValue = this.func.call(this.scope);
		this.initialized = true;

		var changed = newValue !== this._value;
		if (changed) {
			var oldValue = this._value;
			this._value = newValue;
			this.events.emit('change', newValue, oldValue);
		}

		return changed;
	}

	toString() {
		return `ComputedProperty[${this.func.toString()}]`;
	}
}

/*
	TODO: mention clearly that ObservableArray is not sparse, that is,
	no wild index assignments with index >(!) length are allowed (that is, won't be observed)
 */
export class ObservableArray<T> implements Array<T> {
    [n: number]: T;

	private _length;
	private _values: T[];
	private dependencyState:DNode;
	private events;

	// TODO: make length and all other props non enumarable, like in a proper array
	// TODO: make the property at length[x] also non enumerable
	get length():number { return this._length(); }
	set length(value:number) { this._length(value); }


	constructor(initialValues?:T[]) {
		// make for .. in / Object.keys behave like an array:
		Object.defineProperty(this, "_length", { enumerable: false, value: property(0) });
		Object.defineProperty(this, "dependencyState", { enumerable: false, value: new DNode() });
		Object.defineProperty(this, "_values", { enumerable: false, value: [] });
		Object.defineProperty(this, "events", { enumerable: false, value: new events.EventEmitter() });

		this._length.subscribe((newLength) => {
			var currentLength = this._values.length;
			if (newLength != currentLength) // distinguish between internal and external updates
				return;

			// grow
			if (newLength > currentLength)
				this.spliceWithArray(currentLength, 0, new Array<T>(newLength - currentLength));

			// shrink
			else if (newLength < currentLength)
				this.splice(newLength -1, currentLength - newLength);
		})

		if (initialValues && initialValues.length)
			this.spliceWithArray(0, 0, initialValues);
		else
			this.createNewStubEntry(0);
	}

	// updates the length property, and adds / removes the necessary properties
	// does not alter this._values itself
	private updateLength(oldLength:number, delta:number) {
		this._length(oldLength + delta);

		if (delta < 0) {
			for(var i = oldLength - 1 - delta; i < oldLength; i++)
				delete this[i];
		}
		else if (delta > 0) {
			for (var i = 0; i < delta; i++)
				this.createNewEntry(oldLength + i);
		}
		else
			return;
		this.createNewStubEntry(oldLength + delta);
	}

	private createNewEntry(index: number) {
		Object.defineProperty(this, "" + index, {
			enumerable: true,
			configurable: true,
			set: (value) => {
				if (this._values[index] !== value) {
					this._values[index] = value;
					this.notifyChildUpdate(index);
				}
			},
			get: () => {
				this.notifyChildObserved(index);
				return this._values[index];
			}
		})
	}

	private createNewStubEntry(index: number) {
		Object.defineProperty(this, "" + index, {
			enumerable: false,
			configurable: true,
			set: (value) => this.push(value),
			get: () => undefined
		});
	}

	spliceWithArray(index:number, deleteCount?:number, newItems?:T[]):T[] {
		var length = this._values.length;

		// yay, splice can deal with strange indexes
		if (index > length)
			index = length;
		else if (index < 0)
			index = Math.max(0, length - index);

		// too few arguments?
		if (arguments.length === 0)
			return;
		if (arguments.length === 1)
			deleteCount = length - index;

		var lengthDelta = newItems.length - deleteCount;
		var res:T[] = Array.prototype.splice.apply(this._values, [<any>index, deleteCount].concat(newItems));
		this.updateLength(length, lengthDelta); // create or remove new entries

		this.notifySplice(index, res, newItems);
		return res;
	}

	notifyChildUpdate(index:number) {
		this.notifyChanged();
		// TODO: update Array.observe listeners
	}

	notifyChildObserved(index:number) {
		this.notifyObserved();
	}

	notifySplice(index:number, deleted:T[], added:T[]) {
		this.notifyChanged();
		// TODO: update Array.observe listeners
	}

	notifyChanged() {
		this.dependencyState.markStale();
		this.dependencyState.markReady(true);
		this.events.emit('change');
	}

	notifyObserved() {
		this.dependencyState.notifyObserved();
	}

	// TODO: subscribe -> observe for consistency?
	subscribe(listener:()=>void, fireImmediately=false):Lambda {
		if (fireImmediately)
			listener();

		this.events.addListener('change', listener);
		return () => {
			this.events.removeListener('change', listener);
		};
	}

	clear(): T[] {
		return this.splice(0);
	}

	values(): T[] {
		return this.slice(0);
	}

	/*
		ES7 goodies
	 */
	// TODO: observe(callaback) https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe
	// https://github.com/arv/ecmascript-object-observe
	// TODO: unobserve(callback)

	/*
		functions that do alter the internal structure of the array, from lib.es6.d.ts
	 */
	splice(index:number, deleteCount?:number, ...newItems:T[]):T[] {
		return this.spliceWithArray(index, deleteCount, newItems);
	}

    push(...items: T[]): number {
    	// don't use the property internally
    	this.spliceWithArray(this._values.length, 0, items);
    	return this._values.length;
    }
    pop(): T {
    	return this.splice(this._values.length, 1)[0];
    }
    shift(): T {
    	return this.splice(0, 1)[0]
    }
    unshift(...items: T[]): number {
    	this.spliceWithArray(0, 0, items);
    	return this._values.length;
    }

	/*
		functions that do not alter the array, from lib.es6.d.ts
	*/
	toString():string { return this.wrapReadFunction<string>("toString", arguments); }
	toLocaleString():string { return this.wrapReadFunction<string>("toLocaleString", arguments); }
    concat<U extends T[]>(...items: U[]): T[] { return this.wrapReadFunction<T[]>("concat", arguments); }
	join(separator?: string): string { return this.wrapReadFunction<string>("join", arguments); }
	reverse():T[] { return this.wrapReadFunction<T[]>("reverse", arguments); }
    slice(start?: number, end?: number): T[] { return this.wrapReadFunction<T[]>("slice", arguments); }
	sort(compareFn?: (a: T, b: T) => number): T[] { return this.wrapReadFunction<T[]>("sort", arguments); }
    indexOf(searchElement: T, fromIndex?: number): number { return this.wrapReadFunction<number>("indexOf", arguments); }
    lastIndexOf(searchElement: T, fromIndex?: number): number { return this.wrapReadFunction<number>("lastIndexOf", arguments); }
    every(callbackfn: (value: T, index: number, array: T[]) => boolean, thisArg?: any): boolean { return this.wrapReadFunction<boolean>("every", arguments); }
    some(callbackfn: (value: T, index: number, array: T[]) => boolean, thisArg?: any): boolean { return this.wrapReadFunction<boolean>("some", arguments); }
    forEach(callbackfn: (value: T, index: number, array: T[]) => void, thisArg?: any): void { return this.wrapReadFunction<void>("forEach", arguments); }
    map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[] { return this.wrapReadFunction<U[]>("map", arguments); }
    filter(callbackfn: (value: T, index: number, array: T[]) => boolean, thisArg?: any): T[] { return this.wrapReadFunction<T[]>("filter", arguments); }
    reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U { return this.wrapReadFunction<U>("reduce", arguments); }
    reduceRight<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U { return this.wrapReadFunction<U>("reduceRight", arguments); }

	wrapReadFunction<U>(funcName:string, args:IArguments):U {
		var baseFunc = Array.prototype[funcName];
		// generate a new function that wraps arround the Array.prototype, and replace our own definition
		ObservableArray.prototype[funcName] = function() {
			var res = baseFunc.apply(this._values, args);
			this.notifyObserved();
			return res;
		}
		return this[funcName].apply(this, args);
	}
}


//TODO: trick type system
//ObservableArray.prototype = []; // makes, observableArray instanceof Array === true, but not typeof or Array.isArray..
//y.__proto__ = Array.prototype
//x.prototype.toString = function(){ return "[object Array]" }
//even monky patch Array.isArray?

enum DNodeState {
	STALE, // One or more depencies have changed, current value is stale
	PENDING, // All dependencies are up to date again, a recalculation of this node is pending, current value is stale
	READY, // Everything is bright and shiny
};

class DNode {
	state: DNodeState = DNodeState.READY;

	private observing: DNode[] = [];
	private prevObserving: DNode[] = [];
	private observers: DNode[] = [];
	private dependencyChangeCount = 0;

	getObserversCount() {
		return this.observers.length;
	}

	addObserver(node:DNode) {
		this.observers[this.observers.length] = node;
	}

	removeObserver(node:DNode) {
		var idx = this.observers.indexOf(node);
		if (idx !== -1)
			this.observers.splice(idx, 1);
	}

	hasObservingChanged() {
		if (this.observing.length !== this.prevObserving.length)
			return true;
		// Optimization; use cached length
		var l = this.observing.length;
		for(var i = 0; i < l; i++)
			if (this.observing[i] !== this.prevObserving[i])
				return true;
		return false;
	}

	markStale() {
		if (this.state === DNodeState.PENDING)
			return; // recalculation already scheduled, we're fine..
		if (this.state === DNodeState.STALE)
			return;

		this.state = DNodeState.STALE;
		/*
			Mark stale recursively marks all observers stale as well, this is nice since it
			makes all computations consistent, e.g.:
			a = property(3)
			b = property(() => a() * 2)
			c = property(() => b() + a())
			a(4)
			// -> c will directly yield 12, and no intermediate 4 or 11 where either 'a' or 'b' wasn't updated in c

			However, if performance becomes an issue, it might be nice to introduce a global 'consistent' flag,
			that drops de recursive markStale / markReady in favor of a direct set and an (async?) scheduled recomputation
			of computed properties
		 */
		this.notifyObservers();
	}

	markReady(didTheValueActuallyChange:boolean) {
		if (this.state === DNodeState.READY)
			return;
		this.state = DNodeState.READY;
		this.notifyObservers(didTheValueActuallyChange);
		Scheduler.scheduleReady();
	}

	notifyObservers(didTheValueActuallyChange:boolean=false) {
		var os = this.observers;
		// change to 'for loop, reverse, pre-decrement', https://jsperf.com/for-vs-foreach/32
		for(var i = os.length -1; i >= 0; i--)
			os[i].notifyStateChange(this, didTheValueActuallyChange);
	}

	areAllDependenciesAreStable() {
		var obs = this.observing, l = obs.length;
		for(var i = 0; i < l; i++)
			if (obs[i].state !== DNodeState.READY)
				return false;
		return true;
	}

	notifyStateChange(observable:DNode, didTheValueActuallyChange:boolean) {
		switch(this.state) {
			case DNodeState.STALE:
				if (observable.state === DNodeState.READY && didTheValueActuallyChange)
					this.dependencyChangeCount += 1;
				// The observable has become stable, and all others are stable as well, we can compute now!
				if (observable.state === DNodeState.READY && this.areAllDependenciesAreStable()) {
					// did any of the observables really change?
					if (this.dependencyChangeCount > 0) {
						this.state = DNodeState.PENDING;
						Scheduler.schedule(() => this.computeNextValue());
					}
					else {
						// we're done, but didn't change, lets make sure verybody knows..
						this.markReady(false);
					}
					this.dependencyChangeCount = 0;
				}
				break;
			case DNodeState.PENDING:
				// If computations are asynchronous, new updates might come in during processing,
				// and it is impossible to determine whether these new values will be taken into consideration
				// during the async process or not. So to ensure everything is concistent, probably a new computation
				// should be scheduled immediately after the current one is done..

				// However, for now the model is that all computations are synchronous, so if computing, a calc is already
				// scheduled but not running yet, so we're fine here
				break;
			case DNodeState.READY:
				if (observable.state === DNodeState.STALE)
					this.markStale();
				break;
		}
	}

	computeNextValue() {
		// possible optimization: compute is only needed if there are subscribers or observers (that have subscribers)
		// otherwise, computation and further (recursive markStale / markReady) could be delayed
		this.trackDependencies();
		var valueDidChange = this.compute();
		this.bindDependencies();
		this.markReady(valueDidChange);
	}

	compute():boolean {
		return false; // false == unchanged
	}

	/*
		Dependency detection
	*/
	private static trackingStack:DNode[][] = []

	private trackDependencies() {
		this.prevObserving = this.observing;
		DNode.trackingStack[DNode.trackingStack.length] = [];
	}

	private bindDependencies() {
		this.observing = DNode.trackingStack.pop();
		if (this.hasObservingChanged()) {
			// optimization, smart compare two lists before removing / deleting / finding cycles
			for(var l = this.prevObserving.length, i=0; i<l; i++)
				this.prevObserving[i].removeObserver(this);

			// alreadyAdded is an optimization, that especially helps when observing long arrays
			// and looping over them, in that case the observes get added multiple times
			var alreadyAdded = [];

			for(var l = this.observing.length, i=0; i<l; i++) {
				var observing = this.observing[i];
				if (alreadyAdded.indexOf(observing) === -1) {
					alreadyAdded[alreadyAdded.length] = observing;
					observing.addObserver(this);
				}
			}
			this.findCycle(this);
		}
	}

	public notifyObserved() {
		if (this.state === DNodeState.PENDING)
			throw new Error("Cycle detected"); // we are calculating ATM, *and* somebody is looking at us..
		var ts = DNode.trackingStack, l = ts.length;
		if (l) {
			var cs = ts[l -1], csl = cs.length;
		// if enabled, array observing becomes a lot faster, observing many different values in a single
		// function becomse slower, lets check what is the best solution
			if (csl === 0 || cs[csl -1] != this)
				cs[csl] = this;
		}
	}

	public findCycle(node:DNode) {
		if (!this.observing)
			return;
		if (this.observing.indexOf(node) !== -1)
			throw new Error("Cycle detected"); // argh, we are part of our own dependency tree...
		for(var l = this.observing.length, i=0; i<l; i++)
			this.observing[i].findCycle(node);
	}

	public dispose() {
		for(var l=this.observing.length, i=0; i<l; i++)
			this.observing[i].removeObserver(this);
		this.observing = [];
		// Do something with the observers, notify some state like KILLED? TODO: => set 'undefined'
	}
}

class Scheduler {
	private static events = new events.EventEmitter();
	private static inBatch = 0;
	private static tasks:{():void}[] = [];

	public static schedule(func:Lambda) {
		if (Scheduler.inBatch < 1)
			func();
		else
			Scheduler.tasks[Scheduler.tasks.length] = func;
	}

	private static runPostBatch() {
		while(Scheduler.tasks.length) {
			try { // optimization: move try out of while, re-enter after exception (tasks array is preserved after all)
				Scheduler.tasks.shift()();
			}
			catch (e) {
				console && console.error("Failed to run scheduled action: " + e);
				throw e;
			}
		}
	}

	static batch(action:Lambda) {
		Scheduler.inBatch += 1;
		try {
			action();
		} finally {
			Scheduler.inBatch -= 1;
			if (Scheduler.inBatch === 0) {
				Scheduler.runPostBatch();
				Scheduler.scheduleReady();
			}
		}
	}

	private static pendingReady = false;

	static scheduleReady() {
		if (!Scheduler.pendingReady) {
			Scheduler.pendingReady = true;
			setTimeout(()=> {
				Scheduler.pendingReady = false;
				Scheduler.events.emit('ready');
			}, 1);
		}
	}

	static onReady(listener:Lambda) {
		Scheduler.events.on('ready', listener);
		return () => {
			Scheduler.events.removeListener('ready', listener);
		}
	}

	static onceReady(listener:Lambda) {
		Scheduler.events.once('ready', listener);
	}
}

