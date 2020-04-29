import {
    asObservableObject,
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
    invariant,
    applyDecorators,
    isObservableProp,
    getDescriptor,
    isPlainObject,
    isObservableObject
} from "../internal"

function makeAction(target, key, name, fn) {
    addHiddenProp(target, key, action(name || key, fn))
}

function getInferredAnnotation(
    desc: PropertyDescriptor,
    defaultAnnotation: Annotation | undefined
): Annotation | boolean {
    if (desc.get) return computed
    if (desc.set) return false // ignore pure setters
    // if already wrapped in action, don't do that another time, but assume it is already set up properly
    if (typeof desc.value === "function") return isAction(desc.value) ? false : action.bound
    // if (!desc.configurable || !desc.writable) return false
    return defaultAnnotation ?? observable.deep
}

function getDescriptorInChain(target: Object, prop: PropertyKey): [PropertyDescriptor, Object] {
    let current = target
    while (current && current !== Object.prototype) {
        // TODO: cache meta data, especially for members from prototypes?
        const desc = getDescriptor(current, prop)
        if (desc) {
            return [desc, current]
        }
        current = Object.getPrototypeOf(current)
    }
    fail(`Cannot decorate undefined property: '${prop.toString()}'`)
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
    const origAnnotation = annotation
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
        case "action": {
            const fn = descriptor.value
            invariant(
                typeof fn === "function",
                `Cannot decorate '${key.toString()}': action can only be used on properties with a function value.`
            )
            if (owner !== target && !forceCopy) {
                if (!isAction(owner[key])) makeAction(owner, key, annotation.arg, fn)
            } else {
                makeAction(target, key, annotation.arg, fn)
            }
            break
        }
        case "action.bound": {
            const fn = descriptor.value
            invariant(
                typeof fn === "function",
                `Cannot decorate '${key.toString()}': action can only be used on properties with a function value.`
            )
            makeAction(target, key, annotation.arg, fn.bind(adm.proxy || target))
            break
        }
        case "computed.struct":
        case "computed": {
            invariant(
                descriptor.get,
                `Cannot decorate '${key.toString()}': computed can only be used on getter properties.`
            )
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
            // TODO: wrap in __DEV__
            invariant(
                !isObservableProp(target, key as any),
                `Cannot decorate '${key.toString()}': the property is already decorated as observable.`
            )
            invariant(
                "value" in descriptor,
                `Cannot decorate '${key.toString()}': observable cannot be used on setter / getter properties.`
            )
            // if the origAnnotation was true, preferred the adm's default enhancer over the inferred one
            const enhancer =
                origAnnotation === true
                    ? adm.defaultEnhancer
                    : getEnhancerFromAnnotation(annotation)
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

export function makeObservable<T extends Object, AdditionalKeys extends PropertyKey = never>(
    target: T,
    annotations?: AnnotationsMap<T, AdditionalKeys>,
    options?: CreateObservableOptions
) {
    const adm = asObservableObject(
        target,
        options?.name,
        getEnhancerFromAnnotation(options?.defaultDecorator)
    )
    startBatch()
    try {
        if (!annotations) {
            const didDecorate = applyDecorators(target)
            invariant(
                didDecorate,
                `No annotations were passed to makeObservable, but no decorator members have been found either`
            )
            return
        }
        const make = key => {
            let annotation = annotations[key]
            const [desc, owner] = getDescriptorInChain(target, key)
            makeProperty(adm, owner, key, desc, annotation, false)
        }
        Object.getOwnPropertyNames(annotations).forEach(make)
        Object.getOwnPropertySymbols(annotations).forEach(make) // TODO: check if available everywhere
    } finally {
        endBatch()
    }
    return target
}

// TODO: add tests
export function makeAutoObservable<T extends Object, AdditionalKeys extends PropertyKey = never>(
    target: T,
    excludes?: AnnotationsMap<T, AdditionalKeys>,
    options?: CreateObservableOptions
): T {
    const proto = Object.getPrototypeOf(target)
    const isPlain = proto == null || proto === Object.prototype
    invariant(
        isPlain || isPlainObject(proto),
        `'makeAutoObservable' can only be used for classes that don't have a superclass`
    )
    invariant(!isObservableObject(target), `TODO`)
    let annotations = { ...excludes }
    extractAnnotationsFromObject(target, annotations, options)
    if (!isPlain) {
        extractAnnotationsFromProto(proto, annotations)
    }
    makeObservable(target, annotations, options)
    return target
}

function extractAnnotationsFromObject(
    target,
    collector: AnnotationsMap<any, any>,
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

function extractAnnotationsFromProto(proto: any, collector: AnnotationsMap<any, any>) {
    // TODO: make a utility for this
    ;[...Object.getOwnPropertyNames(proto), ...Object.getOwnPropertySymbols(proto)].forEach(key => {
        if (key in collector) return
        const prop = getDescriptor(proto, key)!
        if (prop.get) {
            collector[key as any] = computed
        } else if (typeof prop.value === "function") {
            collector[key as any] = action.bound
        }
    })
}
