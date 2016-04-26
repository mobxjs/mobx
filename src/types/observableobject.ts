import {ObservableValue} from "./observablevalue";
import {ComputedValue} from "../core/computedvalue";
import {ValueMode, AsStructure} from "./modifiers";
import {Lambda, invariant, assertPropertyConfigurable, isPlainObject} from "../utils/utils";
import {SimpleEventEmitter} from "../utils/simpleeventemitter";
import {getNextId} from "../core/globalstate";
import {throwingComputedValueSetter} from "../api/computeddecorator";
import {hasInterceptors, IInterceptable, registerInterceptor, interceptChange} from "../core/interceptable";

export interface IObjectDidChange {
	name: string;
	object: any;
	type: "update" | "add";
	oldValue?: any;
}

export interface IObjectWillChange {
	object: any;
	type: "update" | "add";
	name: string;
	newValue: any;
}

const ObservableObjectMarker = {};

export interface IObservableObjectAdministration extends IInterceptable<IObjectWillChange> {
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

export function asObservableObject(target, name: string, mode: ValueMode = ValueMode.Recursive): IObservableObjectAdministration {
	if (target.$mobx) {
		if (target.$mobx.type !== ObservableObjectMarker)
			throw new Error("The given object is observable but not an observable object");
		return target.$mobx;
	}

	if (!isPlainObject(target))
		name = target.constructor.name;
	if (!name)
		name = "ObservableObject";

	const adm: IObservableObjectAdministration = {
		type: ObservableObjectMarker,
		values: {},
		events: undefined,
		id: getNextId(),
		target, name, mode,
		interceptors: null,
		intercept: interceptObjectChange
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
		if (hasInterceptors(adm)) {
			const change = interceptChange<IObjectWillChange>(adm, {
				object: adm.target,
				name: propName,
				type: "add",
				newValue: value
			});
			if (!change)
				return;
			value = change.newValue;
		}
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
			: createSetter(adm, observable as ObservableValue<any>, propName)
	});

	if (!isComputed) {
		if (adm.events !== undefined) {
			adm.events.emit(<IObjectDidChange> {
				type: "add",
				object: adm.target,
				name: propName,
				newValue: value
			});
		};
	}
}

function createSetter(adm: IObservableObjectAdministration, observable: ObservableValue<any>, propName: string) {
	return function (newValue) {
		const oldValue = (observable as any).value;
		if (hasInterceptors(adm)) {
			const change = interceptChange(adm, {
				object: this,
				name: propName,
				newValue
			});
			if (!change)
				return;
			newValue = change.newValue;
		}
		const changed = observable.set(newValue);
		if (changed && adm.events !== undefined) {
			adm.events.emit(<IObjectDidChange> {
				type: "update",
				object: this,
				name: propName,
				newValue,
				oldValue
			});
		}
	};
}

/**
	* Observes this object. Triggers for the events 'add', 'update' and 'delete'.
	* See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/observe 
	* for callback details
	*/
export function observeObservableObject(object: IIsObservableObject, callback: (changes: IObjectDidChange) => void, fireImmediately?: boolean): Lambda {
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

function interceptObjectChange(handler): Lambda {
	return registerInterceptor(this, handler);
}