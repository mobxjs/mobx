import {invariant, fail} from "../utils/utils";
import {isModifierDescriptor, IModifierDescriptor, deepEnhancer, referenceEnhancer, shallowEnhancer, createModifierDescriptor} from "../types/modifiers";
import {IObservableValue, ObservableValue} from "../types/observablevalue";
import {IObservableArray, ObservableArray} from "../types/observablearray";
import {createDecoratorForEnhancer} from "./observabledecorator";
import {isObservable} from "./isobservable";
import {IObservableObject, asObservableObject} from "../types/observableobject";
import {extendObservable, extendShallowObservable} from "../api/extendobservable";
import {IObservableMapInitialValues, ObservableMap, IMap} from "../types/observablemap";

const deepObservableDecorator = createDecoratorForEnhancer(deepEnhancer);
const shallowObservableDecorator = createDecoratorForEnhancer(shallowEnhancer);
const refObservableDecorator = createDecoratorForEnhancer(referenceEnhancer);

/**
 * Turns an object, array or function into a reactive structure.
 * @param value the value which should become observable.
 */
function createObservable(v: any = undefined) {
	// @observable someProp;
	if (typeof arguments[1] === "string")
		return deepObservableDecorator.apply(null, arguments);

	invariant(arguments.length <= 1, "observable expects zero or one arguments");
	invariant(!isModifierDescriptor(v), "modifiers can only be used for individual object properties");

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
	(value: string): IObservableValue<string>;
	(value: boolean): IObservableValue<boolean>;
	(value: number): IObservableValue<number>;
	(value: Date): IObservableValue<Date>;
	(value: RegExp): IObservableValue<RegExp>;
	(value: Function): IObservableValue<Function>;
	<T>(value: null | undefined): IObservableValue<T>;
	(value: null | undefined): IObservableValue<any>;
	(): IObservableValue<any>;
	<T>(value: IMap<string | number | boolean, T>): ObservableMap<T>;
	<T extends Object>(value: T): T & IObservableObject;
	<T>(value: T): IObservableValue<T>;
}

export class IObservableFactories {
	box<T>(value?: T, name?: string): IObservableValue<T> {
		if (arguments.length > 2)
			incorrectlyUsedAsDecorator("box");
		return new ObservableValue(value, deepEnhancer, name);
	}

	shallowBox<T>(value?: T, name?: string): IObservableValue<T> {
		if (arguments.length > 2)
			incorrectlyUsedAsDecorator("shallowBox");
		return new ObservableValue(value, referenceEnhancer, name);
	}

	array<T>(initialValues?: T[], name?: string): IObservableArray<T> {
		if (arguments.length > 2)
			incorrectlyUsedAsDecorator("array");
		return new ObservableArray(initialValues, deepEnhancer, name) as any;
	}

	shallowArray<T>(initialValues?: T[], name?: string): IObservableArray<T> {
		if (arguments.length > 2)
			incorrectlyUsedAsDecorator("shallowArray");
		return new ObservableArray(initialValues, referenceEnhancer, name) as any;
	}

	map<T>(initialValues?: IObservableMapInitialValues<T>, name?: string): ObservableMap<T> {
		if (arguments.length > 2)
			incorrectlyUsedAsDecorator("map");
		return new ObservableMap(initialValues, deepEnhancer, name);
	}

	shallowMap<T>(initialValues?: IObservableMapInitialValues<T>, name?: string): ObservableMap<T> {
		if (arguments.length > 2)
			incorrectlyUsedAsDecorator("shallowMap");
		return new ObservableMap(initialValues, referenceEnhancer, name);
	}

	object<T>(props: T, name?: string): T & IObservableObject {
		if (arguments.length > 2)
			incorrectlyUsedAsDecorator("object");
		const res = {};
		// convert to observable object
		asObservableObject(res, name);
		// add properties
		extendObservable(res, props);
		return res as any;
	}

	shallowObject<T>(props: T, name?: string): T & IObservableObject {
		if (arguments.length > 2)
			incorrectlyUsedAsDecorator("shallowObject");
		const res = {};
		asObservableObject(res, name);
		extendShallowObservable(res, props);
		return res as any;
	}

	dynamic<T>(props: T, name?: string): T & IObservableObject {
		if (arguments.length > 2)
			incorrectlyUsedAsDecorator("object");
		invariant(typeof Proxy === 'function', "dynamic objects are not supported in this environment");
		const internalMap = new ObservableMap(props, referenceEnhancer, name);
		const result = new Proxy(internalMap, {
			get(target, property:string, receiver){
				if (property === '$mobx'){
					return target[property];
				}
				return target.get(property);
			},
			set(target, property:string, value, receiver){
				if (property === '$mobx'){
					return false;}
				target.set(property, value);
				return true;
			},
			ownKeys: function(target) {
				return target.keys();
			},
			getOwnPropertyDescriptor: function(target, property:string) {
				return {enumerable: target.has(property), configurable:true};
			}
		});

		return result as any;
	}


	/**
	 * Decorator that creates an observable that only observes the references, but doesn't try to turn the assigned value into an observable.ts.
	 */
	ref(target: Object, property: string, descriptor?: PropertyDescriptor): any;
	ref<T>(initialValue: T): T;
	ref() {
		if (arguments.length < 2) {
			// although ref creates actually a modifier descriptor, the type of the resultig properties
			// of the object is `T` in the end, when the descriptors are interpreted
			return createModifierDescriptor(referenceEnhancer, arguments[0]) as any;
		} else {
			return refObservableDecorator.apply(null, arguments);
		}
	}


	/**
	 * Decorator that creates an observable converts it's value (objects, maps or arrays) into a shallow observable structure
	 */
	shallow(target: Object, property: string, descriptor?: PropertyDescriptor): any;
	shallow<T>(initialValues: T[]): IObservableArray<T>;
	shallow<T>(initialValues: IMap<string | number | boolean, T>): ObservableMap<T>;
	shallow<T extends Object>(value: T): T;
	shallow() {
		if (arguments.length < 2) {
			// although ref creates actually a modifier descriptor, the type of the resultig properties
			// of the object is `T` in the end, when the descriptors are interpreted
			return createModifierDescriptor(shallowEnhancer, arguments[0]) as any;
		} else {
			return shallowObservableDecorator.apply(null, arguments);
		}
	}

	deep(target: Object, property: string, descriptor?: PropertyDescriptor): any;
	deep<T>(initialValues: T[]): IObservableArray<T>;
	deep<T>(initialValues: IMap<string | number | boolean, T>): ObservableMap<T>;
	deep<T>(initialValue: T): T;
	deep() {
		if (arguments.length < 2) {
			// although ref creates actually a modifier descriptor, the type of the resultig properties
			// of the object is `T` in the end, when the descriptors are interpreted
			return createModifierDescriptor(deepEnhancer, arguments[0]) as any;
		} else {
			return deepObservableDecorator.apply(null, arguments);
		}
	}
}

export var observable: IObservableFactory & IObservableFactories = createObservable as any;

// weird trick to keep our typings nicely with our funcs, and still extend the observable function
Object.keys(IObservableFactories.prototype).forEach(key => observable[key] = IObservableFactories.prototype[key]);

function incorrectlyUsedAsDecorator(methodName) {
	fail(`Expected one or two arguments to observable.${methodName}. Did you accidentally try to use observable.${methodName} as decorator?`);
}
