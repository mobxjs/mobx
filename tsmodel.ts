/// <reference path="./typings/node-0.10.d.ts" />

import events = require('events');

module Model {

	class Property<T> implements IObservable<T> {
		private events = new events.EventEmitter();
		protected dependencyState:DNode = new DNode();

		constructor(protected _value:T){

		}

		set(value:T):Property<T> {
			if (value !== this._value) {
				this.dependencyState.markUnstable();
				this._value = value;
				this.events.emit('change', value);
				this.dependencyState.markStable();
			}
			return this;
		}

		get():T {
			DependencyDetector.notifyObserved(this.dependencyState);
			return this._value;
		}

		onChange(callback:(newValue:T)=>void):Property<T> {
			this.events.addListener('change', callback);
			return this;
		}
	}

	export class Boolean extends Property<boolean> {
		constructor(defaultValue=false) {
			super(defaultValue);
		}
	}

	export class Number extends Property<number> {
		constructor(defaultValue=0) {
			super(defaultValue);
		}
	}

	export class String extends Property<string> {
		constructor(defaultValue="") {
			super(defaultValue);
		}
	}

	export class Computed<U> extends Property<U> {
		privateSetter:(value:U)=>void = null;

		constructor(protected func:()=>U) {
			super(func ? func() : undefined);
			if (!func)
				throw "Computed required a function";

			this.privateSetter = this.set;
			this.set = () => {
				throw "Computed cannot retrieve a new value!";
				return this;
			}

			this.dependencyState.onDependenciesStable = this.compute.bind(this);
		}

		compute() {
			try {
				DependencyDetector.trackDependencies(this.dependencyState);
				this.privateSetter.call(this, this.func());
			}
			finally {
				DependencyDetector.bindDependencies(this.dependencyState);
			}
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

		observing: DNode[] = [];
		observers: DNode[] = [];

		addObserver(node:DNode) {
			var idx = this.observers.indexOf(node);
			if (idx === -1)
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
						this.onDependenciesStable();
					break;
				case DNodeState.COMPUTING:
					throw "Circular reference!";
					break;
				case DNodeState.STABLE:
					if (observable.state === DNodeState.UNSTABLE)
						this.markUnstable();
					break;
			}
		}

		onDependenciesStable() {
			throw "onDependenciesStable not implemented!";
		}

		clearObserving() {
			if (this.state !== DNodeState.COMPUTING)
				throw "Illegal state";
			this.observing.forEach(observing => observing.removeObserver(this));
			this.observing = [];
		}
	}

	class DependencyDetector {
		private static trackingStack:DNode[][] = []

		static trackDependencies(dnode:DNode) {
			dnode.clearObserving();
			DependencyDetector.trackingStack.unshift([]);
		}

		static bindDependencies(dnode:DNode) {
			var changedObservables = dnode.observing = DependencyDetector.trackingStack.shift();
			changedObservables.forEach(observable => observable.addObserver(dnode))
		}

		static notifyObserved(observable:DNode) {
			if (DependencyDetector.trackingStack.length)
				DependencyDetector.trackingStack[0].push(observable);
		}
	}
}
