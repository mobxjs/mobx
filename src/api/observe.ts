import {IObservableArray, IArrayChange, IArraySplice} from "../types/observablearray";
import {ObservableMap, IMapChange} from "../types/observablemap";
import {IObjectChange, isObservableObject} from "../types/observableobject";
import {IObservableValue, observable} from "./observable";
import {Lambda, isPlainObject, deprecated} from "../utils/utils";
import {extendObservable} from "./extendobservable";
import {getAdministration} from "./extras";

export function observe<T>(value: IObservableValue<T>, listener: (newValue: T, oldValue: T) => void, fireImmediately?: boolean): Lambda;
export function observe<T>(observableArray: IObservableArray<T>, listener: (change: IArrayChange<T> | IArraySplice<T>) => void, fireImmediately?: boolean): Lambda;
export function observe<T>(observableMap: ObservableMap<T>, listener: (change: IMapChange<T>) => void, fireImmediately?: boolean): Lambda;
export function observe<T>(observableMap: ObservableMap<T>, property: string, listener: (newValue: T, oldValue: T) => void, fireImmediately?: boolean): Lambda;
export function observe(object: Object, listener: (change: IObjectChange) => void, fireImmediately?: boolean): Lambda;
export function observe(object: Object, property: string, listener: (newValue: any, oldValue: any) => void, fireImmediately?: boolean): Lambda;
export function observe(thing, propOrCb?, cbOrFire?, fireImmediately?): Lambda {
	if (typeof cbOrFire === "function")
		return observeObservableProperty(thing, propOrCb, cbOrFire, fireImmediately);
	else
		return observeObservable(thing, propOrCb, cbOrFire);
}

function observeObservable(thing, listener, fireImmediately: boolean) {
	if (isPlainObject(thing) && !isObservableObject(thing)) {
		deprecated("Passing plain objects to intercept / observe is deprecated and will be removed in 3.0");
		return getAdministration(observable(thing) as any).observe(listener, fireImmediately);
	}
	return getAdministration(thing).observe(listener, fireImmediately);
}

function observeObservableProperty(thing, property, listener, fireImmediately: boolean) {
	if (isPlainObject(thing) && !isObservableObject(thing)) {
		deprecated("Passing plain objects to intercept / observe is deprecated and will be removed in 3.0");
		extendObservable(thing, {
			property: thing[property]
		});
		return observeObservableProperty(thing, property, listener, fireImmediately);
	}
	return getAdministration(thing, property).observe(listener, fireImmediately);
}