declare var global
export function getGlobal() {
    return typeof window !== "undefined" ? window : global
}

/**
 * Prints a deprecation message, but only one time.
 * Returns false if the deprecated message was already printed before
 */
const deprecatedMessages: string[] = []

export function deprecated(msg: string): boolean {
    if (deprecatedMessages.indexOf(msg) !== -1) return false
    deprecatedMessages.push(msg)
    console.error("[mobx] Deprecated: " + msg)
    return true
}

export function makeNonEnumerable(object: any, propNames: string[]) {
    for (let i = 0; i < propNames.length; i++) {
        addHiddenProp(object, propNames[i], object[propNames[i]])
    }
}

export function addHiddenProp(object: any, propName: string, value: any) {
    Object.defineProperty(object, propName, {
        enumerable: false,
        writable: true,
        configurable: true,
        value
    })
}

export function addHiddenFinalProp(object: any, propName: string, value: any) {
    Object.defineProperty(object, propName, {
        enumerable: false,
        writable: false,
        configurable: true,
        value
    })
}

export function isPropertyConfigurable(object: any, prop: string): boolean {
    const descriptor = Object.getOwnPropertyDescriptor(object, prop)
    return !descriptor || (descriptor.configurable !== false && descriptor.writable !== false)
}

export function assertPropertyConfigurable(object: any, prop: string) {
    invariant(
        isPropertyConfigurable(object, prop),
        `Cannot make property '${prop}' observable, it is not configurable and writable in the target object`
    )
}

export function getEnumerableKeys(obj) {
    const res: string[] = []
    for (let key in obj) res.push(key)
    return res
}

/**
 * Naive deepEqual. Doesn't check for prototype, non-enumerable or out-of-range properties on arrays.
 * If you have such a case, you probably should use this function but something fancier :).
 */
export function deepEqual(a, b) {
    if (a === null && b === null) return true
    if (a === undefined && b === undefined) return true
    if (areBothNaN(a, b)) return true
    if (typeof a !== "object") return a === b
    const aIsArray = isArrayLike(a)
    const aIsMap = isMapLike(a)
    if (aIsArray !== isArrayLike(b)) {
        return false
    } else if (aIsMap !== isMapLike(b)) {
        return false
    } else if (aIsArray) {
        if (a.length !== b.length) return false
        for (let i = a.length - 1; i >= 0; i--) if (!deepEqual(a[i], b[i])) return false
        return true
    } else if (aIsMap) {
        if (a.size !== b.size) return false
        let equals = true
        a.forEach((value, key) => {
            equals = equals && deepEqual(b.get(key), value)
        })
        return equals
    } else if (typeof a === "object" && typeof b === "object") {
        if (a === null || b === null) return false
        if (isMapLike(a) && isMapLike(b)) {
            if (a.size !== b.size) return false
            // Freaking inefficient.... Create PR if you run into this :) Much appreciated!
            return deepEqual(observable.shallowMap(a).entries(), observable.shallowMap(b).entries())
        }
        if (getEnumerableKeys(a).length !== getEnumerableKeys(b).length) return false
        for (let prop in a) {
            if (!(prop in b)) return false
            if (!deepEqual(a[prop], b[prop])) return false
        }
        return true
    }
    return false
}

/**
 * Returns whether the argument is an array, disregarding observability.
 */
export function isArrayLike(x: any): x is Array<any> | IObservableArray<any> {
    return Array.isArray(x) || isObservableArray(x)
}

export function isMapLike(x: any): boolean {
    return isES6Map(x) || isObservableMap(x)
}

export function isES6Map(thing): boolean {
    if (getGlobal().Map !== undefined && thing instanceof getGlobal().Map) return true
    return false
}

export function getMapLikeKeys<V>(map: ObservableMap<V> | IKeyValueMap<V> | any): string[] {
	let keys;
	if (isPlainObject(map)) keys = Object.keys(map)
	else if (Array.isArray(map)) keys = map.map(([key]) => key)
	else if (isMapLike(map)) keys = (Array as any).from(map.keys())
	else fail("Cannot get keys from " + map)
	return keys;
}

declare var Symbol

export function primitiveSymbol() {
    return (typeof Symbol === "function" && Symbol.toPrimitive) || "@@toPrimitive"
}

export function toPrimitive(value) {
    return value === null ? null : typeof value === "object" ? "" + value : value
}

import { IObservableArray, isObservableArray } from "../types/observablearray"
import { isObservableMap, ObservableMap, IKeyValueMap } from "../types/observablemap"
import { observable } from "../api/observable"
import { invariant, isPlainObject, areBothNaN } from "../../mobx-core/index";

