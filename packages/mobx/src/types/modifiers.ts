import {
    deepEqual,
    isES6Map,
    isES6Set,
    isObservable,
    isObservableArray,
    isObservableMap,
    isObservableSet,
    isObservableObject,
    isPlainObject,
    observable,
    die,
    isAction,
    autoAction,
    flow,
    isFlow,
    isGenerator
} from "../internal"

export interface IEnhancer<T> {
    (newValue: T, oldValue: T | undefined, name: string): T
}

export function deepEnhancer<T>(v: T, _: T | undefined, name: string): T {
    // it is an observable already, done
    if (isObservable(v)) {
        return v
    }

    // something that can be converted and mutated?
    if (Array.isArray(v)) {
        return observable.array(v, { name }) as unknown as T
    }
    if (isPlainObject(v)) {
        return observable.object(v as unknown as object, undefined, { name }) as unknown as T
    }
    if (isES6Map(v)) {
        return observable.map(v, { name }) as unknown as T
    }
    if (isES6Set(v)) {
        return observable.set(v, { name }) as unknown as T
    }
    if (typeof v === "function" && !isAction(v) && !isFlow(v)) {
        if (isGenerator(v)) {
            return flow(v) as unknown as T
        } else {
            return autoAction(name, v)
        }
    }
    return v
}

export function shallowEnhancer<T>(v: T, _: T, name: string): T {
    if (v === undefined || v === null) {
        return v
    }
    if (isObservableObject(v) || isObservableArray(v) || isObservableMap(v) || isObservableSet(v)) {
        return v
    }
    if (Array.isArray(v)) {
        return observable.array(v, { name, deep: false }) as unknown as T
    }
    if (isPlainObject(v)) {
        return observable.object(v as unknown as object, undefined, {
            name,
            deep: false
        }) as unknown as T
    }
    if (isES6Map(v)) {
        return observable.map(v, { name, deep: false }) as unknown as T
    }
    if (isES6Set(v)) {
        return observable.set(v, { name, deep: false }) as unknown as T
    }

    if (__DEV__) {
        die(
            "The shallow modifier / decorator can only used in combination with arrays, objects, maps and sets"
        )
    }

    return v
}

export function referenceEnhancer<T>(newValue: T): T {
    // never turn into an observable
    return newValue
}

export function refStructEnhancer<T>(v: T, oldValue: T): T {
    if (__DEV__ && isObservable(v)) {
        die(`observable.struct should not be used with observable values`)
    }
    if (deepEqual(v, oldValue)) {
        return oldValue
    }
    return v
}
