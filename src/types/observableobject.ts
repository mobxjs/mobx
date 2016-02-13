/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
import {ObservableValue} from "./observablevalue";
import {ComputedValue} from "../core/computedvalue";
import {ValueMode, AsStructure} from "./modifiers";
import {Lambda, invariant} from "../utils/utils";
import {SimpleEventEmitter} from "../utils/simpleeventemitter";
import {getNextId} from "../core/globalstate";

export interface IObjectChange<T, R> {
	name: string;
	object: R;
	type: string;
	oldValue?: T;
}

const ObservableObjectMarker = {};

export interface IObservableObjectAdministration {
	type: Object;
	target: any;
	name: string;
	mode: ValueMode;
	values: {[key: string]: ObservableValue<any>|ComputedValue<any>};
	_events: SimpleEventEmitter;
}

export interface IIsObservableObject {
	$mobservable: IObservableObjectAdministration;
}

export function asObservableObject(target, name: string = "" /* TODO: "ObservableObject" + getNextId() */, mode: ValueMode = ValueMode.Recursive): IObservableObjectAdministration {
	if (target.$mobservable) {
		if (target.$mobservable.type !== ObservableObjectMarker)
			throw new Error("The given object is observable but not an observable object");
		return target.$mobservable;
	}
	const adm: IObservableObjectAdministration = {
		type: ObservableObjectMarker,
		values: {},
		_events: new SimpleEventEmitter(), // TODO create lazy, rename
		target, name, mode
	};
	Object.defineProperty(target, "$mobservable", {
		enumerable: false,
		configurable: false,
		writable: false,
		value: adm
	});
	return adm;
}

export function setObservableObjectProperty(adm: IObservableObjectAdministration, propName: string, value) {
	if (adm.values[propName])
		adm.target[propName] = value; // the property setter will make 'value' reactive if needed.
	else
		defineObservableProperty(adm, propName, value);
}

function defineObservableProperty(adm: IObservableObjectAdministration, propName: string, value) {
	let observable: ComputedValue<any>|ObservableValue<any>;
	let name = `${adm.name}.${propName}`;

	if (typeof value === "function" && value.length === 0)
		observable = new ComputedValue(value, adm.target, name, false);
	else if (value instanceof AsStructure && typeof value.value === "function" && value.value.length === 0)
		observable = new ComputedValue(value.value, adm.target, name, true);
	else
		observable = new ObservableValue(value, adm.mode, name);

	adm.values[propName] = observable;
	Object.defineProperty(adm.target, propName, {
		configurable: true,
		enumerable: observable instanceof ObservableValue,
		get: function() {
			// TODO: why the ternary if?
			return this.$mobservable ? this.$mobservable.values[propName].get() : undefined;
		},
		set: function(newValue) {
			const self = <IObservableObjectAdministration> this.$mobservable; // TODO: faster to just use adm?
			const oldValue = self.values[propName].get();
			self.values[propName].set(newValue);
			self._events.emit(<IObjectChange<any, any>> {
				type: "update",
				object: this,
				name: propName,
				oldValue
			});
		}
	});

	adm._events.emit(<IObjectChange<any, any>> {
		type: "add",
		object: adm.target,
		name: propName
	});
}

/**
	* Observes this object. Triggers for the events 'add', 'update' and 'delete'.
	* See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/observe 
	* for callback details
	*/
export function observeObservableObject(object: IIsObservableObject, callback: (changes: IObjectChange<any, any>) => void): Lambda {
	invariant(isObservableObject(object), "Expected observable object");
	return object.$mobservable._events.on(callback);
}

export function isObservableObject(thing): boolean {
	return thing && thing.$mobservable && thing.$mobservable.type === ObservableObjectMarker;
}
