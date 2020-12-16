import {
    $mobx,
    asObservableObject,
    addHiddenProp,
    action,
    autoAction,
    isAction,
    computed,
    observable,
    AnnotationsMap,
    Annotation,
    getEnhancerFromAnnotation,
    endBatch,
    startBatch,
    CreateObservableOptions,
    ObservableObjectAdministration,
    collectStoredAnnotations,
    isObservableProp,
    getDescriptor,
    isPlainObject,
    isObservableObject,
    isFunction,
    die,
    /*ACTION,
    ACTION_BOUND,
    AUTOACTION,
    AUTOACTION_BOUND,
    COMPUTED,
    COMPUTED_STRUCT,
    OBSERVABLE,
    OBSERVABLE_REF,
    OBSERVABLE_SHALLOW,
    OBSERVABLE_STRUCT,*/
    getOwnPropertyDescriptors,
    defineProperty,
    ownKeys,
    objectPrototype,
    hasProp,
    FLOW,
    flow,
    isGenerator,
    isFlow,
    appliedAnnotationsSymbol,
    storedAnnotationsSymbol,
    inferredAnnotationsSymbol
} from "../internal"

// TODO? cache prototype descriptors?

// vratim undefined... pouziju default na adm

/**
 * Infers the best fitting annotation from property descriptor
 * - getter(+setter) -> computed
 * - setter w/o getter -> false
 * - generator -> flow
 * - function -> action
 * - other -> observable.deep
 */
// TODO delete
function inferAnnotation(
    desc: PropertyDescriptor,
    defaultAnnotation: Annotation | undefined,
    autoBind: boolean
): Annotation | boolean {
    if (desc.get) return computed
    if (desc.set) return false // ignore setter w/o getter
    // if already wrapped in action, don't do that another time, but assume it is already set up properly
    if (isFunction(desc.value))
        return isGenerator(desc.value)
            ? flow
            : isAction(desc.value)
            ? false
            : autoBind
            ? autoAction.bound
            : autoAction
    // if (!desc.configurable || !desc.writable) return false
    return defaultAnnotation ?? observable.deep
}

// Hack based on https://github.com/Microsoft/TypeScript/issues/14829#issuecomment-322267089
// We need this, because otherwise, AdditionalKeys is going to be inferred to be any
// set of superfluous keys. But, we rather want to get a compile error unless AdditionalKeys is
// _explicity_ passed as generic argument
// Fixes: https://github.com/mobxjs/mobx/issues/2325#issuecomment-691070022
type NoInfer<T> = [T][T extends any ? 0 : never]

export function makeObservable<T, AdditionalKeys extends PropertyKey = never>(
    target: T,
    annotations?: AnnotationsMap<T, NoInfer<AdditionalKeys>>,
    options?: CreateObservableOptions
): T {
    const adm = asObservableObject(target, options)[$mobx]
    startBatch()
    try {
        // Default to decorators
        annotations ??= collectStoredAnnotations(target)

        // Annotate
        ownKeys(annotations).forEach(key => adm.make_(key, annotations![key]))
    } finally {
        endBatch()
    }
    return target
}

export function makeAutoObservable<T extends Object, AdditionalKeys extends PropertyKey = never>(
    target: T,
    overrides?: AnnotationsMap<T, NoInfer<AdditionalKeys>>,
    options?: CreateObservableOptions
): T {
    const adm = asObservableObject(target, options)[$mobx]

    if (__DEV__) {
        if (!adm.isPlainObject_ && !isPlainObject(Object.getPrototypeOf(target)))
            die(`'makeAutoObservable' can only be used for classes that don't have a superclass`)
        if (isObservableObject(target))
            die(`makeAutoObservable can only be used on objects not already made observable`)
    }

    startBatch()
    try {
        if (target[inferredAnnotationsSymbol]) {
            for (let key in target[inferredAnnotationsSymbol]) {
                adm.make_(key, target[inferredAnnotationsSymbol][key])
            }
        } else {
            const keys = new Set(collectAllKeys(target))
            keys.forEach(key => {
                if (key === "constructor" || key === $mobx) return
                adm.make_(key, overrides?.[key] ?? true)
            })
        }
    } finally {
        endBatch()
    }
    return target
}
/*
function collectAllKeys(object) {
    const keys = {}
    let current = object
    const collect = key => (keys[key] = true)
    while (current && current !== objectPrototype) {
        Object.getOwnPropertyNames(current).forEach(collect)
        Object.getOwnPropertySymbols(current).forEach(collect)
        current = Object.getPrototypeOf(current)
    }
    return keys
}
*/

function collectAllKeys(object): PropertyKey[] {
    const keys = ownKeys(object)
    const proto = Object.getPrototypeOf(object)
    return proto === objectPrototype ? keys : keys.concat(collectAllKeys(proto))
}

/*
export function makeObservable<T, AdditionalKeys extends PropertyKey = never>(
    target: T,
    annotations?: AnnotationsMap<T, NoInfer<AdditionalKeys>>,
    options?: CreateObservableOptions
): T {
    const autoBind = !!options?.autoBind
    const adm = asObservableObject(
        target,
        options?.name,
        getEnhancerFromAnnotation(options?.defaultDecorator)
    )
    startBatch()
    try {
        // Prepare structure for tracking which fields were already annotated
        if (__DEV__ && !target[appliedAnnotationsSymbol]) {
            addHiddenProp(target, appliedAnnotationsSymbol, {})
        }

        // Default to decorators
        annotations ??= collectStoredAnnotations(target)

        // Annotate
        ownKeys(annotations).forEach(key => annotate(adm, key, annotations![key], autoBind))
    } finally {
        endBatch()
    }
    return target
}
*/
/*
export function makeAutoObservable<T extends Object, AdditionalKeys extends PropertyKey = never>(
    target: T,
    overrides?: AnnotationsMap<T, NoInfer<AdditionalKeys>>,
    options?: CreateObservableOptions
): T {
    const proto = Object.getPrototypeOf(target)
    const isPlain = proto == null || proto === objectPrototype
    if (__DEV__) {
        if (!isPlain && !isPlainObject(proto))
            die(`'makeAutoObservable' can only be used for classes that don't have a superclass`)
        if (isObservableObject(target))
            die(`makeAutoObservable can only be used on objects not already made observable`)
    }
    let annotations: AnnotationsMap<any, any>
    if (!isPlain && hasProp(proto, inferredAnnotationsSymbol)) {
        // shortcut, reuse inferred annotations for this type from the previous time
        annotations = proto[inferredAnnotationsSymbol] as any
    } else {
        annotations = { ...overrides }
        inferAnnotationsFromObject(target, annotations, options)
        if (!isPlain) {
            inferAnnotationsFromProto(proto, annotations, options)
            addHiddenProp(proto, inferredAnnotationsSymbol, annotations)
        }
    }
    makeObservable(target, annotations as any, options)
    return target
}
*/

// extend ... from descriptor
// make from descriptor
function getClosestDescriptor(object, key): PropertyDescriptor | undefined {
    let current = object
    while (current && current !== objectPrototype) {
        const descriptor = getDescriptor(object, key)
        if (descriptor) return descriptor
    }
    return undefined
}
// TODO delete
function inferAnnotationsFromObject(
    target,
    collector: AnnotationsMap<any, any>,
    options: CreateObservableOptions | undefined
) {
    const autoBind = !!options?.autoBind
    const defaultAnnotation: Annotation =
        options?.deep === undefined
            ? options?.defaultDecorator ?? observable.deep
            : options?.deep
            ? observable.deep
            : observable.ref
    Object.entries(getOwnPropertyDescriptors(target)).forEach(([key, descriptor]) => {
        if (key in collector || key === "constructor") return
        collector[key] = inferAnnotation(descriptor, defaultAnnotation, autoBind)
    })
}
// TODO delete
function inferAnnotationsFromProto(
    proto: any,
    collector: AnnotationsMap<any, any>,
    options?: CreateObservableOptions
) {
    Object.entries(getOwnPropertyDescriptors(proto)).forEach(([key, prop]) => {
        if (key in collector || key === "constructor") return
        if (prop.get) {
            collector[key as any] = computed
        } else if (isFunction(prop.value)) {
            collector[key as any] = isGenerator(prop.value)
                ? flow
                : options?.autoBind
                ? autoAction.bound
                : autoAction
        }
    })
}
