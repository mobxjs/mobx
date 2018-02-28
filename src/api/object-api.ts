import { isObservableMap, ObservableMap } from "../types/observablemap"
import {
    isObservableObject,
    IObservableObject,
    IIsObservableObject,
    defineObservableProperty
} from "../types/observableobject"
import { isObservableArray, IObservableArray } from "../types/observablearray"
import { fail, invariant } from "../utils/utils"
import { deepEnhancer, isModifierDescriptor } from "../types/modifiers"
import { startBatch, endBatch } from "../core/observable"

export function keys(obj: IObservableObject): ReadonlyArray<string>
export function keys<K>(map: ObservableMap<K, any>): ReadonlyArray<K>
export function keys(obj: any): any {
    if (isObservableObject(obj)) {
        return ((obj as any) as IIsObservableObject).$mobx.getKeys()
    }
    if (isObservableMap(obj)) {
        return (obj as any)._keys.slice()
    }
    return fail(
        process.env.NODE_ENV !== "production" &&
            "'keys()' can only be used on observable objects and maps"
    )
}

export function values<T = any>(obj: IObservableObject): ReadonlyArray<any>
export function values<K, T>(map: ObservableMap<K, T>): ReadonlyArray<T>
export function values<T>(ar: IObservableArray<T>): ReadonlyArray<T>
export function values(obj: any): string[] {
    if (isObservableObject(obj)) {
        return keys(obj).map(key => obj[key])
    }
    if (isObservableMap(obj)) {
        return keys(obj).map(key => obj.get(key))
    }
    if (isObservableArray(obj)) {
        return obj.slice()
    }
    return fail(
        process.env.NODE_ENV !== "production" &&
            "'values()' can only be used on observable objects, arrays and maps"
    )
}

export function set(obj: IObservableObject, key: string, value: any)
export function set<K, V>(obj: ObservableMap<K, V>, key: K, value: V)
export function set<T>(obj: IObservableArray<T>, index: number, value: T)
export function set(obj: any, key: any, value: any): void {
    if (isObservableObject(obj)) {
        const adm = ((obj as any) as IIsObservableObject).$mobx
        const existingObservable = adm.values[key]
        if (existingObservable) {
            existingObservable.set(value)
        } else if (isModifierDescriptor(value)) {
            defineObservableProperty(adm, key, value.initialValue, value.enhancer)
        } else {
            defineObservableProperty(adm, key, value, deepEnhancer)
        }
    } else if (isObservableMap(obj)) {
        obj.set(key, value)
    } else if (isObservableArray(obj)) {
        if (typeof key !== "number") key = parseInt(key, 10)
        invariant(key >= 0, `Not a valid index: '${key}'`)
        startBatch()
        if (key >= obj.length) obj.length = key + 1
        obj[key] = value
        endBatch()
    } else {
        return fail(
            process.env.NODE_ENV !== "production" &&
                "'set()' can only be used on observable objects, arrays and maps"
        )
    }
}

export function remove(obj: IObservableObject, key: string)
export function remove<K, V>(obj: ObservableMap<K, V>, key: K)
export function remove<T>(obj: IObservableArray<T>, index: number)
export function remove(obj: any, key: any): void {
    if (isObservableObject(obj)) {
        const adm = ((obj as any) as IIsObservableObject).$mobx
        if (!adm.values[key]) return
        if (adm.keys) {
            const keyIndex = adm.keys.indexOf(key)
            if (keyIndex !== -1) adm.keys.splice(keyIndex, 1)
        }
        delete adm.values[key]
        delete adm.target[key]
    } else if (isObservableMap(obj)) {
        obj.delete(key)
    } else if (isObservableArray(obj)) {
        if (typeof key !== "number") key = parseInt(key, 10)
        invariant(key >= 0, `Not a valid index: '${key}'`)
        obj.splice(key, 1)
    } else {
        return fail(
            process.env.NODE_ENV !== "production" &&
                "'remove()' can only be used on observable objects, arrays and maps"
        )
    }
}
