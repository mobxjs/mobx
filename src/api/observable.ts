import {IObservableValue, ObservableValue} from "../types/observablevalue";
import {IObservableArray} from "../types/observablearray";
import {isPlainObject, fail, invariant} from "../utils/utils";
import {observableDecorator} from "./observabledecorator";
import {isObservable} from "./isobservable";
import {IObservableObject} from "../types/observableobject";
import {modifiers, IModifier, isModifier, isModifierDescriptor, IModifierDescriptor} from "../types/modifiers";
import {extendObservable} from "../api/extendobservable";
import {createObservableArray} from "../types/observablearray";

/**
 * Turns an object, array or function into a reactive structure.
 * @param value the value which should become observable.
 */
function toObservable(v: any = undefined) {
	// TODO: pass in name as well?

	// @observable someProp;
	if (typeof arguments[1] === "string")
		return observableDecorator.apply(null, arguments);

	// @observable(modifier) someProp
	if (arguments.length === 1 && isModifier(v))
		return observableDecorator.apply(null, arguments);

	// observable(modifiers.shallow([]))  etc..
	// TODO: deprecate this pattern. it is mostly relevant in MobX2
	if (isModifierDescriptor(v)) {
		return v.modifier.implementation(v.initialValue);
	}

	// it is an observable already, done
	if (isObservable(v))
		return v;

	// something that can be converted and mutated?
	// observable([])  --> use recursive
	// observable([], modifiers.shallow)  --> use shallow
	if (couldBeMadeObservabe(v))
		return convertToObservable(v, modifiers.recursive);

	// something that is immutable / or something that could (should) not be made observable
	// so just reference it
	// observable(3)   --> box the thing (unboxed it is pretty useless if not owned)
	return new ObservableValue(v, modifiers.ref);
}

/**
 * Turns an object, array or function into a reactive structure, and cascades the given modifier.
 * Returns immutables objects as is
 */
export function makeChildObservable<S, T>(v: S, childModifier: IModifier<T, T>): S | T {
	// TODO: pass in name as well?

	// observable(modifiers.shallow([]))  etc..
	// TODO: deprecate this pattern. it is mostly relevant in MobX2
	if (isModifierDescriptor(v)) {
		invariant(!childModifier, "You tried to assign a modifier wrapped value to a collection, please define modifiers when creating the collection, not when modifying it");
	}

	// it is an observable already, done
	if (isObservable(v))
		return v;

	// something that can be converted and mutated?
	// observable([])  --> use recursive
	// observable([], modifiers.shallow)  --> use shallow
	if (couldBeMadeObservabe(v))
		return convertToObservable(v, childModifier);

	// something that is immutable / could (should) not be made observable
	// so just reference it
	return v;
}

function couldBeMadeObservabe(v): boolean {
	// TODO: more generic, should support Map etc
	return isPlainObject(v) || Array.isArray(v);
}

function convertToObservable(v, childModifier: IModifier<any, any>): any {
	// TODO: make these checks generic?

	// plain object, copy, use original as props for the new object
	if (isPlainObject(v))
		return extendObservable({}, childModifier, v);

	// array, clone to observable array
	if (Array.isArray(v))
		return createObservableArray(v, childModifier);

	// TODO: map
	return fail("Illegal state");
}

// TODO: expose all constuctors, reduce interfaces, etc..

export interface IObservableFactory {
	// observable overloads
	<T>(): IObservableValue<T>;
	<T>(wrapped: IModifierDescriptor<any, T>): T;
	(target: Object, key: string, baseDescriptor?: PropertyDescriptor): any;
	<T>(value: T[]): IObservableArray<T>;
	<T extends string|number|boolean|Date|RegExp|Function|null|undefined>(value: T): IObservableValue<T>;
	<S, T>(value: S): T;
	<T extends Object>(value: T): T & IObservableObject;

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
