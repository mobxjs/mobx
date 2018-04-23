import { isObservableArray } from "../types/observablearray"
import { isObservableObject } from "../types/observableobject"
import { isObservableMap } from "../types/observablemap"
import { isObservableValue } from "../types/observablevalue"
import { isObservable } from "./isobservable"
import { keys } from "./object-api"

export type ToJSOptions = {
    detectCycles?: boolean
    exportMapsAsObjects?: boolean
    objectKeysFn?: (object) => string[]
}

const defaultOptions: ToJSOptions = {
    detectCycles: true,
    exportMapsAsObjects: true
}

/**
 * Basically, a deep clone, so that no reactive property will exist anymore.
 */
export function toJS<T>(source: T, options?: ToJSOptions): T
export function toJS(source: any, options?: ToJSOptions): any
export function toJS(source, options: ToJSOptions, __alreadySeen: [any, any][]) // internal overload
export function toJS(source, options?: ToJSOptions, __alreadySeen: [any, any][] = []) {
    // backward compatibility
    if (typeof options === "boolean") options = { detectCycles: options }

    if (!options) options = defaultOptions
    const detectCycles = options.detectCycles === true
    // optimization: using ES6 map would be more efficient!
    // optimization: lift this function outside toJS, this makes recursion expensive
    function cache(value) {
        if (detectCycles) __alreadySeen.push([source, value])
        return value
    }
    if (isObservable(source)) {
        if (detectCycles && __alreadySeen === null) __alreadySeen = []
        if (detectCycles && source !== null && typeof source === "object") {
            for (let i = 0, l = __alreadySeen.length; i < l; i++)
                if (__alreadySeen[i][0] === source) return __alreadySeen[i][1]
        }

        if (isObservableArray(source)) {
            const res = cache([])
            const toAdd = source.map(value => toJS(value, options!, __alreadySeen))
            res.length = toAdd.length
            for (let i = 0, l = toAdd.length; i < l; i++) res[i] = toAdd[i]
            return res
        }
        if (isObservableObject(source)) {
            const res = cache({})
            keys(source) // make sure we track the keys of the object

            const objectKeysFn =
                typeof options.objectKeysFn === "function" ? options.objectKeysFn : Object.keys
            const sourceKeys = objectKeysFn(source)
            for (let i = 0, len = sourceKeys.length, key; i < len; ++i) {
                key = sourceKeys[i]
                res[key] = toJS(source[key], options!, __alreadySeen)
            }
            return res
        }
        if (isObservableMap(source)) {
            if (options.exportMapsAsObjects === false) {
                const res = cache(new Map())
                source.forEach((value, key) => {
                    res.set(key, toJS(value, options!, __alreadySeen))
                })
                return res
            } else {
                const res = cache({})
                source.forEach((value, key) => {
                    res[key] = toJS(value, options!, __alreadySeen)
                })
                return res
            }
        }
        if (isObservableValue(source)) return toJS(source.get(), options!, __alreadySeen)
    }
    return source
}
