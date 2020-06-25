import {
    keys,
    isObservable,
    isObservableArray,
    isObservableValue,
    isObservableMap,
    isObservableSet,
    getPlainObjectKeys,
    die
} from "../internal"

export type ToJSOptions = {
    detectCycles?: boolean
    exportMapsAsObjects?: boolean
}

// TODO: kill all optoins?
const defaultOptions: ToJSOptions = {
    detectCycles: true,
    exportMapsAsObjects: true // TODO: kill this option and make default false
}

function cache<K, V>(map: Map<any, any>, key: K, value: V, options: ToJSOptions): V {
    if (options.detectCycles) map.set(key, value)
    return value
}

function toJSHelper(source, options: ToJSOptions, __alreadySeen: Map<any, any>) {
    if (
        source == null ||
        typeof source !== "object" ||
        source instanceof Date ||
        !isObservable(source)
    )
        return source

    if (isObservableValue(source)) return toJSHelper(source.get(), options!, __alreadySeen)

    // make sure we track the keys of the object
    if (isObservable(source)) keys(source)

    const detectCycles = options.detectCycles === true

    if (detectCycles && __alreadySeen.has(source)) {
        return __alreadySeen.get(source)
    }
    if (isObservableArray(source)) {
        const res = cache(__alreadySeen, source, new Array(source.length), options)
        source.forEach((value, idx) => {
            res[idx] = toJSHelper(value, options!, __alreadySeen)
        })
        return res
    }
    if (isObservableSet(source)) {
        if (options.exportMapsAsObjects === false) {
            const res = cache(__alreadySeen, source, new Set(), options)
            source.forEach(value => {
                res.add(toJSHelper(value, options!, __alreadySeen))
            })
            return res
        } else {
            // TODO: remove else branch
            const res = cache(__alreadySeen, source, [] as any[], options)
            source.forEach(value => {
                res.push(toJSHelper(value, options!, __alreadySeen))
            })
            return res
        }
    }
    if (isObservableMap(source)) {
        if (options.exportMapsAsObjects === false) {
            const res = cache(__alreadySeen, source, new Map(), options)
            source.forEach((value, key) => {
                res.set(key, toJSHelper(value, options!, __alreadySeen))
            })
            return res
        } else {
            // TODO: remove else branch
            const res = cache(__alreadySeen, source, {}, options)
            source.forEach((value, key) => {
                res[key] = toJSHelper(value, options!, __alreadySeen)
            })
            return res
        }
    }

    // Fallback to the situation that source is an ObservableObject or a plain object
    const res = cache(__alreadySeen, source, {}, options)
    getPlainObjectKeys(source).forEach((key: any) => {
        res[key] = toJSHelper(source[key], options!, __alreadySeen)
    })

    return res
}

/**
 * Basically, a deep clone, so that no reactive property will exist anymore.
 */
export function toJS<T>(source: T, options?: ToJSOptions): T
export function toJS(source: any, options?: ToJSOptions): any
export function toJS(source, options: ToJSOptions) // internal overload
export function toJS(source, options: ToJSOptions = defaultOptions) {
    // backward compatibility

    if (__DEV__ && options && (options as any).recurseEverything)
        die("The recurseEverything option is no longer supported")
    if (__DEV__ && typeof options === "boolean")
        die("passing a boolean as second argument to toJS is no longer supported")
    options.detectCycles = !!options.detectCycles

    let __alreadySeen
    if (options.detectCycles) __alreadySeen = new Map()

    return toJSHelper(source, options, __alreadySeen)
}
