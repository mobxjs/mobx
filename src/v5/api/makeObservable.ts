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
    CreateObservableOptions,
    ObservableObjectAdministration,
    isComputedProp
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
    desc: PropertyDescriptor,
    defaultAnnotation: Annotation | undefined
): Annotation | boolean {
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

export function makeProperty(
    adm: ObservableObjectAdministration,
    owner: Object,
    key: PropertyKey,
    descriptor: PropertyDescriptor,
    annotation: Annotation | boolean,
    forceCopy: boolean // extend observable will copy even unannotated properties
): void {
    const { target } = adm
    const defaultAnnotation: Annotation | undefined = observable // TODO: grap this from adm instead!
    if (annotation === true) {
        annotation = getInferredAnnotation(descriptor, defaultAnnotation)
    }
    if (annotation === false) {
        if (forceCopy) {
            Object.defineProperty(target, key, descriptor)
        }
        return
    }
    if (!annotation || annotation === true || !annotation.annotationType) {
        return fail(
            // @ts-ignore
            `invalid decorator '${annotation?.annotationType ??
                annotation}' for '${key.toString()}'`
        )
    }
    switch (annotation.annotationType) {
        case "action":
            if (owner !== target && !forceCopy) {
                if (!isAction(owner[key])) makeAction(owner, key, annotation.arg, descriptor.value)
            } else {
                makeAction(target, key, annotation.arg, descriptor.value)
            }
            break
        case "action.bound":
            makeAction(target, key, annotation.arg, descriptor.value.bind(target))
            break
        case "computed.struct":
        case "computed": {
            // TODO: add to target or proto?
            adm.addComputedProp(target, key, {
                get: descriptor.get,
                set: descriptor.set,
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
            adm.addObservableProp(key, descriptor.value, enhancer)
            break
        }
        default:
            fail(
                `invalid decorator '${annotation.annotationType ??
                    annotation}' for '${key.toString()}'`
            )
    }
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
        const make = key => {
            let annotation = annotations[key]
            const [desc, owner] = getDescriptor(target, key)
            makeProperty(adm, owner, key, desc, annotation, false)
        }
        Object.getOwnPropertyNames(annotations).forEach(make)
        Object.getOwnPropertySymbols(annotations).forEach(make) // TODO: check if available everywhere
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

function extractAnnotationsFromObject(
    target,
    collector: AnnotationsMap<any>,
    options: CreateObservableOptions | undefined
) {
    const defaultAnnotation: Annotation = options?.deep
        ? observable.deep
        : options?.defaultDecorator ?? observable.deep
    Object.entries(Object.getOwnPropertyDescriptors(target)).forEach(([key, descriptor]) => {
        if (key in collector) return
        collector[key] = getInferredAnnotation(descriptor, defaultAnnotation)
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
