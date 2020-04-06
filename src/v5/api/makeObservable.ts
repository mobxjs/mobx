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

export function makeObservable<T extends Object>(
    target: T,
    annotations: AnnotationsMap<T> = getDecoratorsFromMetaData(target),
    options?: CreateObservableOptions
) {
    // TODO: store meta data?
    const isPlain = isPlainObject(target)
    const proto = isPlain ? target : Object.getPrototypeOf(target)
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
            switch (annotation.decoratorType) {
                case "action":
                    if (hasProp(target, key)) {
                        makeAction(target, key, annotation.options, target[key])
                    } else if (!isPlain && hasProp(proto, key)) {
                        if (!isAction(proto[key]))
                            makeAction(proto, key, annotation.options, proto[key])
                    } else {
                        notFound(key)
                    }
                    break
                case "action.bound":
                    if (hasProp(target, key)) {
                        makeAction(target, key, annotation.options, target[key].bind(target))
                    } else if (!isPlain && hasProp(proto, key)) {
                        makeAction(target, key, annotation.options, proto[key].bind(target))
                    } else {
                        notFound(key)
                    }
                    break
                case "computed.struct":
                case "computed": {
                    const descriptor = Object.getOwnPropertyDescriptor(proto, key)
                    if (!descriptor) {
                        notFound(key)
                    } else {
                        // TODO: can be done cleaner?
                        adm.addComputedProp(proto, key, {
                            get: descriptor.get,
                            set: descriptor.set,
                            compareStructural: annotation.decoratorType === "computed.struct",
                            ...annotation.options
                        })
                    }
                    break
                }
                case "observable":
                case "observable.ref":
                case "observable.shallow":
                case "observable.struct": {
                    const descriptor = Object.getOwnPropertyDescriptor(proto, key)
                    if (!descriptor) {
                        notFound(key)
                    } else {
                        const enhancer = getEnhancerFromAnnotation(annotation)
                        adm.addObservableProp(key, descriptor.value, enhancer)
                    }
                    break
                }
                default:
                    fail("invalid decorator for " + key)
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
