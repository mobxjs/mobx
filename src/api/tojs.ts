import {
    isObservable,
    isObservableArray,
    isObservableMap,
    isObservableObject,
    isObservableValue,
    keys
} from "../internal"

export type ToJSOptions = {
    detectCycles?: boolean
    exportMapsAsObjects?: boolean
}

const defaultOptions: ToJSOptions = {
    detectCycles: true,
    exportMapsAsObjects: true
}

function cache<K, V>(map: Map<any, any>, key: K, value: V, options: ToJSOptions): V {
    if (options.detectCycles) map.set(key, value)
    return value
}

function toJSHelper(source, options: ToJSOptions, __alreadySeen: Map<any, any>) {
    if (!isObservable(source)) return source

    const detectCycles = options.detectCycles === true

    if (
        detectCycles &&
        source !== null &&
        typeof source === "object" &&
        __alreadySeen.has(source)
    ) {
        return __alreadySeen.get(source)
    }

    if (isObservableArray(source)) {
        const res = cache(__alreadySeen, source, [] as any, options)
        const toAdd = source.map(value => toJSHelper(value, options!, __alreadySeen))
        res.length = toAdd.length
        for (let i = 0, l = toAdd.length; i < l; i++) res[i] = toAdd[i]
        return res
    }

    if (isObservableObject(source)) {
        const res = cache(__alreadySeen, source, {}, options)
        keys(source) // make sure we track the keys of the object
        for (let key in source) {
            res[key] = toJSHelper(source[key], options!, __alreadySeen)
        }
        return res
    }

    if (isObservableMap(source)) {
        if (options.exportMapsAsObjects === false) {
            const res = cache(__alreadySeen, source, new Map(), options)
            source.forEach((value, key) => {
                res.set(key, toJSHelper(value, options!, __alreadySeen))
            })
            return res
        } else {
            const res = cache(__alreadySeen, source, {}, options)
            source.forEach((value, key) => {
                res[key] = toJSHelper(value, options!, __alreadySeen)
            })
            return res
        }
    }

    if (isObservableValue(source)) return toJSHelper(source.get(), options!, __alreadySeen)

    return source
}

/**
 * Basically, a deep clone, so that no reactive property will exist anymore.
 */
export function toJS<T>(source: T, options?: ToJSOptions): T
export function toJS(source: any, options?: ToJSOptions): any
export function toJS(source, options: ToJSOptions) // internal overload
export function toJS(source, options?: ToJSOptions) {
    if (!isObservable(source)) return source

    // backward compatibility
    if (typeof options === "boolean") options = { detectCycles: options }
    if (!options) options = defaultOptions
    const detectCycles = options.detectCycles === true

    let __alreadySeen
    if (detectCycles) __alreadySeen = new Map()

    return toJSHelper(source, options, __alreadySeen)
}
