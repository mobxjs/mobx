import { isObservable } from "../api/isobservable";
import { observable } from "../api/observable";
import { fail, isPlainObject } from "../utils/utils";
import { isObservableObject } from "./observableobject";
import { isObservableArray } from "./observablearray";

export interface IEnhancer<T> {
	(newValue: T): T;
}

export interface IModifierDescriptor<T> {
	isMobxModifierDescriptor: boolean;
	initialValue: T | undefined;
	enhancer: IEnhancer<T>;
}

export function isModifierDescriptor(thing): thing is IModifierDescriptor<any> {
	return typeof thing === "object" && thing !== null && thing.isMobxModifierDescriptor === true;
}

export function createModifierDescriptor<T>(enhancer: IEnhancer<T>, initialValue: T): IModifierDescriptor<T> {
	return {
		isMobxModifierDescriptor: true,
		initialValue,
		enhancer
	};
}

export function deepEnhancer(v) {
	if (isModifierDescriptor(v))
		fail("You tried to assign a modifier wrapped value to a collection, please define modifiers when creating the collection, not when modifying it");

	// it is an observable already, done
	if (isObservable(v))
		return v;

	// something that can be converted and mutated?
	if (Array.isArray(v))
		return observable.array(v);
	if (isPlainObject(v))
		return observable.object(v);
	// TODO:
	// if (isES6Map(v))
		// return observable.map(v);

	return v;
}

export function shallowEnhancer(v): any {
	if (isModifierDescriptor(v))
		fail("You tried to assign a modifier wrapped value to a collection, please define modifiers when creating the collection, not when modifying it");

	if (v === undefined || v === null)
		return v;
	if (Array.isArray(v))
		return observable.shallowArray(v);
	if (isPlainObject(v))
		return observable.shallowObject(v);
	if (isObservableObject(v))
		return v;
	if (isObservableArray(v))
		return v;

	return fail("The shallow modifier / decorator can only used in combination with arrays and objects");
}

export function referenceEnhancer(newValue) {
	// never turn into an observable
	return newValue;
}
