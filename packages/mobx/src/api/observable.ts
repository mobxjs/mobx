import {
    IEnhancer,
    IEqualsComparer,
    IObservableArray,
    IObservableMapInitialValues,
    IMapEntries,
    IReadonlyMapEntries,
    IKeyValueMap,
    IObservableSetInitialValues,
    IObservableValue,
    ObservableMap,
    ObservableSet,
    ObservableValue,
    asDynamicObservableObject,
    createObservableArray,
    deepEnhancer,
    extendObservable,
    isES6Map,
    isES6Set,
    isObservable,
    isPlainObject,
    referenceEnhancer,
    Annotation,
    shallowEnhancer,
    refStructEnhancer,
    AnnotationsMap,
    assign,
    createObservableAnnotation,
    createAutoAnnotation,
    initObservable,
    decorateObservable20223_
} from "../internal"
import { createDecoratorAnnotation, type DecoratorAnnotation } from "./decoratorannotation"
import type { ClassAccessorAndFieldDecorator } from "../types/decorator_fills"

export const OBSERVABLE = "observable"
export const OBSERVABLE_REF = "observable.ref"
export const OBSERVABLE_SHALLOW = "observable.shallow"
export const OBSERVABLE_STRUCT = "observable.struct"

export type CreateObservableOptions = {
    name?: string
    equals?: IEqualsComparer<any>
    deep?: boolean
    defaultDecorator?: Annotation
    autoBind?: boolean
}

// Predefined bags of create observable options, to avoid allocating temporarily option objects
// in the majority of cases
export const defaultCreateObservableOptions: CreateObservableOptions = {
    deep: true,
    name: undefined,
    defaultDecorator: undefined
}
Object.freeze(defaultCreateObservableOptions)

export function asCreateObservableOptions(thing: any): CreateObservableOptions {
    return thing || defaultCreateObservableOptions
}

const observableAnnotation = createObservableAnnotation(OBSERVABLE)
const observableRefAnnotation = createObservableAnnotation(OBSERVABLE_REF, {
    enhancer_: referenceEnhancer
})
const observableShallowAnnotation = createObservableAnnotation(OBSERVABLE_SHALLOW, {
    enhancer_: shallowEnhancer
})
const observableStructAnnotation = createObservableAnnotation(OBSERVABLE_STRUCT, {
    enhancer_: refStructEnhancer
})

function createObservableDecoratorAnnotation(
    annotation: Annotation
): DecoratorAnnotation<ClassAccessorAndFieldDecorator> {
    return createDecoratorAnnotation(annotation, decorateObservable20223_)
}

export function getEnhancerFromOptions(options: CreateObservableOptions): IEnhancer<any> {
    return options.deep === true
        ? deepEnhancer
        : options.deep === false
        ? referenceEnhancer
        : getEnhancerFromAnnotation(options.defaultDecorator)
}

export function getAnnotationFromOptions(
    options?: CreateObservableOptions
): Annotation | undefined {
    return options ? options.defaultDecorator ?? createAutoAnnotation(options) : undefined
}

export function getEnhancerFromAnnotation(annotation?: Annotation): IEnhancer<any> {
    return !annotation ? deepEnhancer : annotation.options_?.enhancer_ ?? deepEnhancer
}

/**
 * Turns an object, array or function into a reactive structure.
 * @param v the value which should become observable.
 */
function createObservable(v: any, arg2?: any, arg3?: any) {
    if (arg2 && typeof arg2.kind === "string") {
        return decorateObservable20223_(observableAnnotation, v, arg2)
    }

    // already observable - ignore
    if (isObservable(v)) {
        return v
    }

    // plain object
    if (isPlainObject(v)) {
        return observable.object(v, arg2, arg3)
    }

    // Array
    if (Array.isArray(v)) {
        return observable.array(v, arg2)
    }

    // Map
    if (isES6Map(v)) {
        return observable.map(v, arg2)
    }

    // Set
    if (isES6Set(v)) {
        return observable.set(v, arg2)
    }

    // other object - ignore
    if (typeof v === "object" && v !== null) {
        return v
    }

    // anything else
    return observable.box(v, arg2)
}

export interface IObservableValueFactory {
    <T>(value: T, options?: CreateObservableOptions): IObservableValue<T>
    <T>(value?: T, options?: CreateObservableOptions): IObservableValue<T | undefined>
}

export interface IObservableMapFactory {
    <K = any, V = any>(): ObservableMap<K, V>
    <K, V>(initialValues?: IMapEntries<K, V>, options?: CreateObservableOptions): ObservableMap<
        K,
        V
    >
    <K, V>(
        initialValues?: IReadonlyMapEntries<K, V>,
        options?: CreateObservableOptions
    ): ObservableMap<K, V>
    <K, V>(initialValues?: IKeyValueMap<V>, options?: CreateObservableOptions): ObservableMap<K, V>
    <K, V>(initialValues?: Map<K, V>, options?: CreateObservableOptions): ObservableMap<K, V>
    <K = any, V = any>(initialValues: undefined, options?: CreateObservableOptions): ObservableMap<
        K,
        V
    >
}

export interface IObservableFactory extends Annotation, ClassAccessorAndFieldDecorator {
    <T = any>(value: T[], options?: CreateObservableOptions): IObservableArray<T>
    <T = any>(value: Set<T>, options?: CreateObservableOptions): ObservableSet<T>
    <K = any, V = any>(value: Map<K, V>, options?: CreateObservableOptions): ObservableMap<K, V>
    <T extends object>(
        value: T,
        annotations?: AnnotationsMap<T, never>,
        options?: CreateObservableOptions
    ): T

    box: IObservableValueFactory
    array: <T = any>(initialValues?: T[], options?: CreateObservableOptions) => IObservableArray<T>
    set: <T = any>(
        initialValues?: IObservableSetInitialValues<T>,
        options?: CreateObservableOptions
    ) => ObservableSet<T>
    map: IObservableMapFactory
    object: <T = any>(
        props: T,
        annotations?: AnnotationsMap<T, never>,
        options?: CreateObservableOptions
    ) => T
}

const observableFactories: IObservableFactory = {
    box<T = any>(value: T, options?: CreateObservableOptions): IObservableValue<T> {
        const o = asCreateObservableOptions(options)
        return new ObservableValue(value, getEnhancerFromOptions(o), o.name, o.equals)
    },
    array<T = any>(initialValues?: T[], options?: CreateObservableOptions): IObservableArray<T> {
        const o = asCreateObservableOptions(options)
        return createObservableArray(initialValues, getEnhancerFromOptions(o), o.name)
    },
    map<K = any, V = any>(
        initialValues?: IObservableMapInitialValues<K, V>,
        options?: CreateObservableOptions
    ): ObservableMap<K, V> {
        const o = asCreateObservableOptions(options)
        return new ObservableMap<K, V>(initialValues, getEnhancerFromOptions(o), o.name)
    },
    set<T = any>(
        initialValues?: IObservableSetInitialValues<T>,
        options?: CreateObservableOptions
    ): ObservableSet<T> {
        const o = asCreateObservableOptions(options)
        return new ObservableSet<T>(initialValues, getEnhancerFromOptions(o), o.name)
    },
    object<T extends object = any>(
        props: T,
        annotations?: AnnotationsMap<T, never>,
        options?: CreateObservableOptions
    ): T {
        return initObservable(() =>
            extendObservable(asDynamicObservableObject({}, options), props, annotations)
        )
    }
} as any

export const observableRef = createObservableDecoratorAnnotation(observableRefAnnotation)
export const observableShallow = createObservableDecoratorAnnotation(observableShallowAnnotation)
export const observableDeep = createObservableDecoratorAnnotation(observableAnnotation)
export const observableStruct = createObservableDecoratorAnnotation(observableStructAnnotation)

// eslint-disable-next-line
export var observable: IObservableFactory = assign(
    createObservable,
    observableAnnotation,
    observableFactories
)
