import { IObservableArray, globalState, isObservableArray, isObservableMap } from "../internal"

export const OBFUSCATED_ERROR =
    "An invariant failed, however the error is obfuscated because this is a production build."

export const EMPTY_ARRAY = []
Object.freeze(EMPTY_ARRAY)

export const EMPTY_OBJECT = {}
Object.freeze(EMPTY_OBJECT)

export interface Lambda {
    (): void
    name?: string
}

export function getNextId() {
    return ++globalState.mobxGuid
}

export function fail(message: string | boolean): never {
    invariant(false, message)
    throw "X" // unreachable
}

export function invariant(check: false, message?: string | boolean): never
export function invariant(check: true, message?: string | boolean): void
export function invariant(check: any, message?: string | boolean): void
export function invariant(check: boolean, message?: string | boolean) {
    if (!check) throw new Error("[mobx] " + (message || OBFUSCATED_ERROR))
}

/**
 * Prints a deprecation message, but only one time.
 * Returns false if the deprecated message was already printed before
 */
const deprecatedMessages: string[] = []

export function deprecated(msg: string): boolean
export function deprecated(thing: string, replacement: string): boolean
export function deprecated(msg: string, thing?: string): boolean {
    if (process.env.NODE_ENV === "production") return false
    if (thing) {
        return deprecated(`'${msg}', use '${thing}' instead.`)
    }
    if (deprecatedMessages.indexOf(msg) !== -1) return false
    deprecatedMessages.push(msg)
    console.error("[mobx] Deprecated: " + msg)
    return true
}

/**
 * Makes sure that the provided function is invoked at most once.
 */
export function once(func: Lambda): Lambda {
    let invoked = false
    return function() {
        if (invoked) return
        invoked = true
        return (func as any).apply(this, arguments)
    }
}

export const noop = () => {}

export function unique<T>(list: T[]): T[] {
    const res: T[] = []
    list.forEach(item => {
        if (res.indexOf(item) === -1) res.push(item)
    })
    return res
}

export function isObject(value: any): boolean {
    return value !== null && typeof value === "object"
}

export function isPlainObject(value) {
    if (value === null || typeof value !== "object") return false
    const proto = Object.getPrototypeOf(value)
    return proto === Object.prototype || proto === null
}

export function convertToMap(dataStructure: any): Map<any, any> {
    if (isES6Map(dataStructure) || isObservableMap(dataStructure)) {
        return dataStructure
    } else if (Array.isArray(dataStructure)) {
        return new Map(dataStructure)
    } else if (isPlainObject(dataStructure)) {
        const map = new Map()
        for (const key in dataStructure) {
            map.set(key, dataStructure[key])
        }
        return map
    } else {
        return fail(`Cannot convert to map from '${dataStructure}'`)
    }
}

export function makeNonEnumerable(object: any, propNames: PropertyKey[]) {
    for (let i = 0; i < propNames.length; i++) {
        addHiddenProp(object, propNames[i], object[propNames[i]])
    }
}

export function addHiddenProp(object: any, propName: PropertyKey, value: any) {
    Object.defineProperty(object, propName, {
        enumerable: false,
        writable: true,
        configurable: true,
        value
    })
}

export function addHiddenFinalProp(object: any, propName: PropertyKey, value: any) {
    Object.defineProperty(object, propName, {
        enumerable: false,
        writable: false,
        configurable: true,
        value
    })
}

export function isPropertyConfigurable(object: any, prop: PropertyKey): boolean {
    const descriptor = Object.getOwnPropertyDescriptor(object, prop)
    return !descriptor || (descriptor.configurable !== false && descriptor.writable !== false)
}

export function assertPropertyConfigurable(object: any, prop: PropertyKey) {
    if (process.env.NODE_ENV !== "production" && !isPropertyConfigurable(object, prop))
        fail(
            `Cannot make property '${prop.toString()}' observable, it is not configurable and writable in the target object`
        )
}

export function createInstanceofPredicate<T>(
    name: string,
    clazz: new (...args: any[]) => T
): (x: any) => x is T {
    const propName = "isMobX" + name
    clazz.prototype[propName] = true
    return function(x) {
        return isObject(x) && x[propName] === true
    } as any
}

/**
 * Returns whether the argument is an array, disregarding observability.
 */
export function isArrayLike(x: any): x is Array<any> | IObservableArray<any> {
    return Array.isArray(x) || isObservableArray(x)
}

export function isES6Map(thing): boolean {
    return thing instanceof Map
}

export function isES6Set(thing): thing is Set<any> {
    return thing instanceof Set
}

/**
 * Returns the following: own keys, prototype keys & own symbol keys, if they are enumerable.
 */
export function getPlainObjectKeys(object) {
    const enumerables = new Set<PropertyKey>()
    for (let key in object) enumerables.add(key) // *all* enumerables
    Object.getOwnPropertySymbols(object).forEach(k => {
        if (Object.getOwnPropertyDescriptor(object, k)!.enumerable) enumerables.add(k)
    }) // *own* symbols
    // Note: this implementation is missing enumerable, inherited, symbolic property names! That would however pretty expensive to add,
    // as there is no efficient iterator that returns *all* properties
    return Array.from(enumerables)
}

export function stringifyKey(key: any): string {
    if (key && key.toString) return key.toString()
    else return new String(key).toString()
}

export function toPrimitive(value) {
    return value === null ? null : typeof value === "object" ? "" + value : value
}
