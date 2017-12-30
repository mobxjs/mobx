import {
	isModifierDescriptor,
	IModifierDescriptor,
	deepEnhancer,
	referenceEnhancer,
	shallowEnhancer,
	deepStructEnhancer,
	refStructEnhancer,
	createModifierDescriptor
} from "../types/modifiers"
import { IObservableArray, ObservableArray } from "../types/observablearray"
import { createDecoratorForEnhancer } from "./observabledecorator"
import { isObservable } from "./isobservable"
import { IObservableObject, asObservableObject } from "../types/observableobject"
import { extendObservable, extendShallowObservable } from "./extendobservable"
import { IObservableMapInitialValues, ObservableMap, IMap } from "../types/observablemap"
import { getMessage } from "../utils/messages"
import { invariant, IObservableValue } from "../../mobx-core"

const deepDecorator = createDecoratorForEnhancer(deepEnhancer)
const shallowDecorator = createDecoratorForEnhancer(shallowEnhancer)
const refDecorator = createDecoratorForEnhancer(referenceEnhancer)
const deepStructDecorator = createDecoratorForEnhancer(deepStructEnhancer)
const refStructDecorator = createDecoratorForEnhancer(refStructEnhancer)

/**
 * Turns an object, array or function into a reactive structure.
 * @param v the value which should become observable.
 */
function createObservable(v: any = undefined) {
	// @observable someProp;
	if (typeof arguments[1] === "string") return deepDecorator.apply(null, arguments)

	invariant(arguments.length <= 1, getMessage("m021"))
	invariant(!isModifierDescriptor(v), getMessage("m020"))

	// it is an observable already, done
	if (isObservable(v)) return v

	// something that can be converted and mutated?
	const res = deepEnhancer(v, undefined, undefined)

	// this value could be converted to a new observable data structure, return it
	if (res !== v) return res

	// otherwise, just box it
	return observable.box(v)
}

export interface IObservableFactory {
	// observable overloads
	<T>(): IObservableValue<T>
	<T>(wrapped: IModifierDescriptor<T>): T
	(target: Object, key: string, baseDescriptor?: PropertyDescriptor): any
	<T>(value: T[]): IObservableArray<T>
	(value: string): IObservableValue<string>
	(value: boolean): IObservableValue<boolean>
	(value: number): IObservableValue<number>
	(value: Date): IObservableValue<Date>
	(value: RegExp): IObservableValue<RegExp>
	(value: Function): IObservableValue<Function>
	<T>(value: null | undefined): IObservableValue<T>
	(value: null | undefined): IObservableValue<any>
	(): IObservableValue<any>
	<T>(value: IMap<string | number | boolean, T>): ObservableMap<T>
	<T extends Object>(value: T): T & IObservableObject
	<T>(value: T): IObservableValue<T>
}

export interface IObservableFactories {
	box<T>(value?: T, name?: string): IObservableValue<T>
	shallowBox<T>(value?: T, name?: string): IObservableValue<T>
	array<T>(initialValues?: T[], name?: string): IObservableArray<T>
	shallowArray<T>(initialValues?: T[], name?: string): IObservableArray<T>
	map<T>(initialValues?: IObservableMapInitialValues<T>, name?: string): ObservableMap<T>
	shallowMap<T>(initialValues?: IObservableMapInitialValues<T>, name?: string): ObservableMap<T>
	object<T>(props: T, name?: string): T & IObservableObject
	shallowObject<T>(props: T, name?: string): T & IObservableObject

	/**
	 * Decorator that creates an observable that only observes the references, but doesn't try to turn the assigned value into an observable.ts.
	 */
	ref(target: Object, property: string, descriptor?: PropertyDescriptor): any
	ref<T>(initialValue: T): T

	/**
	 * Decorator that creates an observable converts its value (objects, maps or arrays) into a shallow observable structure
	 */
	shallow(target: Object, property: string, descriptor?: PropertyDescriptor): any
	shallow<T>(initialValues: T[]): IObservableArray<T>
	shallow<T>(initialValues: IMap<string | number | boolean, T>): ObservableMap<T>
	shallow<T extends Object>(value: T): T

	deep(target: Object, property: string, descriptor?: PropertyDescriptor): any
	deep<T>(initialValues: T[]): IObservableArray<T>
	deep<T>(initialValues: IMap<string | number | boolean, T>): ObservableMap<T>
	deep<T>(initialValue: T): T

	struct(target: Object, property: string, descriptor?: PropertyDescriptor): any
	struct<T>(initialValues: T[]): IObservableArray<T>
	struct<T>(initialValues: IMap<string | number | boolean, T>): ObservableMap<T>
	struct<T>(initialValue: T): T
}

const observableFactories: IObservableFactories = {
	box<T>(value?: T, name?: string): IObservableValue<T> {
		if (arguments.length > 2) incorrectlyUsedAsDecorator("box")
		return new ObservableValue(value, deepEnhancer, name)
	},
	shallowBox<T>(value?: T, name?: string): IObservableValue<T> {
		if (arguments.length > 2) incorrectlyUsedAsDecorator("shallowBox")
		return new ObservableValue(value, referenceEnhancer, name)
	},
	array<T>(initialValues?: T[], name?: string): IObservableArray<T> {
		if (arguments.length > 2) incorrectlyUsedAsDecorator("array")
		return new ObservableArray(initialValues, deepEnhancer, name) as any
	},
	shallowArray<T>(initialValues?: T[], name?: string): IObservableArray<T> {
		if (arguments.length > 2) incorrectlyUsedAsDecorator("shallowArray")
		return new ObservableArray(initialValues, referenceEnhancer, name) as any
	},
	map<T>(initialValues?: IObservableMapInitialValues<T>, name?: string): ObservableMap<T> {
		if (arguments.length > 2) incorrectlyUsedAsDecorator("map")
		return new ObservableMap(initialValues, deepEnhancer, name)
	},
	shallowMap<T>(initialValues?: IObservableMapInitialValues<T>, name?: string): ObservableMap<T> {
		if (arguments.length > 2) incorrectlyUsedAsDecorator("shallowMap")
		return new ObservableMap(initialValues, referenceEnhancer, name)
	},
	object<T>(props: T, name?: string): T & IObservableObject {
		if (arguments.length > 2) incorrectlyUsedAsDecorator("object")
		const res = {}
		// convert to observable object
		asObservableObject(res, name)
		// add properties
		extendObservable(res, props)
		return res as any
	},
	shallowObject<T>(props: T, name?: string): T & IObservableObject {
		if (arguments.length > 2) incorrectlyUsedAsDecorator("shallowObject")
		const res = {}
		asObservableObject(res, name)
		extendShallowObservable(res, props)
		return res as any
	},
	ref() {
		if (arguments.length < 2) {
			// although ref creates actually a modifier descriptor, the type of the resultig properties
			// of the object is `T` in the end, when the descriptors are interpreted
			return createModifierDescriptor(referenceEnhancer, arguments[0]) as any
		} else {
			return refDecorator.apply(null, arguments)
		}
	},
	shallow() {
		if (arguments.length < 2) {
			// although ref creates actually a modifier descriptor, the type of the resultig properties
			// of the object is `T` in the end, when the descriptors are interpreted
			return createModifierDescriptor(shallowEnhancer, arguments[0]) as any
		} else {
			return shallowDecorator.apply(null, arguments)
		}
	},
	deep() {
		if (arguments.length < 2) {
			// although ref creates actually a modifier descriptor, the type of the resultig properties
			// of the object is `T` in the end, when the descriptors are interpreted
			return createModifierDescriptor(deepEnhancer, arguments[0]) as any
		} else {
			return deepDecorator.apply(null, arguments)
		}
	},
	struct() {
		if (arguments.length < 2) {
			// although ref creates actually a modifier descriptor, the type of the resultig properties
			// of the object is `T` in the end, when the descriptors are interpreted
			return createModifierDescriptor(deepStructEnhancer, arguments[0]) as any
		} else {
			return deepStructDecorator.apply(null, arguments)
		}
	}
} as any

export const observable: IObservableFactory &
	IObservableFactories & {
		deep: {
			struct<T>(initialValue?: T): T
		}
		ref: {
			struct<T>(initialValue?: T): T
		}
	} = createObservable as any

// weird trick to keep our typings nicely with our funcs, and still extend the observable function
Object.keys(observableFactories).forEach(name => (observable[name] = observableFactories[name]))

observable.deep.struct = observable.struct
observable.ref.struct = function() {
	if (arguments.length < 2) {
		return createModifierDescriptor(refStructEnhancer, arguments[0]) as any
	} else {
		return refStructDecorator.apply(null, arguments)
	}
}

function incorrectlyUsedAsDecorator(methodName) {
	fail(
		`Expected one or two arguments to observable.${methodName}. Did you accidentally try to use observable.${methodName} as decorator?`
	)
}
