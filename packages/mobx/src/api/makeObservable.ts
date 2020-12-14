import {
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
    ACTION,
    ACTION_BOUND,
    AUTOACTION,
    AUTOACTION_BOUND,
    COMPUTED,
    COMPUTED_STRUCT,
    OBSERVABLE,
    OBSERVABLE_REF,
    OBSERVABLE_SHALLOW,
    OBSERVABLE_STRUCT,
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
    storedAnnotationsSymbol
} from "../internal"
import { getAnnotationFromOptions } from "./observable"

const cachedAnnotationsSymbol = Symbol("mobx-cached-annotations")

/**
 * Infers the best fitting annotation from property descriptor
 * - getter(+setter) -> computed
 * - setter w/o getter -> false
 * - generator -> flow
 * - function -> action
 * - other -> observable.deep
 */
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

function inferAnnotation(desc: PropertyDescriptor, autoBind: boolean): Annotation | boolean {
    //if ()
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
    const autoBind = !!options?.autoBind
    const defaultAnnotation = getAnnotationFromOptions(options)
    const adm = asObservableObject(target, options?.name, defaultAnnotation)
    startBatch()
    try {
        // Default to decorators
        annotations ??= collectStoredAnnotations(target)

        // TODO infer annotation
        // Annotate
        ownKeys(annotations).forEach(key => {
            let annotation = annotations![key]
            // infer only for true
            //if (annotation === false)
            //annotate(adm, key, , autoBind)
        })
    } finally {
        endBatch()
    }
    return target
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
    if (!isPlain && hasProp(proto, cachedAnnotationsSymbol)) {
        // shortcut, reuse inferred annotations for this type from the previous time
        annotations = proto[cachedAnnotationsSymbol] as any
    } else {
        annotations = { ...overrides }
        inferAnnotationsFromObject(target, annotations, options)
        if (!isPlain) {
            inferAnnotationsFromProto(proto, annotations, options)
            addHiddenProp(proto, cachedAnnotationsSymbol, annotations)
        }
    }
    makeObservable(target, annotations as any, options)
    return target
}

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
