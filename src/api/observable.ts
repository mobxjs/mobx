import {ObservableValue, IObservableValue} from "../types/observablevalue";
import {ValueMode, getValueModeFromValue, makeChildObservable} from "../types/modifiers";
import {computed} from "./computeddecorator";
import {isPlainObject, invariant, deprecated} from "../utils/utils";
import {observableDecorator} from "./observabledecorator";
import {isObservable} from "./isobservable";
import {IObservableObject} from "../types/observableobject";
import {IObservableArray, ObservableArray} from "../types/observablearray";

/**
 * Turns an object, array or function into a reactive structure.
 * @param value the value which should become observable.
 */
export function observable<T>(): IObservableValue<T>;
export function observable(target: Object, key: string, baseDescriptor?: PropertyDescriptor): any;
export function observable<T>(value: T[]): IObservableArray<T>;
export function observable<T, S extends Object>(value: () => T, thisArg?: S): IObservableValue<T>;
export function observable<T extends string|number|boolean|Date|RegExp|Function|void>(value: T): IObservableValue<T>;
export function observable<T extends Object>(value: T): T & IObservableObject;
export function observable(v: any = undefined, keyOrScope?: string | any) {
	if (typeof arguments[1] === "string")
		return observableDecorator.apply(null, arguments);

	invariant(arguments.length < 3, "observable expects zero, one or two arguments");
	if (isObservable(v))
		return v;

	let [mode, value] = getValueModeFromValue(v, ValueMode.Recursive);
	const sourceType = mode === ValueMode.Reference ? ValueType.Reference : getTypeOfValue(value);

	switch (sourceType) {
		case ValueType.Array:
		case ValueType.PlainObject:
			return makeChildObservable(value, mode);
		case ValueType.Reference:
		case ValueType.ComplexObject:
			return new ObservableValue(value, mode);
		case ValueType.ComplexFunction:
			throw new Error("[mobx.observable] To be able to make a function reactive it should not have arguments. If you need an observable reference to a function, use `observable(asReference(f))`");
		case ValueType.ViewFunction:
			deprecated("Use `computed(expr)` instead of `observable(expr)`");
			return computed(v, keyOrScope);
	}
	invariant(false, "Illegal State");
}

export enum ValueType { Reference, PlainObject, ComplexObject, Array, ViewFunction, ComplexFunction }

export function getTypeOfValue(value): ValueType {
	if (value === null || value === undefined)
		return ValueType.Reference;
	if (typeof value === "function")
		return value.length ? ValueType.ComplexFunction : ValueType.ViewFunction;
	if (Array.isArray(value) || value instanceof ObservableArray)
		return ValueType.Array;
	if (typeof value === "object")
		return isPlainObject(value) ? ValueType.PlainObject : ValueType.ComplexObject;
	return ValueType.Reference; // safe default, only refer by reference..
}
