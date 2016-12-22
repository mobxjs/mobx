import {invariant, isES6Map} from "../utils/utils";
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
function deepObservable(v: any = undefined) {
	// @observable someProp;
	if (typeof arguments[1] === "string")
		return deepObservableDecorator.apply(null, arguments);

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

export var observable: IObservableFactory & IObservableFactories = deepObservable as any;

// weird trick to keep our typings nicely with our funcs, and still extend the observable function
Object.keys(IObservableFactories.prototype).forEach(key => observable[key] = IObservableFactories.prototype[key]);
