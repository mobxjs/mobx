import {
    CreateObservableOptions,
    isObservableMap,
    AnnotationsMap,
    makeProperty,
    startBatch,
    endBatch,
    asObservableObject,
    isPlainObject,
    asCreateObservableOptions,
    getEnhancerFromOption,
    isObservable,
    getPlainObjectKeys,
    die,
    getOwnPropertyDescriptors
} from "../internal"

export function extendObservable<A extends Object, B extends Object>(
    target: A,
    properties: B,
    annotations?: AnnotationsMap<B, never>,
    options?: CreateObservableOptions
): A & B {
    if (__DEV__) {
        if (arguments.length > 4) die("'extendObservable' expected 2-4 arguments")
        if (typeof target !== "object")
            die("'extendObservable' expects an object as first argument")
        if (isObservableMap(target))
            die("'extendObservable' should not be used on maps, use map.merge instead")
        if (!isPlainObject(properties))
            die(`'extendObservabe' only accepts plain objects as second argument`)
        if (isObservable(properties) || isObservable(annotations))
            die(`Extending an object with another observable (object) is not supported`)
    }
    const o = asCreateObservableOptions(options)
    const adm = asObservableObject(target, o.name, getEnhancerFromOption(o))
    startBatch()
    try {
        const descs = getOwnPropertyDescriptors(properties)
        getPlainObjectKeys(descs).forEach(key => {
            makeProperty(
                adm,
                target,
                key,
                descs[key as any],
                !annotations ? true : key in annotations ? annotations[key] : true,
                true,
                !!options?.autoBind
            )
        })
    } finally {
        endBatch()
    }
    return target as any
}
