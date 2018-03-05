import { fail, deprecated, isES6Map, isPlainObject } from "../utils/utils"
import {
    deepEnhancer,
    referenceEnhancer,
    shallowEnhancer,
    deepStructEnhancer,
    refStructEnhancer,
    IEnhancer
} from "../types/modifiers"
import { IObservableValue, ObservableValue } from "../types/observablevalue"
import { IObservableArray, ObservableArray } from "../types/observablearray"
import { createDecoratorForEnhancer, IObservableDecorator } from "./observabledecorator"
import { isObservable } from "./isobservable"
import { IObservableObject } from "../types/observableobject"
import { extendObservable } from "./extendobservable"
import { IObservableMapInitialValues, ObservableMap } from "../types/observablemap"

export type CreateObservableOptions = {
    name?: string
    deep?: boolean
    defaultDecorator?: IObservableDecorator
}

// Predefined bags of create observable options, to avoid allocating temporarily option objects
// in the majority of cases
export const defaultCreateObservableOptions: CreateObservableOptions = {
    deep: true,
    name: undefined,
    defaultDecorator: undefined
}
export const shallowCreateObservableOptions = {
    deep: false,
    name: undefined,
    defaultDecorator: undefined
}
Object.freeze(defaultCreateObservableOptions)
Object.freeze(shallowCreateObservableOptions)

function assertValidOption(key: string) {
    if (!/^(deep|name|defaultDecorator)$/.test(key))
        fail(`invalid option for (extend)observable: ${key}`)
}

export function asCreateObservableOptions(thing: any): CreateObservableOptions {
    if (thing === null || thing === undefined) return defaultCreateObservableOptions
    if (typeof thing === "string") return { name: thing, deep: true }
    if (process.env.NODE_ENV !== "production") {
        if (typeof thing !== "object") return fail("expected options object")
        Object.keys(thing).forEach(assertValidOption)
    }
    return thing as CreateObservableOptions
}

function getEnhancerFromOptions(options: CreateObservableOptions): IEnhancer<any> {
    return options.defaultDecorator
        ? options.defaultDecorator.enhancer
        : options.deep === false ? referenceEnhancer : deepEnhancer
}

export const deepDecorator = createDecoratorForEnhancer(deepEnhancer)
const shallowDecorator = createDecoratorForEnhancer(shallowEnhancer)
export const refDecorator = createDecoratorForEnhancer(referenceEnhancer)
const deepStructDecorator = createDecoratorForEnhancer(deepStructEnhancer)
const refStructDecorator = createDecoratorForEnhancer(refStructEnhancer)

/**
 * Turns an object, array or function into a reactive structure.
 * @param v the value which should become observable.
 */
function createObservable(v: any, arg2?: any, arg3?: any) {
    // @observable someProp;
    if (typeof arguments[1] === "string") {
        return deepDecorator.apply(null, arguments)
    }

    // it is an observable already, done
    if (isObservable(v)) return v

    // something that can be converted and mutated?
    const res = Array.isArray(v)
        ? observable.array(v, arg2)
        : isES6Map(v)
          ? observable.map(v, arg2)
          : isPlainObject(v) ? observable.object(v, arg2, arg3) : v

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
    (target: Object, key: string, baseDescriptor?: PropertyDescriptor): any // decorator
    <T>(value: T[], options?: CreateObservableOptions): IObservableArray<T>
    <K, V>(value: Map<K, V>, options?: CreateObservableOptions): ObservableMap<K, V>
    <T extends Object>(
        value: T,
        decorators?: { [K in keyof T]?: Function },
        options?: CreateObservableOptions
    ): T & IObservableObject
}

export interface IObservableFactories {
    box<T>(value?: T, options?: CreateObservableOptions): IObservableValue<T>
    shallowBox<T>(value?: T, options?: CreateObservableOptions): IObservableValue<T>
    array<T>(initialValues?: T[], options?: CreateObservableOptions): IObservableArray<T>
    shallowArray<T>(initialValues?: T[], options?: CreateObservableOptions): IObservableArray<T>
    map<K, V>(
        initialValues?: IObservableMapInitialValues<K, V>,
        options?: CreateObservableOptions
    ): ObservableMap<K, V>
    shallowMap<K, V>(
        initialValues?: IObservableMapInitialValues<K, V>,
        options?: CreateObservableOptions
    ): ObservableMap<K, V>
    object<T>(
        props: T,
        decorators?: { [K in keyof T]?: Function },
        options?: CreateObservableOptions
    ): T & IObservableObject
    shallowObject<T>(
        props: T,
        decorators?: { [K in keyof T]?: Function },
        options?: CreateObservableOptions
    ): T & IObservableObject

    /**
     * Decorator that creates an observable that only observes the references, but doesn't try to turn the assigned value into an observable.ts.
     */
    ref: IObservableDecorator
    /**
     * Decorator that creates an observable converts its value (objects, maps or arrays) into a shallow observable structure
     */
    shallow: IObservableDecorator
    deep: IObservableDecorator
    struct: IObservableDecorator
}

const observableFactories: IObservableFactories = {
    box<T>(value?: T, options?: CreateObservableOptions): IObservableValue<T> {
        if (arguments.length > 2) incorrectlyUsedAsDecorator("box")
        const o = asCreateObservableOptions(options)
        return new ObservableValue(value, getEnhancerFromOptions(o), o.name)
    },
    shallowBox<T>(value?: T, name?: string): IObservableValue<T> {
        if (arguments.length > 2) incorrectlyUsedAsDecorator("shallowBox")
        deprecated(`observable.shallowBox`, `observable.box(value, { deep: false })`)
        return observable.box(value, { name, deep: false })
    },
    array<T>(initialValues?: T[], options?: CreateObservableOptions): IObservableArray<T> {
        if (arguments.length > 2) incorrectlyUsedAsDecorator("array")
        const o = asCreateObservableOptions(options)
        return new ObservableArray(initialValues, getEnhancerFromOptions(o), o.name) as any
    },
    shallowArray<T>(initialValues?: T[], name?: string): IObservableArray<T> {
        if (arguments.length > 2) incorrectlyUsedAsDecorator("shallowArray")
        deprecated(`observable.shallowArray`, `observable.array(values, { deep: false })`)
        return observable.array(initialValues, { name, deep: false })
    },
    map<K, V>(
        initialValues?: IObservableMapInitialValues<K, V>,
        options?: CreateObservableOptions
    ): ObservableMap<K, V> {
        if (arguments.length > 2) incorrectlyUsedAsDecorator("map")
        const o = asCreateObservableOptions(options)
        return new ObservableMap<K, V>(initialValues, getEnhancerFromOptions(o), o.name)
    },
    shallowMap<K, V>(
        initialValues?: IObservableMapInitialValues<K, V>,
        options?: CreateObservableOptions
    ): ObservableMap<K, V> {
        if (arguments.length > 2) incorrectlyUsedAsDecorator("shallowMap")
        deprecated(`observable.shallowMap`, `observable.map(values, { deep: false })`)
        return observable.map(initialValues, { name, deep: false })
    },
    object<T>(
        props: T,
        decorators?: { [K in keyof T]: Function },
        options?: CreateObservableOptions
    ): T & IObservableObject {
        if (typeof arguments[1] === "string") incorrectlyUsedAsDecorator("object")
        const o = asCreateObservableOptions(options)
        return extendObservable({}, props, decorators, o) as any
    },
    shallowObject<T>(props: T, name?: string): T & IObservableObject {
        if (typeof arguments[1] === "string") incorrectlyUsedAsDecorator("shallowObject")
        deprecated(`observable.shallowObject`, `observable.object(values, {}, { deep: false })`)
        return observable.object(props, {}, { name, deep: false })
    },
    ref: refDecorator,
    shallow: shallowDecorator,
    deep: deepDecorator,
    struct: deepStructDecorator
} as any

export const observable: IObservableFactory & {
    enhancer: IEnhancer<any>
} & IObservableFactories & {
        deep: {
            struct: IObservableDecorator
        }
        ref: {
            struct: IObservableDecorator
        }
    } = createObservable as any

// weird trick to keep our typings nicely with our funcs, and still extend the observable function
Object.keys(observableFactories).forEach(name => (observable[name] = observableFactories[name]))

observable.deep.struct = observable.struct as any
observable.ref.struct = refStructDecorator

function incorrectlyUsedAsDecorator(methodName) {
    fail(
        // process.env.NODE_ENV !== "production" &&
        `Expected one or two arguments to observable.${methodName}. Did you accidentally try to use observable.${methodName} as decorator?`
    )
}
