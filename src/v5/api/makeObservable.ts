import {
    asObservableObject,
    isPlainObject,
    hasProp,
    addHiddenProp,
    action,
    fail,
    isAction,
    computed,
    observable,
    AnnotationsMap,
    Annotation,
    getEnhancerFromAnnotation,
    endBatch,
    startBatch,
    CreateObservableOptions
} from "../internal"
import { isComputedProp } from "../../v4/mobx"

function getDecoratorsFromMetaData<T extends Object>(target: T): AnnotationsMap<T> {
    fail("not implemented yet")
    // TODO: implement, if not available, throw
    return {}
}

function makeAction(target, key, name, fn) {
    addHiddenProp(target, key, action(name || key, fn))
}

function notFound(key): never {
    fail(`Cannot decorate unknown member '${key}'`)
}

function getInferredAnnotation(
    target: any,
    prop: string,
    defaultAnnotation: Annotation | undefined
): Annotation | boolean {
    const desc = Object.getOwnPropertyDescriptor(target, prop)
    if (!desc) return notFound(prop)
    if (desc.get) return computed
    if (desc.set) return false // ignore those
    if (typeof desc.value === "function") return action.bound
    return defaultAnnotation ?? observable.deep
}

function getDescriptor(target: Object, prop: PropertyKey): [PropertyDescriptor, Object] {
    let current = target
    while (current && current !== Object.prototype) {
        // TODO: cache meta data, especially for members from prototypes?
        const desc = Object.getOwnPropertyDescriptor(current, prop)
        if (desc) {
            return [desc, current]
        }
        current = Object.getPrototypeOf(current)
    }
    fail(`Property is not defined: '${prop.toString()}'`)
}

export function makeObservable<T extends Object>(
    target: T,
    annotations: AnnotationsMap<T> = getDecoratorsFromMetaData(target),
    options?: CreateObservableOptions
) {
    const adm = asObservableObject(
        target,
        options?.name,
        getEnhancerFromAnnotation(options?.defaultDecorator)
    )
    startBatch()
    try {
        Object.getOwnPropertyNames(annotations).forEach(key => {
            let annotation = annotations[key]
            if (annotation === false) {
                return
            }
            if (annotation === true) {
                annotation = adm.defaultEnhancer
            }
            const [desc, owner] = getDescriptor(target, key)
            switch (annotation.annotationType) {
                case "action":
                    if (owner !== target) {
                        if (!isAction(owner[key]))
                            makeAction(owner, key, annotation.arg, desc.value)
                    } else {
                        makeAction(target, key, annotation.arg, desc.value)
                    }
                    break
                case "action.bound":
                    makeAction(target, key, annotation.arg, desc.value.bind(target))
                    break
                case "computed.struct":
                case "computed": {
                    // TODO: add to target or proto?
                    adm.addComputedProp(target, key, {
                        get: desc.get,
                        set: desc.set,
                        compareStructural: annotation.annotationType === "computed.struct",
                        ...annotation.arg
                    })
                    break
                }
                case "observable":
                case "observable.ref":
                case "observable.shallow":
                case "observable.struct": {
                    const enhancer = getEnhancerFromAnnotation(annotation)
                    adm.addObservableProp(key, desc.value, enhancer)
                    break
                }
                default:
                    fail(
                        `invalid decorator '${annotation.annotationType ??
                            annotation}' for '${key}'`
                    )
            }
        })
    } finally {
        endBatch()
    }
}

export function makeAutoObservable<T extends Object>(
    target: T,
    excludes: AnnotationsMap<T>,
    options: CreateObservableOptions
) {
    let annotations = { ...excludes }
    extractAnnotationsFromObject(target, annotations, options)
    extractAnnotationsFromProto(target, annotations)
    makeObservable(target, annotations, options)
}

export function extractAnnotationsFromObject(
    target,
    collector: AnnotationsMap<any>,
    options: CreateObservableOptions | undefined
) {
    const defaultAnnotation: Annotation = options?.deep
        ? observable.deep
        : options?.defaultDecorator ?? observable.deep
    Object.keys(target).forEach(key => {
        if (key in collector) return
        collector[key] = getInferredAnnotation(target, key, defaultAnnotation)
    })
}

function extractAnnotationsFromProto(target: any, collector: AnnotationsMap<any>) {
    const proto = Object.getPrototypeOf(target)
    if (!proto || proto === Object.prototype) return
    Object.keys(proto).forEach(key => {
        if (key in collector) return
        const prop = Object.getOwnPropertyDescriptor(proto, key)!
        if (prop.get) {
            collector[key] = computed
        } else if (typeof prop.value === "function") {
            collector[key] = action.bound
        }
    })
}
