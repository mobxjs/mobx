import {
    IEnhancer,
    IEqualsComparer,
    IObservableArray,
    IObservableMapInitialValues,
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
    asObservableObject,
    storeAnnotation,
    createDecoratorAnnotation,
    createLegacyArray,
    globalState,
    assign,
    isStringish,
    createObservableAnnotation,
    createAutoAnnotation,
    initObservable
} from "../internal"

export const OBSERVABLE = "observable"
export const OBSERVABLE_REF = "observable.ref"
export const OBSERVABLE_SHALLOW = "observable.shallow"
export const OBSERVABLE_STRUCT = "observable.struct"

export type NameableOption = {
    name?: string
}

export type ComparableOption<T> = {
    equals?: IEqualsComparer<T>
}

export type ProxyOption = {
    proxy?: boolean
}

export type AutoBindOption = {
    autoBind?: boolean
}

export type EnhancerOption = {
    defaultDecorator?: Annotation
    deep?: boolean
}

const observableAnnotation = createObservableAnnotation(OBSERVABLE)
const observableRefAnnotation = createObservableAnnotation(OBSERVABLE_REF, {
    enhancer: referenceEnhancer
})
const observableShallowAnnotation = createObservableAnnotation(OBSERVABLE_SHALLOW, {
    enhancer: shallowEnhancer
})
const observableStructAnnotation = createObservableAnnotation(OBSERVABLE_STRUCT, {
    enhancer: refStructEnhancer
})
const observableDecoratorAnnotation = createDecoratorAnnotation(observableAnnotation)

export function getEnhancerFromOptions(options: EnhancerOption): IEnhancer<any> {
    return options.deep === true
        ? deepEnhancer
        : options.deep === false
        ? referenceEnhancer
        : getEnhancerFromAnnotation(options.defaultDecorator)
}

export function getAnnotationFromOptions(options?: EnhancerOption): Annotation | undefined {
    return options?.defaultDecorator ?? createAutoAnnotation(options)
}

export function getEnhancerFromAnnotation<T>(annotation?: Annotation): IEnhancer<T> {
    return (
        (annotation?.options_ as { enhancer: IEnhancer<T> } | undefined)?.enhancer ?? deepEnhancer
    )
}

/**
 * Turns an object, array or function into a reactive structure.
 * @param v the value which should become observable.
 */
function createObservable<T>(
    v: T,
    arg2?: string | number | symbol,
    arg3?: CreateObservableObjectOptions
) {
    // @observable someProp;
    if (isStringish(arg2)) {
        storeAnnotation(v, arg2, observableAnnotation)
        return
    }

    // already observable - ignore
    if (isObservable(v)) {
        return v
    }

    // plain object
    if (isPlainObject(v)) {
        return observable.object(v as unknown as object, arg2, arg3) as unknown as T
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
assign(createObservable, observableDecoratorAnnotation)

export type CreateObservableValueOptions<T> = NameableOption & ComparableOption<T> & EnhancerOption

export interface IObservableValueFactory {
    <T>(value: T, options?: CreateObservableValueOptions<T>): IObservableValue<T>
    <T>(value?: T, options?: CreateObservableValueOptions<T>): IObservableValue<T | undefined>
}

const valueFactory: IObservableValueFactory = <T>(
    value: T,
    options?: CreateObservableValueOptions<T>
) => {
    const { name, equals, ...rest } = options ?? {}

    return new ObservableValue(value, getEnhancerFromOptions(rest), name, true, equals)
}

export type CreateObservableArrayOptions = NameableOption & ProxyOption & EnhancerOption

export interface IObservableArrayFactory {
    <T>(initialValues?: T[], options?: CreateObservableArrayOptions): IObservableArray<T>
}

const arrayFactory: IObservableArrayFactory = <T>(
    initialValues?: T[],
    options?: CreateObservableArrayOptions
) => {
    const { proxy = true, name, ...rest } = options ?? {}

    return (
        globalState.useProxies === false || proxy === false
            ? createLegacyArray
            : createObservableArray
    )(initialValues, getEnhancerFromOptions(rest), name)
}

export type CreateObservableSetOptions = NameableOption & EnhancerOption

export interface IObservableSetFactory {
    <T>(
        initialValues?: IObservableSetInitialValues<T>,
        options?: CreateObservableSetOptions
    ): ObservableSet<T>
}

const setFactory: IObservableSetFactory = <T>(
    initialValues?: IObservableSetInitialValues<T>,
    options?: CreateObservableSetOptions
) => {
    const { name, ...rest } = options ?? {}

    return new ObservableSet<T>(initialValues, getEnhancerFromOptions(rest), name)
}

export type CreateObservableMapOptions = NameableOption & EnhancerOption

export interface IObservableMapFactory {
    <K, V>(
        initialValues?: IObservableMapInitialValues<K, V>,
        options?: CreateObservableMapOptions
    ): ObservableMap<K, V>
}

const mapFactory: IObservableMapFactory = <K, V>(
    initialValues?: IObservableMapInitialValues<K, V>,
    options?: CreateObservableMapOptions
) => {
    const { name, ...rest } = options ?? {}

    return new ObservableMap<K, V>(initialValues, getEnhancerFromOptions(rest), name)
}

export type CreateObservableObjectOptions = NameableOption &
    ProxyOption &
    EnhancerOption &
    AutoBindOption

export interface IObservableObjectFactory {
    <T extends object>(
        props: T,
        decorators?: AnnotationsMap<T, never>,
        options?: CreateObservableObjectOptions
    ): T
}

const objectFactory: IObservableObjectFactory = <T extends object>(
    props: T,
    decorators?: AnnotationsMap<T, never>,
    options?: CreateObservableObjectOptions
) => {
    return initObservable(() =>
        extendObservable(
            globalState.useProxies === false || options?.proxy === false
                ? asObservableObject({}, options)
                : asDynamicObservableObject({}, options),
            props,
            decorators
        )
    )
}

export interface IObservableFactory
    extends IObservableArrayFactory,
        IObservableSetFactory,
        IObservableObjectFactory,
        IObservableMapFactory,
        Annotation,
        PropertyDecorator {
    box: IObservableValueFactory
    array: IObservableArrayFactory
    set: IObservableSetFactory
    map: IObservableMapFactory
    object: IObservableObjectFactory

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
    box: valueFactory,
    array: arrayFactory,
    set: setFactory,
    map: mapFactory,
    object: objectFactory,
    ref: createDecoratorAnnotation(observableRefAnnotation),
    shallow: createDecoratorAnnotation(observableShallowAnnotation),
    deep: observableDecoratorAnnotation,
    struct: createDecoratorAnnotation(observableStructAnnotation)
} as any

export const observable: IObservableFactory = assign(createObservable, observableFactories)
