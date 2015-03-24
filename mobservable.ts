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

export function property<T,S>(value:T|{():T}, scope?:S):IProperty<T,S> {
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

	return <IProperty<T,S>> propFunc;
}

export function guard<T>(func:()=>T, onInvalidate:Lambda):[T,Lambda] {
	var dnode = new DNode();
	var retVal:T;
	dnode.compute = function(done) {
		retVal = func();
		dnode.compute = function(done2) {
			done2();
			dnode.dispose();
			onInvalidate();
		}
		done();
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

export function defineProperty<T>(object:Object, name:string, initialValue:T) {
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
	private events = new events.EventEmitter();
	protected dependencyState:DNode = new DNode();

	constructor(protected _value:T, protected scope?:S){

	}

	set(value:T):S {
		if (value !== this._value) {
			var oldValue = this._value;
			this.dependencyState.markStale();
			this._value = value;
			this.dependencyState.markReady(true);
			this.events.emit('change', value, oldValue);
		}
		else
			this.dependencyState.markReady(false);

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
	private privateSetter:(value:U)=>void = null;

	constructor(protected func:()=>U, scope:S) {
		super(undefined, scope);
		if (!func)
			throw new Error("Computed required a function");

		this.privateSetter = this.set;
		this.set = () => {
			throw new Error("Computed cannot retrieve a new value!");
			return this.scope;
		}

		this.dependencyState.compute = this.compute.bind(this);
	}

	get():U {
		// first evaluation is lazy
		if (!this.initialized) {
			this.initialized = true; // prevents endless recursion in cycles (cycles themselves are only detected after finishing the computation)
			this.dependencyState.computeNextValue();
		}

		return super.get(); // assumption: Compute<> is always synchronous for computed properties
	}

	compute(onComplete:Lambda) {
		this.privateSetter.call(this, this.func.call(this.scope));
		this.initialized = true;
		onComplete();
	}

	toString() {
		return `Property[${this.func.toString()}]`;
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
		this.notifyObservers(false);
	}

	markReady(didActuallyChange:boolean) {
		if (this.state === DNodeState.READY)
			return;
		this.state = DNodeState.READY;
		this.notifyObservers(didActuallyChange);
		Scheduler.scheduleReady();
	}

	notifyObservers(didActuallyChange:boolean) {
		var os = this.observers;
		for(var i = os.length -1; i >= 0; i--)
			os[i].notifyStateChange(this, didActuallyChange);
	}

	dependencyChangeCount = 0;

	notifyStateChange(observable:DNode, didActuallyChange:boolean) {
		switch(this.state) {
			case DNodeState.STALE:
				if (observable.state === DNodeState.READY && didActuallyChange)
					this.dependencyChangeCount += 1;
				// The observable has become stable, and all others are stable as well, we can compute now!
				if (observable.state === DNodeState.READY && this.observing.filter(o => o.state !== DNodeState.READY).length === 0) {
					if (this.dependencyChangeCount) {
						this.state = DNodeState.PENDING;
						Scheduler.schedule(() => this.computeNextValue());
					}
					else {
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

				// However, for now the model is that all computations are synchronous, so if computing, a calc is scheduled
				// and we're fine here
			//	break;
			case DNodeState.READY:
				if (observable.state === DNodeState.STALE)
					this.markStale();
				break;
		}
	}

	computeNextValue() {
		this.trackDependencies();
		this.compute(() => {
			this.bindDependencies();
			//this.markReady(true);
		});
	}

	compute(onComplete:Lambda) {
		onComplete();
	}

	/*
		Dependency detection
	*/
	// TODO: is trackingstack + push/pop still valid if DNode.compute is executed asynchronously?
	private static trackingStack:DNode[][] = []

	private trackDependencies() {
		this.prevObserving = this.observing;
		DNode.trackingStack.unshift([]);
	}

	private bindDependencies() {
		this.observing = DNode.trackingStack.shift();
		if (this.hasObservingChanged()) {
			this.prevObserving.forEach(observing => observing.removeObserver(this));
			this.observing.forEach(observable => observable.addObserver(this))
			this.findCycle(this);
		}
	}

	public notifyObserved() {
		if (this.state === DNodeState.PENDING)
			throw new Error("Cycle detected");
		if (DNode.trackingStack.length)
			DNode.trackingStack[0].push(this);
	}

	public findCycle(node:DNode) {
		if (!this.observing)
			return;
		if (this.observing.indexOf(node) !== -1)
			throw new Error("Cycle detected");
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
