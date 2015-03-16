/// <reference path="./typings/node-0.10.d.ts" />

import events = require('events');

module Model {
	type Primitive = string|boolean|number;
	type PrimitiveFunction = ()=>Primitive;

	interface IProperty<T> {
		():T;
		(value:T);
		onChange(callback:(newValue:T, oldValue:T)=>void):IProperty<T>;
	}

	export function property<T>(value:T|{():T}):IProperty<T> {
		var prop:Property<any> = null;

		switch(typeof value) {
			case "function": prop = new ComputedProperty(<()=>T>value);break;
			case "number": prop = new NumberProperty(<any>value);break; //MWE: WTF cast
			case "string": prop = new StringProperty(<any>value);break;
			case "boolean": prop = new BooleanProperty(<any>value);break;
			default:
				throw "Unable to determine property type: " + value;
		}

		var propFunc:IProperty<T> = <any> function(value?) {
			if (arguments.length > 0)
				return prop.set(value);
			return prop.get();
		}
		propFunc.onChange = prop.onChange.bind(prop);

		return propFunc;
	}

	class Property<T> {
		private events = new events.EventEmitter();
		protected dependencyState:DNode = new DNode();

		constructor(protected _value:T){

		}

		set(value:T):Property<T> {
			if (value !== this._value) {
				var oldValue = this._value;
				this.dependencyState.markUnstable();
				this._value = value;
				this.events.emit('change', value, oldValue);
				this.dependencyState.markStable();
			}
			return this;
		}

		get():T {
			this.dependencyState.notifyObserved();
			return this._value;
		}

		onChange(callback:(newValue:T)=>void):Property<T> {
			this.events.addListener('change', callback);
			return this;
		}
	}

	class BooleanProperty extends Property<boolean> {
		constructor(defaultValue=false) {
			super(defaultValue);
		}
	}

	class NumberProperty extends Property<number> {
		constructor(defaultValue=0) {
			super(defaultValue);
		}
	}

	class StringProperty extends Property<string> {
		constructor(defaultValue="") {
			super(defaultValue);
		}
	}

	class ComputedProperty<U> extends Property<U> {
		private initialized = false;
		private privateSetter:(value:U)=>void = null;

		constructor(protected func:()=>U) {
			super(func ? func() : undefined);
			if (!func)
				throw "Computed required a function";

			this.privateSetter = this.set;
			this.set = () => {
				throw "Computed cannot retrieve a new value!";
				return this;
			}

			this.dependencyState.compute = this.compute.bind(this);
		}

		get():U {
			// first evaluation is lazy
			if (!this.initialized)
				this.dependencyState.computeNextValue();
			return super.get(); // assumption: Compute<> is always synchronous
		}

		compute(onComplete:()=>void) {
			this.privateSetter.call(this, this.func());
			onComplete();
		}
	}

	export class Reference<U extends Model> {

	}

	export class List<U> {

	}

	export class Model {

	}

	interface IObservable<T> {
		onChange(callback:(value:T)=>void);
	}

	enum DNodeState { UNSTABLE, COMPUTING, STABLE };

	class DNode {
		state: DNodeState = DNodeState.STABLE;

		private observing: DNode[] = [];
		private observers: DNode[] = [];

		addObserver(node:DNode) {
			/* This check should not be needed, see dependency tracking code
			var idx = this.observers.indexOf(node);
			if (idx === -1)*/
				this.observers.push(node);
		}

		removeObserver(node:DNode) {
			var idx = this.observers.indexOf(node);
			if (idx !== -1)
				this.observers.splice(idx, 1);
		}

		markUnstable() {
			if (this.state === DNodeState.COMPUTING)
				throw "Illegal state";
			if (this.state === DNodeState.UNSTABLE)
				return;
			this.state = DNodeState.UNSTABLE;
			this.observers.forEach(observer => observer.notifyStateChange(this));
		}

		markStable() {
			if (this.state === DNodeState.STABLE)
				return;
			this.state = DNodeState.STABLE;
			this.observers.forEach(observer => observer.notifyStateChange(this));
		}

		notifyStateChange(observable:DNode) {
			switch(this.state) {
				case DNodeState.UNSTABLE:
					// The observable has become stable, and all others are stable as well, we can compute now!
					if (observable.state === DNodeState.STABLE && this.observing.filter(o => o.state !== DNodeState.STABLE).length === 0)
						// TODO: reschedule if not already in rescheduled mode?
						this.computeNextValue();
					break;
				case DNodeState.STABLE:
				case DNodeState.COMPUTING:
					if (observable.state === DNodeState.UNSTABLE)
						this.markUnstable();
					break;
			}
		}

		private clearObserving() {
			this.observing.forEach(observing => observing.removeObserver(this));
			this.observing = [];
		}

		computeNextValue() {
			this.state = DNodeState.COMPUTING;
			this.trackDependencies();
			this.compute(() => {
				this.bindDependencies();
				this.markStable();
			});
		}

		compute(onComplete:()=>void) {
			onComplete();
		}

		/*
			Dependency detection
		*/
		private static trackingStack:DNode[][] = []

		private trackDependencies() {
			this.clearObserving();
			DNode.trackingStack.unshift([]);
		}

		private bindDependencies() {
			var changedObservables = this.observing = DNode.trackingStack.shift();
			changedObservables.forEach(observable => observable.addObserver(this))
		}

		public notifyObserved() {
			if (DNode.trackingStack.length)
				DNode.trackingStack[0].push(this);
		}
	}
}
