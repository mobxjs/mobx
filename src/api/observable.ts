import {IObservableValue} from "../types/observablevalue";
import {IObservableArray} from "../types/observablearray";
import {isPlainObject, invariant} from "../utils/utils";
import {observableDecorator} from "./observabledecorator";
import {isObservable} from "./isobservable";
import {IObservableObject} from "../types/observableobject";
import {modifiers, IModifier, isModifier, isModifierDescriptor} from "../types/modifiers";

/**
 * Turns an object, array or function into a reactive structure.
 * @param value the value which should become observable.
 */
function toObservable(v: any = undefined) {
	if (typeof arguments[1] === "string" || isModifier(arguments[0]))
		return observableDecorator.apply(null, arguments);

	invariant(arguments.length < 3, "observable expects zero or one arguments");

	if (isModifierDescriptor(v))
		return v.modifier.implementation(v.initialValue);

	if (isObservable(v))
		return v;
	if (isPlainObject(v) || Array.isArray(v))
		return modifiers.recursive.implementation(v);
	return modifiers.box.implementation(v);
}

export interface IObservableFactory {
	// observable overloads
	<T>(): IObservableValue<T>;
	(target: Object, key: string, baseDescriptor?: PropertyDescriptor): any;
	<T>(value: T[], modifier?: IModifier<T, T>): IObservableArray<T>;
	<T extends string|number|boolean|Date|RegExp|Function|void>(value: T, modifier?: IModifier<T, T>): IObservableValue<T>;
	<T extends Object>(value: T, modifier?: IModifier<T, T>): T & IObservableObject;

	// convenience decorator for observable + modifier
	// handles:
	// @observable.ref field = value (rewrites to @observable(modifier.ref))
	ref(target: Object, key: string, baseDescriptor: PropertyDescriptor): PropertyDescriptor;
	box(target: Object, key: string, baseDescriptor: PropertyDescriptor): PropertyDescriptor;
	shallow(target: Object, key: string, baseDescriptor: PropertyDescriptor): PropertyDescriptor;
	map(target: Object, key: string, baseDescriptor: PropertyDescriptor): PropertyDescriptor;
	shallowMap(target: Object, key: string, baseDescriptor: PropertyDescriptor): PropertyDescriptor;
	recursive(target: Object, key: string, baseDescriptor: PropertyDescriptor): PropertyDescriptor;
	structure(target: Object, key: string, baseDescriptor: PropertyDescriptor): PropertyDescriptor;
}

export var observable: IObservableFactory = toObservable as any;
