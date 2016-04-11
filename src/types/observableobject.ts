import {ObservableValue} from "./observablevalue";
import {ComputedValue} from "../core/computedvalue";
import {ValueMode, AsStructure} from "./modifiers";
import {Lambda, invariant, assertPropertyConfigurable} from "../utils/utils";
import {SimpleEventEmitter} from "../utils/simpleeventemitter";
import {getNextId} from "../core/globalstate";
import {throwingComputedValueSetter} from "../api/computeddecorator";

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
	id: number;
	mode: ValueMode;
	values: {[key: string]: ObservableValue<any>|ComputedValue<any>};
	events: SimpleEventEmitter;
}

export interface IIsObservableObject {
	$mobx: IObservableObjectAdministration;
}

export function asObservableObject(target, name: string = "ObservableObject", mode: ValueMode = ValueMode.Recursive): IObservableObjectAdministration {
	if (target.$mobx) {
		if (target.$mobx.type !== ObservableObjectMarker)
			throw new Error("The given object is observable but not an observable object");
		return target.$mobx;
	}
	const adm: IObservableObjectAdministration = {
		type: ObservableObjectMarker,
		values: {},
		events: undefined,
		id: getNextId(),
		target, name, mode
	};
	Object.defineProperty(target, "$mobx", {
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
	assertPropertyConfigurable(adm.target, propName);

	let observable: ComputedValue<any>|ObservableValue<any>;
	let name = `${adm.name}@${adm.id} / Prop "${propName}"`;
	let isComputed = true;

	if (typeof value === "function" && value.length === 0)
		observable = new ComputedValue(value, adm.target, false, name);
	else if (value instanceof AsStructure && typeof value.value === "function" && value.value.length === 0)
		observable = new ComputedValue(value.value, adm.target, true, name);
	else {
		isComputed = false;
		observable = new ObservableValue(value, adm.mode, name);
	}

	adm.values[propName] = observable;
	Object.defineProperty(adm.target, propName, {
		configurable: true,
		enumerable: !isComputed,
		get: function() {
			return observable.get();
		},
		set: isComputed
			? throwingComputedValueSetter
			: function(newValue) {
				const oldValue = (observable as any).value;
				if (adm.events) {
					adm.events.emit(<IObjectChange<any, any>> {
						type: "preupdate",
						object: this,
						name: propName,
						oldValue,
						newValue
					});
				}
				if (observable.set(newValue) && adm.events !== undefined) {
					adm.events.emit(<IObjectChange<any, any>> {
						type: "update",
						object: this,
						name: propName,
						oldValue
					});
				}
			}
	});

	if (adm.events !== undefined) {
		adm.events.emit(<IObjectChange<any, any>> {
			type: "add",
			object: adm.target,
			name: propName
		});
	};
}

/**
	* Observes this object. Triggers for the events 'add', 'update' and 'delete'.
	* See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/observe
	* for callback details
	*/
export function observeObservableObject(object: IIsObservableObject, callback: (changes: IObjectChange<any, any>) => void, fireImmediately?: boolean): Lambda {
	invariant(isObservableObject(object), "Expected observable object");
	invariant(fireImmediately !== true, "`observe` doesn't support the fire immediately property for observable objects.");
	const adm = object.$mobx;
	if (adm.events === undefined)
		adm.events = new SimpleEventEmitter();
	return object.$mobx.events.on(callback);
}

export function isObservableObject(thing): boolean {
	return thing && thing.$mobx && thing.$mobx.type === ObservableObjectMarker;
}
