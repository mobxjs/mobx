import {
    $mobx,
    asObservableObject,
    AnnotationsMap,
    CreateObservableOptions,
    ObservableObjectAdministration,
    isPlainObject,
    isObservableObject,
    die,
    ownKeys,
    extendObservable,
    addHiddenProp,
    initObservable,
    Annotation,
    assertAnnotable,
    getDescriptor,
    MakeResult,
    objectPrototype,
    recordAnnotationApplied
} from "../internal"

export function makeObservable<T extends object, AdditionalKeys extends PropertyKey = never>(
    target: T,
    annotations: AnnotationsMap<T, NoInfer<AdditionalKeys>>,
    options?: CreateObservableOptions
): T {
    initObservable(() => {
        const adm: ObservableObjectAdministration = asObservableObject(target, options)[$mobx]

        // Annotate
        ownKeys(annotations).forEach(key => make_(adm, key, annotations[key]))
    })
    return target
}

// proto[keysSymbol] = new Set<PropertyKey>()
const keysSymbol = Symbol("mobx-keys")

export function makeAutoObservable<T extends object, AdditionalKeys extends PropertyKey = never>(
    target: T,
    overrides?: AnnotationsMap<T, NoInfer<AdditionalKeys>>,
    options?: CreateObservableOptions
): T {
    if (__DEV__) {
        if (!isPlainObject(target) && !isPlainObject(Object.getPrototypeOf(target))) {
            die(`'makeAutoObservable' can only be used for classes that don't have a superclass`)
        }
        if (isObservableObject(target)) {
            die(`makeAutoObservable can only be used on objects not already made observable`)
        }
    }

    // Optimization: avoid visiting protos
    // Assumes that annotation.make_/.extend_ works the same for plain objects
    if (isPlainObject(target)) {
        return extendObservable(target, target, overrides, options)
    }

    initObservable(() => {
        const adm: ObservableObjectAdministration = asObservableObject(target, options)[$mobx]

        // Optimization: cache keys on proto
        // Assumes makeAutoObservable can be called only once per object and can't be used in subclass
        if (!target[keysSymbol]) {
            const proto = Object.getPrototypeOf(target)
            const keys = new Set([...ownKeys(target), ...ownKeys(proto)])
            keys.delete("constructor")
            keys.delete($mobx)
            addHiddenProp(proto, keysSymbol, keys)
        }

        target[keysSymbol].forEach(key =>
            make_(
                adm,
                key,
                // must pass "undefined" for { key: undefined }
                !overrides ? true : key in overrides ? overrides[key] : true
            )
        )
    })

    return target
}

function make_(
    adm: ObservableObjectAdministration,
    key: PropertyKey,
    annotation: Annotation | boolean
) {
    if (annotation === true) {
        annotation = adm.defaultAnnotation_
    }
    if (annotation === false) {
        return
    }
    assertAnnotable(adm, annotation, key)
    if (!(key in adm.target_)) {
        die(1, annotation.annotationType_, `${adm.name_}.${key.toString()}`)
    }
    let source = adm.target_
    while (source && source !== objectPrototype) {
        const descriptor = getDescriptor(source, key)
        if (descriptor) {
            const outcome = annotation.make_(adm, key, descriptor, source)
            if (outcome === MakeResult.Cancel) {
                return
            }
            if (outcome === MakeResult.Break) {
                break
            }
        }
        source = Object.getPrototypeOf(source)
    }
    recordAnnotationApplied(adm, annotation, key)
}
