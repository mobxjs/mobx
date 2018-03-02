import { invariant, fail, deprecated, addHiddenProp } from "../utils/utils"
import {
    IModifierDescriptor,
    deepEnhancer,
    referenceEnhancer,
    shallowEnhancer,
    deepStructEnhancer,
    refStructEnhancer,
    IEnhancer
} from "../types/modifiers"
import { IObservableValue, ObservableValue } from "../types/observablevalue"
import { IObservableArray, ObservableArray } from "../types/observablearray"
import { createDecoratorForEnhancer } from "./observabledecorator"
import { isObservable } from "./isobservable"
import {
    IObservableObject,
    asObservableObject,
    defineObservableProperty
} from "../types/observableobject"
import { extendObservable, extendShallowObservable } from "./extendobservable"
import { IObservableMapInitialValues, ObservableMap } from "../types/observablemap"
import { createPropDecorator } from "../utils/decorators2"

export type CreateObservableOptions = {
    name?: string
    deep?: boolean
    defaultDecorator?: Function
}

// Predefined bags of create observable options, to avoid allocating temporarily option objects
// in the majority of cases
// TODO: support default decorator / enhancer everywhere!, create interface for IDecorator that can also grab enhancer
export const defaultCreateObservableOptions: CreateObservableOptions = {
    deep: true, // TODO MWE: or false?
    name: undefined, // TODO: not used yet
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
    // TODO: make it possible to get enhancer from decorator
    return options.deep === false ? referenceEnhancer : deepEnhancer
}

const deepDecorator = createDecoratorForEnhancer(deepEnhancer)
const shallowDecorator = createDecoratorForEnhancer(shallowEnhancer)
const refDecorator = createDecoratorForEnhancer(referenceEnhancer)
const deepStructDecorator = createDecoratorForEnhancer(deepStructEnhancer)
const refStructDecorator = createDecoratorForEnhancer(refStructEnhancer)

const deepDecorator2 = createPropDecorator(
    (target: any, propertyName: string, initialValue: string) => {
        defineObservableProperty(target, propertyName, initialValue, deepEnhancer)
    }
)

function createObservableDescriptor(prop: string) {
    // TODO: cache
    return {
        configurable: true, // TODO: false?
        enumerable: true,
        get() {
            initializeObservableObject(this)
            return this[prop]
        },
        set(value) {
            initializeObservableObject(this)
            this[prop] = value
        }
    }
}

function initializeObservableObject(target) {
    const decorators = target.__mobxDecorators
    decorators.forEach(({ prop, initializer }) => {
        defineObservableProperty(target, prop, initializer && initializer(), deepEnhancer)
    })
}

function decorateObservable(target: any, prop: string, descriptor: any) {
    if (!target.__mobxDecorators) addHiddenProp(target, "__mobxDecorators", [])
    target.__mobxDecorators.push({ prop, initializer: descriptor && descriptor.initializer })
    return createObservableDescriptor(prop)
}

/**
 * Turns an object, array or function into a reactive structure.
 * @param v the value which should become observable.
 */
function createObservable(v: any) {
    // @observable someProp;
    if (typeof arguments[1] === "string") {
        return deepDecorator2.apply(null, arguments)
    }

    if (process.env.NODE_ENV !== "production") {
        invariant(arguments.length === 1, "observable expects one arguments")
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
    ref(target: Object, property: string, descriptor?: PropertyDescriptor): any
    /**
     * Decorator that creates an observable converts its value (objects, maps or arrays) into a shallow observable structure
     */
    shallow(target: Object, property: string, descriptor?: PropertyDescriptor): any
    deep(target: Object, property: string, descriptor?: PropertyDescriptor): any
    struct(target: Object, property: string, descriptor?: PropertyDescriptor): any
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

// TODO: MWE: really? just kill those two?
observable.deep.struct = observable.struct
observable.ref.struct = refStructDecorator

function incorrectlyUsedAsDecorator(methodName) {
    fail(
        // process.env.NODE_ENV !== "production" &&
        `Expected one or two arguments to observable.${methodName}. Did you accidentally try to use observable.${methodName} as decorator?`
    )
}
