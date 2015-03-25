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
		this.observers.push(node);
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
		for(var i = 0; i < this.observing.length; i++)
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

	notifyStateChange(observable:DNode, didTheValueActuallyChange:boolean) {
		switch(this.state) {
			case DNodeState.STALE:
				if (observable.state === DNodeState.READY && didTheValueActuallyChange)
					this.dependencyChangeCount += 1;
				// The observable has become stable, and all others are stable as well, we can compute now!
				if (observable.state === DNodeState.READY && this.observing.filter(o => o.state !== DNodeState.READY).length === 0) {
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
		DNode.trackingStack.unshift([]);
	}

	private bindDependencies() {
		this.observing = DNode.trackingStack.shift();
		if (this.hasObservingChanged()) {
			// Optimization: replace forEach with for loops https://jsperf.com/for-vs-foreach/32
			this.prevObserving.forEach(observing => observing.removeObserver(this));
			this.observing.forEach(observable => observable.addObserver(this))
			this.findCycle(this);
		}
	}

	public notifyObserved() {
		if (this.state === DNodeState.PENDING)
			throw new Error("Cycle detected"); // we are calculating ATM, *and* somebody is looking at us..
		if (DNode.trackingStack.length)
			DNode.trackingStack[0].push(this);
	}

	public findCycle(node:DNode) {
		if (!this.observing)
			return;
		if (this.observing.indexOf(node) !== -1)
			throw new Error("Cycle detected"); // argh, we are part of our own dependency tree...
		this.observing.forEach(o => o.findCycle(node));
	}

	public dispose() {
		this.observing.forEach(observing => observing.removeObserver(this));
		this.observing = [];
		// Do something with the observers, notify some state like KILLED?
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
			Scheduler.tasks.push(func);
	}

	private static runPostBatch() {
		while(Scheduler.tasks.length) {
			try {
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
