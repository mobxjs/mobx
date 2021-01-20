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
    getPlainObjectKeys,
    die,
    getOwnPropertyDescriptors,
    $mobx
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
    const adm: ObservableObjectAdministration = asObservableObject(target, options)[$mobx]
    startBatch()
    try {
        const descriptors = getOwnPropertyDescriptors(properties)
        // TODO@major use `ownKeys` - better perf + aligned with makeObservable
        // Once done, change make[Auto]Observable(o) so it delegates to extendObservable(o, o)
        // when "o" is plain object (better perf)
        getPlainObjectKeys(descriptors).forEach(key =>
            adm.extend_(
                key,
                descriptors[key as any],
                // must pass "undefined" for { key: undefined }
                !annotations ? true : key in annotations ? annotations[key] : true
            )
        )
    } finally {
        endBatch()
    }
    return target as any
}
