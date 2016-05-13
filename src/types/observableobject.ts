import {ObservableValue, UNCHANGED} from "./observablevalue";
import {ComputedValue} from "../core/computedvalue";
import {ValueMode, AsStructure} from "./modifiers";
import {Lambda, invariant, assertPropertyConfigurable, isPlainObject} from "../utils/utils";
import {getNextId} from "../core/globalstate";
import {throwingComputedValueSetter} from "../api/computeddecorator";
import {hasInterceptors, IInterceptable, registerInterceptor, interceptChange} from "./intercept-utils";
import {IListenable, registerListener, hasListeners, notifyListeners} from "./listen-utils";
import {isSpyEnabled, spyReportStart, spyReportEnd} from "../core/spy";
import {isObservable} from "../api/isobservable";

// In 3.0, change to IObjectDidChange
export interface IObjectChange {
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

export class ObservableObjectAdministration implements IInterceptable<IObjectWillChange>, IListenable {
	values: {[key: string]: ObservableValue<any>|ComputedValue<any>} = {};
	changeListeners = null;
	interceptors = null;

	constructor(public target: any, public name: string, public mode: ValueMode) { }

	/**
		* Observes this object. Triggers for the events 'add', 'update' and 'delete'.
		* See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/observe 
		* for callback details
		*/
	observe(callback: (changes: IObjectChange) => void, fireImmediately?: boolean): Lambda {
		invariant(fireImmediately !== true, "`observe` doesn't support the fire immediately property for observable objects.");
		return registerListener(this, callback);
	}


	intercept(handler): Lambda {
		return registerInterceptor(this, handler);
	}
}

export interface IIsObservableObject {
	$mobx: ObservableObjectAdministration;
}

export function asObservableObject(target, name: string, mode: ValueMode = ValueMode.Recursive): ObservableObjectAdministration {
	if (isObservableObject(target))
		return target.$mobx;

	if (!isPlainObject(target))
		name = target.constructor.name + "@" + getNextId();
	if (!name)
		name = "ObservableObject@" + getNextId();

	const adm = new ObservableObjectAdministration(target, name, mode);
	Object.defineProperty(target, "$mobx", {
		enumerable: false,
		configurable: false,
		writable: false,
		value: adm
	});
	return adm;
}

export function setObservableObjectProperty(adm: ObservableObjectAdministration, propName: string, value) {
	if (adm.values[propName])
		adm.target[propName] = value; // the property setter will make 'value' reactive if needed.
	else
		defineObservableProperty(adm, propName, value);
}

function defineObservableProperty(adm: ObservableObjectAdministration, propName: string, newValue) {
	assertPropertyConfigurable(adm.target, propName);

	let observable: ComputedValue<any>|ObservableValue<any>;
	let name = `${adm.name}.${propName}`;
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
		observable = new ObservableValue(newValue, adm.mode, name, false);
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
		notifyPropertyAddition(adm, adm.target, propName, newValue);
}

function createSetter(adm: ObservableObjectAdministration, observable: ObservableValue<any>, name: string) {
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

export function isObservableObject(thing): boolean {
	return thing && thing.$mobx instanceof ObservableObjectAdministration;
}
