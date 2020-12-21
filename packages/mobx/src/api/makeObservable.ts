import {
    $mobx,
    asObservableObject,
    AnnotationsMap,
    endBatch,
    startBatch,
    CreateObservableOptions,
    ObservableObjectAdministration,
    collectStoredAnnotations,
    isPlainObject,
    isObservableObject,
    die,
    ownKeys,
    objectPrototype,
    inferredAnnotationsSymbol
} from "../internal"

// Hack based on https://github.com/Microsoft/TypeScript/issues/14829#issuecomment-322267089
// We need this, because otherwise, AdditionalKeys is going to be inferred to be any
// set of superfluous keys. But, we rather want to get a compile error unless AdditionalKeys is
// _explicity_ passed as generic argument
// Fixes: https://github.com/mobxjs/mobx/issues/2325#issuecomment-691070022
type NoInfer<T> = [T][T extends any ? 0 : never]

export function makeObservable<T extends object, AdditionalKeys extends PropertyKey = never>(
    target: T,
    annotations?: AnnotationsMap<T, NoInfer<AdditionalKeys>>,
    options?: CreateObservableOptions
): T {
    const adm: ObservableObjectAdministration = asObservableObject(target, options)[$mobx]
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

export function makeAutoObservable<T extends object, AdditionalKeys extends PropertyKey = never>(
    target: T,
    overrides?: AnnotationsMap<T, NoInfer<AdditionalKeys>>,
    options?: CreateObservableOptions
): T {
    if (__DEV__) {
        if (!isPlainObject(target) && !isPlainObject(Object.getPrototypeOf(target)))
            die(`'makeAutoObservable' can only be used for classes that don't have a superclass`)
        if (isObservableObject(target))
            die(`makeAutoObservable can only be used on objects not already made observable`)
    }

    const adm: ObservableObjectAdministration = asObservableObject(target, options)[$mobx]

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
                adm.make_(
                    key,
                    // must pass "undefined" for { key: undefined }
                    !overrides ? true : key in overrides ? overrides[key] : true
                )
            })
        }
    } finally {
        endBatch()
    }
    return target
}

/*
TODO check if faster
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
