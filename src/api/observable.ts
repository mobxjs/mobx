import {IObservableValue, ObservableValue} from "../types/observablevalue";
import {IObservableArray, ObservableArray} from "../types/observablearray";
import {invariant} from "../utils/utils";
import {observableDecorator} from "./observabledecorator";
import {isObservable} from "./isobservable";
import {IObservableObject, asObservableObject} from "../types/observableobject";
import {isModifierDescriptor, IModifierDescriptor, deepEnhancer, referenceEnhancer, shallowEnhancer, createModifierDescriptor} from "../types/modifiers";
import {extendObservable, extendShallowObservable} from "../api/extendobservable";
import {IObservableMapInitialValues, ObservableMap} from "../types/observablemap";

/**
 * Turns an object, array or function into a reactive structure.
 * @param value the value which should become observable.
 */
function deepObservable(v: any = undefined) {
	// @observable someProp;
	if (typeof arguments[1] === "string")
		return observableDecorator.apply(null, arguments);

	invariant(arguments.length <= 1, "observable expects zero or one arguments");
	invariant(!isModifierDescriptor(v), "modifiers can only be used for induvidual object properties");

	// it is an observable already, done
	if (isObservable(v))
		return v;

	// something that can be converted and mutated?
	const res = deepEnhancer(v, undefined, undefined);

	// this value could be converted to a new observable data structure, return it
	if (res !== v)
		return res;

	// otherwise, just box it
	return observable.box(v);
}

export interface IObservableFactory {
	// observable overloads
	<T>(): IObservableValue<T>;
	<T>(wrapped: IModifierDescriptor<T>): T;
	(target: Object, key: string, baseDescriptor?: PropertyDescriptor): any;
	<T>(value: T[]): IObservableArray<T>;
	// TODO: add map overload
	<T extends string|number|boolean|Date|RegExp|Function|null|undefined>(value: T): IObservableValue<T>;
	<S, T>(value: S): T;
	<T extends Object>(value: T): T & IObservableObject;
}

export class IObservableFactories {
	box<T>(value?: T, name?: string): IObservableValue<T> {
		return new ObservableValue(value, deepEnhancer, name);
	}

	shallowBox<T>(value?: T, name?: string): IObservableValue<T> {
		return new ObservableValue(value, referenceEnhancer, name);
	}

	array<T>(initialValues?: T[], name?: string): IObservableArray<T> {
		return new ObservableArray(initialValues, deepEnhancer, name) as any;
	}

	shallowArray<T>(initialValues?: T[], name?: string): IObservableArray<T> {
		return new ObservableArray(initialValues, referenceEnhancer, name) as any;
	}
	map<T>(initialValues?: IObservableMapInitialValues<T>, name?: string): ObservableMap<T> {
		return new ObservableMap(initialValues, deepEnhancer, name);
	}

	shallowMap<T>(initialValues?: IObservableMapInitialValues<T>, name?: string): ObservableMap<T> {
		return new ObservableMap(initialValues, referenceEnhancer, name);
	}

	object<T>(props: T, name?: string): T & IObservableObject {
		const res = {};
		// convert to observable object
		asObservableObject(res, name);
		// add properties
		extendObservable(res, props);
		return res as any;
	}

	shallowObject<T>(props: T, name?: string): T & IObservableObject {
		const res = {};
		asObservableObject(res, name);
		extendShallowObservable(res, props);
		return res as any;
	}


	// TODO: move to modifiers
	ref<T>(initialValue: T): T {
		// TODO: decorator overload
		// although ref creates actually a modifier descriptor, the type of the resultig properties
		// of the object is `T` in the end, when the descriptors are interpreted
		return createModifierDescriptor(referenceEnhancer, initialValue) as any;
	}


	shallow<T>(initialValues: T[]): IObservableArray<T>;
// TODO: ES6 Map	shallow<T>(initialValues: T[]): IObservableArray<T>;
	shallow<T extends Object>(value: T): T;
	shallow(initialValue) {
		// TODO: decorator overload

		// although ref creates actually a modifier descriptor, the type of the resultig properties
		// of the object is `T` in the end, when the descriptors are interpreted
		return createModifierDescriptor(shallowEnhancer, initialValue) as any;
	}

	// TODO: modifier.deep
}

export var observable: IObservableFactory & IObservableFactories = deepObservable as any;

// weird trick to keep our typings nicely with our funcs, and still extend the observable function
Object.keys(IObservableFactories.prototype).forEach(key => observable[key] = IObservableFactories.prototype[key]);
