/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
import {DataNode} from './dnode';
import {ValueMode, makeChildObservable, AsStructure} from './core';
import {IContextInfoStruct, IObjectChange, Lambda} from './interfaces';
import {ObservableView} from './observableview';
import {ObservableValue} from './observablevalue';
import SimpleEventEmitter from './simpleeventemitter';

// responsible for the administration of objects that have become reactive
export class ObservableObject {
	values:{[key:string]:DataNode} = {};
	private _events = new SimpleEventEmitter();

	constructor(private target, private context:IContextInfoStruct, private mode: ValueMode) {
		if (target.$mobservable)
			throw new Error("Illegal state: already an reactive object");
		if (!context) {
			this.context = {
				object: target,
				name: ""
			};
		} else if (!context.object) {
			context.object = target;
		}

		Object.defineProperty(target, "$mobservable", {
			enumerable: false,
			configurable: false,
			value: this
		});
	}
	static asReactive(target, context:IContextInfoStruct, mode:ValueMode):ObservableObject {
		if (target.$mobservable)
			return target.$mobservable;
		return new ObservableObject(target, context, mode);
	}

	set(propName, value) {
		if (this.values[propName])
			this.target[propName] = value; // the property setter will make 'value' reactive if needed.
		else
			this.defineReactiveProperty(propName, value);
	}

	private defineReactiveProperty(propName, value) {
		let observable: ObservableView<any>|ObservableValue<any>;
		let context = {
			object: this.context.object,
			name: `${this.context.name || ""}.${propName}`
		};

		if (typeof value === "function" && value.length === 0)
			observable = new ObservableView(value, this.target, context, false);
		else if (value instanceof AsStructure && typeof value.value === "function" && value.value.length === 0)
			observable = new ObservableView(value.value, this.target, context, true);
		else
			observable = new ObservableValue(value, this.mode, context);

		this.values[propName] = observable;
		Object.defineProperty(this.target, propName, {
			configurable: true,
			enumerable: observable instanceof ObservableValue,
			get: function() {
				return this.$mobservable ? this.$mobservable.values[propName].get() : undefined;
			},
			set: function(newValue) {
				const oldValue = this.$mobservable.values[propName].get();
				this.$mobservable._events.emit(<IObjectChange<any, any>>{
					type: "preupdate",
					object: this,
					name: propName,
					newValue,
					oldValue
				});
				this.$mobservable.values[propName].set(newValue);
				this.$mobservable._events.emit(<IObjectChange<any, any>>{
					type: "update",
					object: this,
					name: propName,
					newValue,
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
