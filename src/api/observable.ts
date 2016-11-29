import {ObservableValue, IObservableValue} from "../types/observablevalue";
import {recursiveModifier} from "../types/modifiers2";
import {createObservableArray, IObservableArray} from "../types/observablearray";
import {extendObservable} from "./extendobservable";
import {isPlainObject, invariant} from "../utils/utils";
import {observableDecorator} from "./observabledecorator";
import {isObservable} from "./isobservable";
import {IObservableObject} from "../types/observableobject";

/**
 * Turns an object, array or function into a reactive structure.
 * @param value the value which should become observable.
 */
export function observable<T>(): IObservableValue<T>;
export function observable(target: Object, key: string, baseDescriptor?: PropertyDescriptor): any;
export function observable<T>(value: T[]): IObservableArray<T>;
export function observable<T extends string|number|boolean|Date|RegExp|Function|void>(value: T): IObservableValue<T>;
export function observable<T extends Object>(value: T): T & IObservableObject;
export function observable(v: any = undefined) {
	if (typeof arguments[1] === "string")
		return observableDecorator.apply(null, arguments);

	invariant(arguments.length < 3, "observable expects zero, one or two arguments");
	if (isObservable(v))
		return v;

	if (Array.isArray(v))
		return createObservableArray(v, recursiveModifier);
	if (isPlainObject(v))
		return extendObservable({}, v);
	return new ObservableValue(v, recursiveModifier);
}
