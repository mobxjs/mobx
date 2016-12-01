import {IObservableValue, ObservableValue} from "../types/observablevalue";
import {IObservableArray} from "../types/observablearray";
import {isPlainObject, invariant, isObject} from "../utils/utils";
import {observableDecorator} from "./observabledecorator";
import {isObservable} from "./isobservable";
import {IObservableObject} from "../types/observableobject";
import {modifiers, IModifier, isModifier, isModifierDescriptor} from "../types/modifiers";
import {extendObservable} from "../api/extendobservable";
import {createObservableArray} from "../types/observablearray";

/**
 * Turns an object, array or function into a reactive structure.
 * @param value the value which should become observable.
 */
function toObservable(v: any = undefined, childModifier?) {
	// @observable someProp;
	if (typeof arguments[1] === "string")
		return observableDecorator.apply(null, arguments);

	// @observable(modifier) someProp
	if (arguments.length === 1 && isModifier(v))
		return observableDecorator.apply(null, arguments);

	// observable(modifiers.shallow([]))  etc..
	// TODO: deprecate this pattern. it is mostly relevant in MobX2
	if (isModifierDescriptor(v))
		return v.modifier.implementation(v.initialValue);

	// it is an observable already, done
	if (isObservable(v))
		return v;

	// no modifier set?
	if (!childModifier) {

		// something that can be converted and mutated?
		// observable([])  --> use recursive
		if (couldBeMadeObservabe(v))
			return toObservable(v, modifiers.recursive);

		// something that is immutable, just reference it
		// no childModifier set, so not to be owned by a collection
		// observable(3)   --> box the thing
		else
			return new ObservableValue(v, modifiers.ref);
	}

	// TODO: make these checks generic?

	// plain object, copy, use original as props for the new object
	if (isPlainObject(v))
		return extendObservable({}, childModifier, v);

	// array, clone to observable array
	if (Array.isArray(v))
		return createObservableArray(v, childModifier);

	// TODO: map

	// there was a childModifier passed in,
	// but not a value that could be mae observable, just return original value
	// a ref to it will be stored in the parent
	return v;
}

function couldBeMadeObservabe(thing): boolean {
	// TODO: more generic, should support Map etc
	return isPlainObject(thing) || Array.isArray(thing);
}

// TODO: expose all constuctors, reduce interfaces, etc..

export interface IObservableFactory {
	// observable overloads
	<T>(): IObservableValue<T>;
	(target: Object, key: string, baseDescriptor?: PropertyDescriptor): any;
	<T>(value: T[], modifier?: IModifier<T, T>): IObservableArray<T>;
	<T extends string|number|boolean|Date|RegExp|Function|null|undefined>(value: T, modifier?: IModifier<T, T>): IObservableValue<T>;
	<T extends Object>(value: T, modifier?: IModifier<T, T>): T & IObservableObject;

	// convenience decorator for observable + modifier
	// handles:
	// @observable.ref field = value (rewrites to @observable(modifier.ref))
	ref(target: Object, key: string, baseDescriptor: PropertyDescriptor): PropertyDescriptor;
	shallow(target: Object, key: string, baseDescriptor: PropertyDescriptor): PropertyDescriptor;
	map(target: Object, key: string, baseDescriptor: PropertyDescriptor): PropertyDescriptor;
	shallowMap(target: Object, key: string, baseDescriptor: PropertyDescriptor): PropertyDescriptor;
	recursive(target: Object, key: string, baseDescriptor: PropertyDescriptor): PropertyDescriptor;
	structure(target: Object, key: string, baseDescriptor: PropertyDescriptor): PropertyDescriptor;
}

export var observable: IObservableFactory = toObservable as any;
