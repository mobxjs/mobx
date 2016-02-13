import {IObservableArray, IArrayChange, IArraySplice, isObservableArray} from "../types/observablearray";
import {ObservableMap, IObservableMapChange, isObservableMap} from "../types/observablemap";
import {IObjectChange, isObservableObject, observeObservableObject} from "../types/observableobject";
import {IObservableValue, observable} from "./observable";
import {ComputedValue} from "../core/computedvalue";
import {ObservableValue} from "../types/observablevalue";
import {Lambda, isPlainObject, invariant} from "../utils/utils";
import {autorun} from "../api/autorun";
import {isObservable} from "./isobservable";

export function observe<T>(observableArray: IObservableArray<T>, listener: (change: IArrayChange<T> | IArraySplice<T>) => void): Lambda;
export function observe<T>(observableMap: ObservableMap<T>, listener: (change: IObservableMapChange<T>) => void): Lambda;
export function observe(func: () => void): Lambda;
export function observe<T extends Object>(object: T, listener: (change: IObjectChange<any, T>) => void): Lambda;
export function observe<T extends Object, Y>(object: T, prop: string, listener: (newValue: Y, oldValue?: Y) => void): Lambda;
export function observe<T>(value: IObservableValue<T>, listener: (newValue: T, oldValue: T) => void, fireImmediately?: boolean): Lambda;
export function observe(thing, property?, listener?): Lambda {
	const fireImmediately = arguments[2] === true;
	const propError = "[mobservable.observe] the provided observable map has no key with name: " + property;
	if (typeof property === "function") {
		listener = property;
		property = undefined;
	}
	if (isObservableArray(thing))
		return thing.observe(listener);
	if (isObservableMap(thing)) {
		if (property !== undefined) {
			if (!thing._has(property))
				throw new Error(propError);
			return observe(thing._data[property], listener);
		} else {
			return thing.observe(listener);
		}
	}
	if (isObservableObject(thing)) {
		if (property !== undefined) {
			if (!isObservable(thing, property))
				throw new Error(propError);
			return observe(thing.$mobservable.values[property], listener);
		}
		return observeObservableObject(thing, listener);
	}
	if (thing instanceof ObservableValue || thing instanceof ComputedValue)
		return observeObservableValue(thing, listener, fireImmediately);
	if (thing.$mobservable instanceof ObservableValue || thing.$mobservable instanceof ComputedValue)
		return observeObservableValue(thing.$mobservable, listener, fireImmediately);
	if (isPlainObject(thing))
		return observeObservableObject(<any> observable(<Object> thing), listener);
	invariant(false, "first argument of observabe should be some observable value or plain object");
}

function observeObservableValue<T>(observable: ObservableValue<T>|ComputedValue<T>, listener: (newValue: T, oldValue: T) => void, fireImmediately?: boolean): Lambda {
	let firstTime = true;
	let prevValue = undefined;
	return autorun(() => {
		let newValue = observable.get();
		if (!firstTime || fireImmediately) {
			listener(newValue, prevValue);
		}
		firstTime = false;
		prevValue = newValue;
	});
}