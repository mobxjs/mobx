import { isObservableMap, ObservableMap } from "../types/observablemap"
import {
    isObservableObject,
    IIsObservableObject,
    defineObservableProperty
} from "../types/observableobject"
import { isObservableArray, IObservableArray } from "../types/observablearray"
import { fail, invariant } from "../utils/utils"
import { deepEnhancer } from "../types/modifiers"
import { startBatch, endBatch } from "../core/observable"

export function keys<K>(map: ObservableMap<K, any>): ReadonlyArray<K>
export function keys<T extends Object>(obj: T): ReadonlyArray<string>
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

export function values<K, T>(map: ObservableMap<K, T>): ReadonlyArray<T>
export function values<T>(ar: IObservableArray<T>): ReadonlyArray<T>
export function values<T = any>(obj: T): ReadonlyArray<any>
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

export function set<V>(obj: ObservableMap<string, V>, values: { [key: string]: V })
export function set<K, V>(obj: ObservableMap<K, V>, key: K, value: V)
export function set<T>(obj: IObservableArray<T>, index: number, value: T)
export function set<T extends Object>(obj: T, values: { [key: string]: any })
export function set<T extends Object>(obj: T, key: string, value: any)
export function set(obj: any, key: any, value?: any): void {
    if (arguments.length === 2) {
        startBatch()
        const values = key
        try {
            for (let key in values) set(obj, key, values[key])
        } finally {
            endBatch()
        }
        return
    }
    if (isObservableObject(obj)) {
        const adm = ((obj as any) as IIsObservableObject).$mobx
        const existingObservable = adm.values[key]
        if (existingObservable) {
            existingObservable.set(value)
        } else {
            defineObservableProperty(obj, key, value, adm.defaultEnhancer)
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

export function remove<K, V>(obj: ObservableMap<K, V>, key: K)
export function remove<T>(obj: IObservableArray<T>, index: number)
export function remove<T extends Object>(obj: T, key: string)
export function remove(obj: any, key: any): void {
    if (isObservableObject(obj)) {
        ;((obj as any) as IIsObservableObject).$mobx.remove(key)
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
