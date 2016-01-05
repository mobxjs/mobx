/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
import ObservableValue from "./types/observablevalue";
import ComputedValue from "./core/computedvalue";
import {ValueMode, makeChildObservable, AsStructure} from './core';
import {IObjectChange, Lambda} from './interfaces';
import SimpleEventEmitter from './simpleeventemitter';

// responsible for the administration of objects that have become reactive
export class ObservableObject { // TODO: implement IObservable
	values:{[key:string]:ObservableValue<any>|ComputedValue<any>} = {};
	private _events = new SimpleEventEmitter();

	constructor(private target, private name:string, private mode: ValueMode) {
		if (target.$mobservable)
			throw new Error("Illegal state: already an reactive object");

		Object.defineProperty(target, "$mobservable", {
			enumerable: false,
			configurable: false,
			value: this
		});
	}
	static asReactive(target, name: string, mode:ValueMode):ObservableObject {
		if (target.$mobservable)
			return target.$mobservable;
		return new ObservableObject(target, name, mode);
	}

	set(propName, value) {
		if (this.values[propName])
			this.target[propName] = value; // the property setter will make 'value' reactive if needed.
		else
			this.defineReactiveProperty(propName, value);
	}

	private defineReactiveProperty(propName, value) {
		let observable: ComputedValue<any>|ObservableValue<any>;
		let name = `${this.name || ""}.${propName}`;

		if (typeof value === "function" && value.length === 0)
			observable = new ComputedValue(value, this.target, name, false);
		else if (value instanceof AsStructure && typeof value.value === "function" && value.value.length === 0)
			observable = new ComputedValue(value.value, this.target, name, true);
		else
			observable = new ObservableValue(value, this.mode, name);

		this.values[propName] = observable;
		Object.defineProperty(this.target, propName, {
			configurable: true,
			enumerable: observable instanceof ObservableValue,
			get: function() {
				return this.$mobservable ? this.$mobservable.values[propName].get() : undefined;
			},
			set: function(newValue) {
				const oldValue = this.$mobservable.values[propName].get();
				this.$mobservable.values[propName].set(newValue);
				this.$mobservable._events.emit(<IObjectChange<any, any>>{ 
					type: "update",
					object: this,
					name: propName,
					oldValue
				});
			}
		});

		this._events.emit(<IObjectChange<any, any>>{ 
			type: "add",
			object: this.target,
			name: propName
		});
	}

	/**
	 * Observes this object. Triggers for the events 'add', 'update' and 'delete'.
	 * See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/observe 
	 * for callback details
	 */
	observe(callback: (changes:IObjectChange<any, any>) => void): Lambda {
		return this._events.on(callback);
	}
}