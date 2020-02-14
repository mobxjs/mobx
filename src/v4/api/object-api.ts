import {
    isObservableMap,
    ObservableMap,
    fail,
    IObservableArray,
    ObservableSet,
    isObservableObject,
    IIsObservableObject,
    isObservableSet,
    isObservableArray,
    startBatch,
    endBatch,
    defineObservableProperty,
    invariant,
    iteratorToArray,
    getAdministration,
    ObservableObjectAdministration
} from "../internal"

export function keys<K>(map: ObservableMap<K, any>): ReadonlyArray<K>
export function keys<T>(ar: IObservableArray<T>): ReadonlyArray<number>
export function keys<T>(set: ObservableSet<T>): ReadonlyArray<T>
export function keys<T extends Object>(obj: T): ReadonlyArray<string>
export function keys(obj: any): any {
    if (isObservableObject(obj)) {
        return ((obj as any) as IIsObservableObject).$mobx.getKeys()
    }
    if (isObservableMap(obj)) {
        return iteratorToArray(obj.keys())
    }
    if (isObservableSet(obj)) {
        return iteratorToArray(obj.keys())
    }
    if (isObservableArray(obj)) {
        return obj.map((_, index) => index)
    }
    return fail(
        process.env.NODE_ENV !== "production" &&
            "'keys()' can only be used on observable objects, arrays, sets and maps"
    )
}

export function values<K, T>(map: ObservableMap<K, T>): ReadonlyArray<T>
export function values<T>(set: ObservableSet<T>): ReadonlyArray<T>
export function values<T>(ar: IObservableArray<T>): ReadonlyArray<T>
export function values<T = any>(obj: T): ReadonlyArray<any>
export function values(obj: any): string[] {
    if (isObservableObject(obj)) {
        return keys(obj).map(key => obj[key])
    }
    if (isObservableMap(obj)) {
        return keys(obj).map(key => obj.get(key))
    }
    if (isObservableSet(obj)) {
        return iteratorToArray(obj.values())
    }
    if (isObservableArray(obj)) {
        return obj.slice()
    }
    return fail(
        process.env.NODE_ENV !== "production" &&
            "'values()' can only be used on observable objects, arrays, sets and maps"
    )
}

export function entries<K, T>(map: ObservableMap<K, T>): ReadonlyArray<[K, T]>
export function entries<T>(set: ObservableSet<T>): ReadonlyArray<[T, T]>
export function entries<T>(ar: IObservableArray<T>): ReadonlyArray<[number, T]>
export function entries<T = any>(obj: T): ReadonlyArray<[string, any]>
export function entries(obj: any): any {
    if (isObservableObject(obj)) {
        return keys(obj).map(key => [key, obj[key]])
    }
    if (isObservableMap(obj)) {
        return keys(obj).map(key => [key, obj.get(key)])
    }
    if (isObservableSet(obj)) {
        return iteratorToArray(obj.entries())
    }
    if (isObservableArray(obj)) {
        return obj.map((key, index) => [index, key])
    }
    return fail(
        process.env.NODE_ENV !== "production" &&
            "'entries()' can only be used on observable objects, arrays and maps"
    )
}

export function set<V>(obj: ObservableMap<string, V>, values: { [key: string]: V })
export function set<K, V>(obj: ObservableMap<K, V>, key: K, value: V)
export function set<T>(obj: ObservableSet<T>, value: T)
export function set<T>(obj: IObservableArray<T>, index: number, value: T)
export function set<T extends Object>(obj: T, values: { [key: string]: any })
export function set<T extends Object>(obj: T, key: string, value: any)
export function set(obj: any, key: any, value?: any): void {
    if (arguments.length === 2 && !isObservableSet(obj)) {
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
            adm.write(obj, key, value)
        } else {
            defineObservableProperty(obj, key, value, adm.defaultEnhancer)
        }
    } else if (isObservableMap(obj)) {
        obj.set(key, value)
    } else if (isObservableSet(obj)) {
        obj.add(key)
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
export function remove<T>(obj: ObservableSet<T>, key: T)
export function remove<T>(obj: IObservableArray<T>, index: number)
export function remove<T extends Object>(obj: T, key: string)
export function remove(obj: any, key: any): void {
    if (isObservableObject(obj)) {
        ;((obj as any) as IIsObservableObject).$mobx.remove(key)
    } else if (isObservableMap(obj)) {
        obj.delete(key)
    } else if (isObservableSet(obj)) {
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

export function has<K>(obj: ObservableMap<K, any>, key: K): boolean
export function has<T>(obj: ObservableSet<T>, key: T): boolean
export function has<T>(obj: IObservableArray<T>, index: number): boolean
export function has<T extends Object>(obj: T, key: string): boolean
export function has(obj: any, key: any): boolean {
    if (isObservableObject(obj)) {
        // return keys(obj).indexOf(key) >= 0
        const adm = getAdministration(obj) as ObservableObjectAdministration
        adm.getKeys() // make sure we get notified of key changes, but for performance, use the values map to look up existence
        return !!adm.values[key]
    } else if (isObservableMap(obj)) {
        return obj.has(key)
    } else if (isObservableSet(obj)) {
        return obj.has(key)
    } else if (isObservableArray(obj)) {
        return key >= 0 && key < obj.length
    } else {
        return fail(
            process.env.NODE_ENV !== "production" &&
                "'has()' can only be used on observable objects, arrays and maps"
        )
    }
}

export function get<K, V>(obj: ObservableMap<K, V>, key: K): V | undefined
export function get<T>(obj: IObservableArray<T>, index: number): T | undefined
export function get<T extends Object>(obj: T, key: string): any
export function get(obj: any, key: any): any {
    if (!has(obj, key)) return undefined
    if (isObservableObject(obj)) {
        return obj[key]
    } else if (isObservableMap(obj)) {
        return obj.get(key)
    } else if (isObservableArray(obj)) {
        return obj[key]
    } else {
        return fail(
            process.env.NODE_ENV !== "production" &&
                "'get()' can only be used on observable objects, arrays and maps"
        )
    }
}
