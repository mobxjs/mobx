import {IInterceptor} from "../types/intercept-utils";
import {IObservableArray, IArrayWillChange, IArrayWillSplice} from "../types/observablearray";
import {ObservableMap, IMapWillChange} from "../types/observablemap";
import {IObjectWillChange, isObservableObject} from "../types/observableobject";
import {IObservableValue, observable} from "./observable";
import {IValueWillChange} from "../types/observablevalue";
import {Lambda, isPlainObject, deprecated} from "../utils/utils";
import {extendObservable} from "./extendobservable";
import {getAdministration} from "./extras";

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
	if (isPlainObject(thing) && !isObservableObject(thing)) {
		deprecated("Passing plain objects to intercept / observe is deprecated and will be removed in 3.0");
		return getAdministration(observable(thing) as any).intercept(handler);
	}
	return getAdministration(thing).intercept(handler);
}

function interceptProperty(thing, property, handler) {
	if (isPlainObject(thing) && !isObservableObject(thing)) {
		deprecated("Passing plain objects to intercept / observe is deprecated and will be removed in 3.0");
		extendObservable(thing, {
			property: thing[property]
		});
		return interceptProperty(thing, property, handler);
	}
	return getAdministration(thing, property).intercept(handler);
}
