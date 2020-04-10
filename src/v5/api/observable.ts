import {
    IEnhancer,
    IEqualsComparer,
    IObservableArray,
    IObservableMapInitialValues,
    IObservableSetInitialValues,
    IObservableObject,
    IObservableValue,
    ObservableMap,
    ObservableSet,
    ObservableValue,
    createDynamicObservableObject,
    createObservableArray,
    deepEnhancer,
    extendObservable,
    fail,
    isES6Map,
    isES6Set,
    isObservable,
    isPlainObject,
    referenceEnhancer,
    Annotation,
    shallowEnhancer,
    refStructEnhancer,
    AnnotationsMap,
    asObservableObject,
    storeDecorator,
    createDecorator
} from "../internal"

export type CreateObservableOptions = {
    name?: string
    equals?: IEqualsComparer<any>
    deep?: boolean
    defaultDecorator?: Annotation
    proxy?: boolean
}

// Predefined bags of create observable options, to avoid allocating temporarily option objects
// in the majority of cases
export const defaultCreateObservableOptions: CreateObservableOptions = {
    deep: true,
    name: undefined,
    defaultDecorator: undefined,
    proxy: true
}
Object.freeze(defaultCreateObservableOptions)

function assertValidOption(key: string) {
    if (!/^(deep|name|equals|defaultDecorator|proxy)$/.test(key))
        fail(`invalid option for (extend)observable: ${key}`)
}

export function asCreateObservableOptions(thing: any): CreateObservableOptions {
    if (thing === null || thing === undefined) return defaultCreateObservableOptions
    if (typeof thing === "string") return { name: thing, deep: true, proxy: true }
    if (process.env.NODE_ENV !== "production") {
        if (typeof thing !== "object") return fail("expected options object")
        Object.keys(thing).forEach(assertValidOption)
    }
    return thing as CreateObservableOptions
}

export function getEnhancerFromOption(options: CreateObservableOptions): IEnhancer<any> {
    return options.deep === true
        ? deepEnhancer
        : options.deep === false
        ? referenceEnhancer
        : getEnhancerFromAnnotation(options.defaultDecorator)
}

export function getEnhancerFromAnnotation(annotation?: Annotation): IEnhancer<any> {
    if (!annotation) {
        return deepEnhancer
    }
    switch (annotation.annotationType) {
        case "observable":
            return deepEnhancer
        case "observable.ref":
            return referenceEnhancer
        case "observable.shallow":
            return shallowEnhancer
        case "observable.struct":
            return refStructEnhancer
        default:
            return fail(`Invalid annotation: '${annotation.annotationType}'`)
    }
}

/**
 * Turns an object, array or function into a reactive structure.
 * @param v the value which should become observable.
 */
function createObservable(v: any, arg2?: any, arg3?: any) {
    // @observable someProp; TODO delete
    if (typeof arguments[1] === "string" || typeof arguments[1] === "symbol") {
        storeDecorator(v, arg2, "observable")
        return
    }

    // it is an observable already, done
    if (isObservable(v)) return v

    // something that can be converted and mutated?
    const res = isPlainObject(v)
        ? observable.object(v, arg2, arg3)
        : Array.isArray(v)
        ? observable.array(v, arg2)
        : isES6Map(v)
        ? observable.map(v, arg2)
        : isES6Set(v)
        ? observable.set(v, arg2)
        : v

    // this value could be converted to a new observable data structure, return it
    if (res !== v) return res
    return observable.box(v)
}
createObservable.annotationType = "observable"

export interface IObservableFactory extends Annotation, PropertyDecorator {
    <T = any>(value: T[], options?: CreateObservableOptions): IObservableArray<T>
    <T = any>(value: Set<T>, options?: CreateObservableOptions): ObservableSet<T>
    <K = any, V = any>(value: Map<K, V>, options?: CreateObservableOptions): ObservableMap<K, V>
    <T extends Object>(
        value: T,
        decorators?: AnnotationsMap<T>,
        options?: CreateObservableOptions
    ): T & IObservableObject

    box<T = any>(value?: T, options?: CreateObservableOptions): IObservableValue<T>
    array<T = any>(initialValues?: T[], options?: CreateObservableOptions): IObservableArray<T>
    set<T = any>(
        initialValues?: IObservableSetInitialValues<T>,
        options?: CreateObservableOptions
    ): ObservableSet<T>
    map<K = any, V = any>(
        initialValues?: IObservableMapInitialValues<K, V>,
        options?: CreateObservableOptions
    ): ObservableMap<K, V>
    object<T = any>(
        props: T,
        decorators?: AnnotationsMap<T>,
        options?: CreateObservableOptions
    ): T & IObservableObject

    /**
     * Decorator that creates an observable that only observes the references, but doesn't try to turn the assigned value into an observable.ts.
     */
    ref: Annotation & PropertyDecorator
    /**
     * Decorator that creates an observable converts its value (objects, maps or arrays) into a shallow observable structure
     */
    shallow: Annotation & PropertyDecorator
    deep: Annotation & PropertyDecorator
    struct: Annotation & PropertyDecorator
}

const observableFactories: IObservableFactory = {
    box<T = any>(value?: T, options?: CreateObservableOptions): IObservableValue<T> {
        const o = asCreateObservableOptions(options)
        return new ObservableValue(value, getEnhancerFromOption(o), o.name, true, o.equals)
    },
    array<T = any>(initialValues?: T[], options?: CreateObservableOptions): IObservableArray<T> {
        const o = asCreateObservableOptions(options)
        return createObservableArray(initialValues, getEnhancerFromOption(o), o.name) as any
    },
    map<K = any, V = any>(
        initialValues?: IObservableMapInitialValues<K, V>,
        options?: CreateObservableOptions
    ): ObservableMap<K, V> {
        const o = asCreateObservableOptions(options)
        return new ObservableMap<K, V>(initialValues, getEnhancerFromOption(o), o.name)
    },
    set<T = any>(
        initialValues?: IObservableSetInitialValues<T>,
        options?: CreateObservableOptions
    ): ObservableSet<T> {
        const o = asCreateObservableOptions(options)
        return new ObservableSet<T>(initialValues, getEnhancerFromOption(o), o.name)
    },
    object<T = any>(
        props: T,
        decorators?: AnnotationsMap<T>,
        options?: CreateObservableOptions
    ): T & IObservableObject {
        const o = asCreateObservableOptions(options)
        const base = {}
        asObservableObject(base, options?.name, getEnhancerFromOption(o))
        return extendObservable(
            o.proxy === false ? base : createDynamicObservableObject(base),
            props,
            decorators
        )
    },
    ref: createDecorator("observable.ref"),
    shallow: createDecorator("observable.shallow"),
    deep: createDecorator("observable"),
    struct: createDecorator("observable.struct")
} as any

export const observable: IObservableFactory = Object.assign(createObservable, observableFactories)
