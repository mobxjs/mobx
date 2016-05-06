import {ObservableValue, UNCHANGED} from "./observablevalue";
import {ComputedValue} from "../core/computedvalue";
import {ValueMode, AsStructure} from "./modifiers";
import {Lambda, invariant, assertPropertyConfigurable, isPlainObject} from "../utils/utils";
import {getNextId} from "../core/globalstate";
import {throwingComputedValueSetter} from "../api/computeddecorator";
import {hasInterceptors, IInterceptable, registerInterceptor, interceptChange} from "./intercept-utils";
import {IListenable, registerListener, hasListeners, notifyListeners} from "./listen-utils";
import {isSpyEnabled, spyReportStart, spyReportEnd} from "../core/spy";

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

export interface IObservableObjectAdministration extends IInterceptable<IObjectWillChange>, IListenable {
	type: Object;
	target: any;
	name: string;
	id: number;
	mode: ValueMode;
	values: {[key: string]: ObservableValue<any>|ComputedValue<any>};
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
		id: getNextId(),
		target, name, mode,
		interceptors: null,
		intercept: interceptObjectChange,
		changeListeners: null
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

function defineObservableProperty(adm: IObservableObjectAdministration, propName: string, newValue) {
	assertPropertyConfigurable(adm.target, propName);

	let observable: ComputedValue<any>|ObservableValue<any>;
	let name = `${adm.name}@${adm.id} / Prop "${propName}"`;
	let isComputed = true;

	if (typeof newValue === "function" && newValue.length === 0)
		observable = new ComputedValue(newValue, adm.target, false, name);
	else if (newValue instanceof AsStructure && typeof newValue.value === "function" && newValue.value.length === 0)
		observable = new ComputedValue(newValue.value, adm.target, true, name);
	else {
		isComputed = false;
		if (hasInterceptors(adm)) {
			const change = interceptChange<IObjectWillChange>(adm, {
				object: adm.target,
				name: propName,
				type: "add",
				newValue
			});
			if (!change)
				return;
			newValue = change.newValue;
		}
		observable = new ObservableValue(newValue, adm.mode, name);
		newValue = (observable as any).value; // observableValue might have changed it
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

	if (!isComputed)
		notifyPropertyAddition(adm, adm.target, name, newValue);
}

function createSetter(adm: IObservableObjectAdministration, observable: ObservableValue<any>, name: string) {
	return function (newValue) {

		// intercept
		if (hasInterceptors(adm)) {
			const change = interceptChange<IObjectWillChange>(adm, {
				type: "update",
				object: this,
				name, newValue
			});
			if (!change)
				return;
			newValue = change.newValue;
		}
		newValue = observable.prepareNewValue(newValue);

		// notify spy & observers
		if (newValue !== UNCHANGED) {
			const notify = hasListeners(adm);
			const notifySpy = isSpyEnabled();
			const change = notifyListeners || hasListeners ? {
					type: "update",
					object: this,
					oldValue: (observable as any).value,
					name, newValue
				} : null;

			if (notifySpy)
				spyReportStart(change);
			observable.setNewValue(newValue);
			if (notify)
				notifyListeners(adm, change);
			if (notifySpy)
				spyReportEnd();
		}
	};
}

function notifyPropertyAddition(adm, object, name: string, newValue) {
	const notify = hasListeners(adm);
	const notifySpy = isSpyEnabled();
	const change = notify || notifySpy ? {
			type: "add",
			object, name, newValue
		} : null;

	if (notifySpy)
		spyReportStart(change);
	if (notify)
		notifyListeners(adm, change);
	if (notifySpy)
		spyReportEnd();
}

/**
	* Observes this object. Triggers for the events 'add', 'update' and 'delete'.
	* See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/observe 
	* for callback details
	*/
export function observeObservableObject(object: IIsObservableObject, callback: (changes: IObjectDidChange) => void, fireImmediately?: boolean): Lambda {
	invariant(isObservableObject(object), "Expected observable object");
	invariant(fireImmediately !== true, "`observe` doesn't support the fire immediately property for observable objects.");
	return registerListener(object.$mobx, callback);
}

export function isObservableObject(thing): boolean {
	return thing && thing.$mobx && thing.$mobx.type === ObservableObjectMarker;
}

function interceptObjectChange(handler): Lambda {
	return registerInterceptor(this, handler);
}