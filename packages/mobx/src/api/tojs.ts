import {
    $mobx,
    isObservable,
    isObservableArray,
    isObservableValue,
    isObservableMap,
    isObservableSet,
    isComputedValue,
    die,
    apiOwnKeys,
    objectPrototype,
    hasProp,
    ComputedValue,
    ObservableObjectAdministration
} from "../internal"

function cache<K, V>(map: Map<any, any>, key: K, value: V): V {
    map.set(key, value)
    return value
}

function toJSHelper(source, __alreadySeen: Map<any, any>) {
    if (
        source == null ||
        typeof source !== "object" ||
        source instanceof Date ||
        !isObservable(source)
    ) {
        return source
    }

    if (isObservableValue(source) || isComputedValue(source)) {
        return toJSHelper(source.get(), __alreadySeen)
    }
    if (__alreadySeen.has(source)) {
        return __alreadySeen.get(source)
    }
    if (isObservableArray(source)) {
        const res = cache(__alreadySeen, source, new Array(source.length))
        source.forEach((value, idx) => {
            res[idx] = toJSHelper(value, __alreadySeen)
        })
        return res
    }
    if (isObservableSet(source)) {
        const res = cache(__alreadySeen, source, new Set())
        source.forEach(value => {
            res.add(toJSHelper(value, __alreadySeen))
        })
        return res
    }
    if (isObservableMap(source)) {
        const res = cache(__alreadySeen, source, new Map())
        source.forEach((value, key) => {
            res.set(key, toJSHelper(value, __alreadySeen))
        })
        return res
    } else {
        // must be observable object
        const res = cache(__alreadySeen, source, {})
        apiOwnKeys(source).forEach((key: any) => {
            if (objectPrototype.propertyIsEnumerable.call(source, key)) {
                res[key] = toJSHelper(source[key], __alreadySeen)
            }
        })
        copyObservableAccessors(source, res, __alreadySeen)
        return res
    }
}

/**
 * Copies `@observable accessor` fields, which are defined on the prototype, so they are neither own nor enumerable.
 * Their values live in the administration: in `values_` once read, and in `lazyObservableKeys_` until then.
 * Computed values and private accessors are left out.
 * Kept here instead of on the administration, so it is tree shaken away when `toJS` is not used.
 */
function copyObservableAccessors(source, res, __alreadySeen: Map<any, any>) {
    const adm: ObservableObjectAdministration = source[$mobx]
    if (adm.lazyObservableKeys_ === undefined) {
        // No `@observable accessor` field ever registered (it becomes `null`, not `undefined`, once all were read)
        return
    }
    const target = adm.target_
    // Own keys were already copied by `toJSHelper`, and `in` leaves out private `#field` keys
    for (const [key, value] of adm.values_) {
        if (!hasProp(target, key) && !(value instanceof ComputedValue) && key in target) {
            res[key] = toJSHelper(source[key], __alreadySeen)
        }
    }
    // Fields that were never read have no entry in `values_` yet, reading them creates it
    if (adm.lazyObservableKeys_) {
        for (const key of adm.lazyObservableKeys_.keys()) {
            if (!adm.values_.has(key) && !hasProp(target, key) && key in target) {
                res[key] = toJSHelper(source[key], __alreadySeen)
            }
        }
    }
}

/**
 * Recursively converts an observable to it's non-observable native counterpart.
 * It does NOT recurse into non-observables, these are left as they are, even if they contain observables.
 * Computed and other non-enumerable properties are completely ignored, except for `@observable accessor` fields.
 * Complex scenarios require custom solution, eg implementing `toJSON` or using `serializr` lib.
 */
export function toJS<T>(source: T, options?: any): T {
    if (__DEV__ && options) {
        die("toJS no longer supports options")
    }
    return toJSHelper(source, new Map())
}
