import {IObservableArray, IArrayDidChange, IArrayDidSplice, isObservableArray} from "../types/observablearray";
import {ObservableMap, IMapDidChange, isObservableMap} from "../types/observablemap";
import {IObjectDidChange, isObservableObject, observeObservableObject} from "../types/observableobject";
import {IObservableValue, observable} from "./observable";
import {ComputedValue} from "../core/computedvalue";
import {ObservableValue} from "../types/observablevalue";
import {Lambda, isPlainObject, invariant} from "../utils/utils";
import {isObservable} from "./isobservable";
import {extendObservable} from "./extendobservable";

export function observe<T>(value: IObservableValue<T>, listener: (newValue: T, oldValue: T) => void, fireImmediately?: boolean): Lambda;
export function observe<T>(observableArray: IObservableArray<T>, listener: (change: IArrayDidChange<T> | IArrayDidSplice<T>) => void, fireImmediately?: boolean): Lambda;
export function observe<T>(observableMap: ObservableMap<T>, listener: (change: IMapDidChange<T>) => void, fireImmediately?: boolean): Lambda;
export function observe<T>(observableMap: ObservableMap<T>, property: string, listener: (newValue: T, oldValue: T) => void, fireImmediately?: boolean): Lambda;
export function observe(object: Object, listener: (change: IObjectDidChange) => void, fireImmediately?: boolean): Lambda;
export function observe(object: Object, property: string, listener: (newValue: any, oldValue: any) => void, fireImmediately?: boolean): Lambda;
export function observe(thing, propOrCb?, cbOrFire?, fireImmediately?): Lambda {
	if (typeof cbOrFire === "function")
		return observeObservableProperty(thing, propOrCb, cbOrFire, fireImmediately);
	else
		return observeObservable(thing, propOrCb, cbOrFire);
}

function observeObservable(thing, listener, fireImmediately: boolean) {
	if (isObservableArray(thing))
		return thing.observe(listener);
	if (isObservableMap(thing))
		return thing.observe(listener);
	if (isObservableObject(thing))
		return observeObservableObject(thing, listener, fireImmediately);
	if (thing instanceof ObservableValue || thing instanceof ComputedValue)
		return thing.observe(listener, fireImmediately);
	if (isPlainObject(thing))
		return observeObservable(observable(<Object> thing), listener, fireImmediately);
	invariant(false, "first argument of observe should be some observable value or plain object");
}

function observeObservableProperty(thing, property, listener, fireImmediately: boolean) {
	const propError = "[mobx.observe] the provided observable map has no key with name: " + property;
	if (isObservableMap(thing)) {
		if (!thing._has(property))
			throw new Error(propError);
		return observe(thing._data[property], listener);
	}
	if (isObservableObject(thing)) {
		if (!isObservable(thing, property))
			throw new Error(propError);
		return observe(thing.$mobx.values[property], listener, fireImmediately);
	}
	if (isPlainObject(thing)) {
		extendObservable(thing, {
			property: thing[property]
		});
		return observeObservableProperty(thing, property, listener, fireImmediately);
	}
	invariant(false, "first argument of observe should be an (observable)object or observableMap if a property name is given");
}