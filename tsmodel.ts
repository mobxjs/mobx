/// <reference path="./typings/node-0.10.d.ts" />

import events = require('events');

module Model {

	class Property<T> implements IObservable<T> {
		private events = new events.EventEmitter();

		constructor(protected _value:T){

		}

		set(value:T):Property<T> {
			if (value !== this._value) {
				this._value = value;
				this.events.emit('change', value);
			}
			return this;
		}

		get():T {
			DependencyDetector.notifyObserved(this);
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
		private updater = ()=>this.get(); // listener for if a dependency is being updated

		constructor(protected func:()=>U) {
			super(func ? func() : undefined);
			if (!func)
				throw "Computed required a function";
		}

		set(value:U) {
			throw "Computed cannot retrieve a new value!";
			return this;
		}

		get():U {
			// TODO: only track if not computing or something
			// TODO: remove old bindings
			try {
				DependencyDetector.trackDependencies();
				return this.func();
			}
			finally {
				DependencyDetector.bindDependencies(this.updater);
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

	class DependencyDetector {
		private static trackingStack:IObservable<any>[][] = []

		static trackDependencies() {
			DependencyDetector.trackingStack.unshift([]);
		}

		static bindDependencies(callback:(value)=>void) {
			var changedObservables = DependencyDetector.trackingStack.shift();
			changedObservables.forEach(observable => observable.onChange(callback))
		}

		static notifyObserved(observable:IObservable<any>) {
			if (DependencyDetector.trackingStack.length)
				DependencyDetector.trackingStack[0].push(observable);
		}
	}
}
