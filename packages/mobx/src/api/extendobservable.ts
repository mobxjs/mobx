import {
    CreateObservableOptions,
    isObservableMap,
    AnnotationsMap,
    startBatch,
    endBatch,
    asObservableObject,
    isPlainObject,
    ObservableObjectAdministration,
    isObservable,
    die,
    getOwnPropertyDescriptors,
    $mobx,
    ownKeys
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
    // Pull descriptors first, so we don't have to deal with props added by administration ($mobx)
    const descriptors = getOwnPropertyDescriptors(properties)

    const adm: ObservableObjectAdministration = asObservableObject(target, options)[$mobx]
    startBatch()
    try {
        ownKeys(descriptors).forEach(key => {
            adm.extend_(
                key,
                descriptors[key as any],
                // must pass "undefined" for { key: undefined }
                !annotations ? true : key in annotations ? annotations[key] : true
            )
        })
    } finally {
        endBatch()
    }
    return target as any
}
