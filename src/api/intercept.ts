import {IInterceptor} from "../types/interceptable";
import {IObservableArray, IArrayWillChange, IArrayWillSplice, isObservableArray} from "../types/observablearray";
import {ObservableMap, IMapWillChange, isObservableMap} from "../types/observablemap";
import {IObjectWillChange, IIsObservableObject, isObservableObject} from "../types/observableobject";
import {IObservableValue, observable} from "./observable";
import {ObservableValue, IValueWillChange} from "../types/observablevalue";
import {Lambda, isPlainObject, invariant} from "../utils/utils";
import {isObservable} from "./isobservable";
import {extendObservable} from "./extendobservable";

export function intercept<T>(value: IObservableValue<T>, handler: IInterceptor<IValueWillChange<T>>): Lambda;
export function intercept<T>(observableArray: IObservableArray<T>, handler: IInterceptor<IArrayWillChange<T> | IArrayWillSplice<T>>): Lambda;
export function intercept<T>(observableMap: ObservableMap<T>, handler: IInterceptor<IMapWillChange<T>>): Lambda;
export function intercept<T>(observableMap: ObservableMap<T>, property: string, handler: IInterceptor<IValueWillChange<T>>): Lambda;
export function intercept(object: Object, handler: IInterceptor<IObjectWillChange>): Lambda;
export function intercept(object: Object, property: string, handler: IInterceptor<IValueWillChange<any>>): Lambda;
export function intercept(thing, propOrHandler?, handler?): Lambda {
	if (typeof handler === "function")
		return interceptProperty(thing, propOrHandler, handler);
	else
		return interceptInterceptable(thing, propOrHandler);
}

function interceptInterceptable(thing, handler) {
	if (isObservableArray(thing))
		return thing.intercept(handler);
	if (isObservableMap(thing))
		return thing.intercept(handler);
	if (thing instanceof ObservableValue)
		return thing.intercept(handler);
	if (isPlainObject(thing) || isObservableObject(thing))
		return (observable(thing) as any as IIsObservableObject).$mobx.intercept(handler);
	invariant(false, "first argument of intercept should be some observable value or plain object");
}

function interceptProperty(thing, property, handler) {
	const propError = "[mobx.intercept] the provided observable map has no key with name: " + property;
	if (isObservableMap(thing)) {
		if (!thing._has(property))
			throw new Error(propError);
		return interceptInterceptable(thing._data[property], handler);
	}
	if (isObservableObject(thing)) {
		if (!isObservable(thing, property))
			throw new Error(propError);
		return interceptInterceptable(thing.$mobx.values[property], handler);
	}
	if (isPlainObject(thing)) {
		extendObservable(thing, {
			property: thing[property]
		});
		return interceptProperty(thing, property, handler);
	}
	invariant(false, "first argument of intercept should be an (observable)object or observableMap if a property name is given");
}
