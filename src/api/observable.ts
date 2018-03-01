import { invariant, fail } from "../utils/utils"
import {
    isModifierDescriptor,
    IModifierDescriptor,
    deepEnhancer,
    referenceEnhancer,
    shallowEnhancer,
    deepStructEnhancer,
    refStructEnhancer,
    createModifierDescriptor,
    IEnhancer
} from "../types/modifiers"
import { IObservableValue, ObservableValue } from "../types/observablevalue"
import { IObservableArray, ObservableArray } from "../types/observablearray"
import { createDecoratorForEnhancer } from "./observabledecorator"
import { isObservable } from "./isobservable"
import { IObservableObject, asObservableObject } from "../types/observableobject"
import { extendObservable, extendShallowObservable } from "./extendobservable"
import { IObservableMapInitialValues, ObservableMap } from "../types/observablemap"

export type CreateObservableOptions = {
    name?: string
    deep?: boolean
    enhancer?: IEnhancer<any>
}

// Predefined bags of create observable options, to avoid allocating temporarily option objects
// in the majority of cases
export const defaultCreateObservableOptions: CreateObservableOptions = {
    deep: true, // TODO MWE: or false?
    name: undefined, // TODO: not used yet
    enhancer: undefined
}
export const shallowCreateObservableOptions = {
    deep: false,
    name: undefined,
    enhancer: undefined
}
Object.freeze(defaultCreateObservableOptions)
Object.freeze(shallowCreateObservableOptions)

function assertValidOption(key: string) {
    if (!/^(deep|name|enhancer)$/.test(key)) fail(`invalid option for (extend)observable: ${key}`)
}

export function asCreateObservableOptions(thing: any): CreateObservableOptions {
    if (thing === null || thing === undefined) return defaultCreateObservableOptions
    if (process.env.NODE_ENV !== "production") {
        if (typeof thing !== "object") return fail("expected options object")
        Object.keys(thing).forEach(assertValidOption)
    }
    return thing as CreateObservableOptions
}

const deepDecorator = createDecoratorForEnhancer(deepEnhancer)
const shallowDecorator = createDecoratorForEnhancer(shallowEnhancer)
const refDecorator = createDecoratorForEnhancer(referenceEnhancer)
const deepStructDecorator = createDecoratorForEnhancer(deepStructEnhancer)
const refStructDecorator = createDecoratorForEnhancer(refStructEnhancer)

/**
 * Turns an object, array or function into a reactive structure.
 * @param v the value which should become observable.
 */
function createObservable(v: any) {
    // @observable someProp;
    if (typeof arguments[1] === "string") return deepDecorator.apply(null, arguments)

    if (process.env.NODE_ENV !== "production") {
        invariant(arguments.length <= 1, "observable expects zero or one arguments")
        invariant(
            !isModifierDescriptor(v),
            "modifiers can only be used for individual object properties"
        )
    }

    // it is an observable already, done
    if (isObservable(v)) return v

    // something that can be converted and mutated?
    const res = deepEnhancer(v, undefined, undefined)

    // this value could be converted to a new observable data structure, return it
    if (res !== v) return res

    // otherwise, just box it
    fail(
        process.env.NODE_ENV !== "production" &&
            `The provided value could not be converted into an observable. If you want just create an observable reference to the object use 'observable.box(value)'`
    )
}

export interface IObservableFactory {
    // observable overloads
    <T>(wrapped: IModifierDescriptor<T>): T
    (target: Object, key: string, baseDescriptor?: PropertyDescriptor): any
    <T>(value: T[]): IObservableArray<T>
    <K, V>(value: Map<K, V>): ObservableMap<K, V>
    <T extends Object>(value: T): T & IObservableObject
}

export interface IObservableFactories {
    // TODO: replace name with CreateObservableOptions
    box<T>(value?: T, name?: string): IObservableValue<T>
    shallowBox<T>(value?: T, name?: string): IObservableValue<T>
    array<T>(initialValues?: T[], name?: string): IObservableArray<T>
    shallowArray<T>(initialValues?: T[], name?: string): IObservableArray<T>
    map<K, V>(initialValues?: IObservableMapInitialValues<K, V>, name?: string): ObservableMap<K, V>
    shallowMap<K, V>(
        initialValues?: IObservableMapInitialValues<K, V>,
        name?: string
    ): ObservableMap<K, V>

    object<T>(
        props: T,
        decorators?: { [K in keyof T]: Function },
        name?: string
    ): T & IObservableObject
    shallowObject<T>(
        props: T,
        decorators?: { [K in keyof T]: Function },
        name?: string
    ): T & IObservableObject

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
    shallow<K, V>(initialValues: Map<K, V>): ObservableMap<K, V>
    shallow<T extends Object>(value: T): T

    deep(target: Object, property: string, descriptor?: PropertyDescriptor): any
    deep<T>(initialValues: T[]): IObservableArray<T>
    deep<K, V>(initialValues: Map<K, V>): ObservableMap<K, V>
    deep<T>(initialValue: T): T

    struct(target: Object, property: string, descriptor?: PropertyDescriptor): any
    struct<T>(initialValues: T[]): IObservableArray<T>
    struct<K, V>(initialValues: Map<K, V>): ObservableMap<K, V>
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
    map<K, V>(
        initialValues?: IObservableMapInitialValues<K, V>,
        name?: string
    ): ObservableMap<K, V> {
        if (arguments.length > 2) incorrectlyUsedAsDecorator("map")
        return new ObservableMap<K, V>(initialValues, deepEnhancer, name)
    },
    shallowMap<K, V>(
        initialValues?: IObservableMapInitialValues<K, V>,
        name?: string
    ): ObservableMap<K, V> {
        if (arguments.length > 2) incorrectlyUsedAsDecorator("shallowMap")
        return new ObservableMap<K, V>(initialValues, referenceEnhancer, name)
    },
    object<T>(
        props: T,
        decorators?: { [K in keyof T]: Function },
        name?: string
    ): T & IObservableObject {
        if (typeof arguments[1] === "string") incorrectlyUsedAsDecorator("object")
        const res = {}
        asObservableObject(res, name) // TODO: remove ones extendObservable takes arguments
        // add properties
        return extendObservable(res, props, decorators) as any
    },
    shallowObject<T>(
        props: T,
        decorators?: { [K in keyof T]: Function },
        name?: string
    ): T & IObservableObject {
        if (typeof arguments[1] === "string") incorrectlyUsedAsDecorator("shallowObject")
        const res = {}
        asObservableObject(res, name)
        return extendShallowObservable(res, props, decorators) as any
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
        // process.env.NODE_ENV !== "production" &&
        `Expected one or two arguments to observable.${methodName}. Did you accidentally try to use observable.${methodName} as decorator?`
    )
}
