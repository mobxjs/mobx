import {
    keys,
    isObservable,
    isObservableArray,
    isObservableValue,
    isObservableMap,
    isObservableSet,
    getPlainObjectKeys
} from "../internal"
import { die } from "../errors"

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
    if (!isObservable(source)) return source

    if (typeof source !== "object") return source

    // Directly return null if source is null
    if (source === null) return null

    // Directly return the Date object itself if contained in the observable
    if (source instanceof Date) return source

    if (isObservableValue(source)) return toJSHelper(source.get(), options!, __alreadySeen)

    // make sure we track the keys of the object
    if (isObservable(source)) keys(source)

    const detectCycles = options.detectCycles === true

    if (detectCycles && source !== null && __alreadySeen.has(source)) {
        return __alreadySeen.get(source)
    }
    // TODO: remove second cond
    if (isObservableArray(source) || Array.isArray(source)) {
        const res = cache(__alreadySeen, source, [] as any, options)
        const toAdd = source.map(value => toJSHelper(value, options!, __alreadySeen))
        res.length = toAdd.length
        for (let i = 0, l = toAdd.length; i < l; i++) res[i] = toAdd[i]
        return res
    }
    // TODO: remove second cond
    if (isObservableSet(source) || Object.getPrototypeOf(source) === Set.prototype) {
        if (options.exportMapsAsObjects === false) {
            const res = cache(__alreadySeen, source, new Set(), options)
            source.forEach(value => {
                res.add(toJSHelper(value, options!, __alreadySeen))
            })
            return res
        } else {
            const res = cache(__alreadySeen, source, [] as any[], options)
            source.forEach(value => {
                res.push(toJSHelper(value, options!, __alreadySeen))
            })
            return res
        }
    }
    // TODO: reuse Object.getPrototypeOf? alsoe remove second cond
    if (isObservableMap(source) || Object.getPrototypeOf(source) === Map.prototype) {
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
export function toJS(source, options?: ToJSOptions) {
    // backward compatibility

    if (__DEV__ && options && (options as any).recurseEverything)
        die("The recurseEverything option is no longer supported")
    if (typeof options === "boolean") options = { detectCycles: options }
    if (!options) options = defaultOptions
    options.detectCycles = !!options.detectCycles

    let __alreadySeen
    if (options.detectCycles) __alreadySeen = new Map()

    return toJSHelper(source, options, __alreadySeen)
}
