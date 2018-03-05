export interface IEnhancer<T> {
    (newValue: T, oldValue: T | undefined, name: string): T
}

export function deepEnhancer(v, _, name) {
    // it is an observable already, done
    if (isObservable(v)) return v

    // something that can be converted and mutated?
    if (Array.isArray(v)) return observable.array(v, { name })
    if (isPlainObject(v)) return observable.object(v, undefined, { name })
    if (isES6Map(v)) return observable.map(v, { name })

    return v
}

export function shallowEnhancer(v, _, name): any {
    if (v === undefined || v === null) return v
    if (isObservableObject(v) || isObservableArray(v) || isObservableMap(v)) return v
    if (Array.isArray(v)) return observable.array(v, { name, deep: false })
    if (isPlainObject(v)) return observable.object(v, undefined, { name, deep: false })
    if (isES6Map(v)) return observable.map(v, { name, deep: false })

    return fail(
        process.env.NODE_ENV !== "production" &&
            "The shallow modifier / decorator can only used in combination with arrays, objects and maps"
    )
}

export function referenceEnhancer(newValue?) {
    // never turn into an observable
    return newValue
}

export function deepStructEnhancer(v, oldValue, name): any {
    // don't confuse structurally compare enhancer with ref enhancer! The latter is probably
    // more suited for immutable objects
    if (deepEqual(v, oldValue)) return oldValue

    // it is an observable already, done
    if (isObservable(v)) return v

    // something that can be converted and mutated?
    if (Array.isArray(v)) return new ObservableArray(v, deepStructEnhancer, name)
    if (isES6Map(v)) return new ObservableMap(v, deepStructEnhancer, name)
    if (isPlainObject(v)) {
        const res = {}
        extendObservable(res, v, undefined, {
            name,
            defaultDecorator: observable.struct
        })
        return res
    }

    return v
}

export function refStructEnhancer(v, oldValue, name): any {
    if (deepEqual(v, oldValue)) return oldValue
    return v
}

import { observable } from "../api/observable"
import { isObservable } from "../api/isobservable"
import { extendObservable } from "../api/extendobservable"
import { fail, isPlainObject, isES6Map } from "../utils/utils"
import { isObservableObject } from "./observableobject"
import { isObservableArray, ObservableArray } from "./observablearray"
import { isObservableMap, ObservableMap } from "./observablemap"
import { deepEqual } from "../utils/eq"
