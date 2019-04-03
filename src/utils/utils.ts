import {
    ObservableMap,
    globalState,
    IObservableArray,
    isObservableArray,
    IKeyValueMap,
    isObservableMap
} from "../internal"

declare const Symbol: any

export const OBFUSCATED_ERROR =
    "An invariant failed, however the error is obfuscated because this is an production build."

export const EMPTY_ARRAY = []
Object.freeze(EMPTY_ARRAY)

export const EMPTY_OBJECT = {}
Object.freeze(EMPTY_OBJECT)

declare const window: any

export function getGlobal() {
    return typeof window !== "undefined" ? window : global
}

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

export function invariant(check: false, message: string | boolean): never
export function invariant(check: true, message: string | boolean): void
export function invariant(check: any, message: string | boolean): void
export function invariant(check: boolean, message: string | boolean) {
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

export function makeNonEnumerable(object: any, propNames: string[]) {
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

export function addHiddenFinalProp(object: any, propName: string, value: any) {
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
            `Cannot make property '${stringifyKey(
                prop
            )}' observable, it is not configurable and writable in the target object`
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

export function areBothNaN(a: any, b: any): boolean {
    return typeof a === "number" && typeof b === "number" && isNaN(a) && isNaN(b)
}

/**
 * Returns whether the argument is an array, disregarding observability.
 */
export function isArrayLike(x: any): x is Array<any> | IObservableArray<any> {
    return Array.isArray(x) || isObservableArray(x)
}

export function isES6Map(thing): boolean {
    if (getGlobal().Map !== undefined && thing instanceof getGlobal().Map) return true
    return false
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

export function getMapLikeKeys<K, V>(map: ObservableMap<K, V>): ReadonlyArray<K>
export function getMapLikeKeys<V>(map: IKeyValueMap<V> | any): ReadonlyArray<string>
export function getMapLikeKeys(map: any): any {
    if (isPlainObject(map)) return Object.keys(map)
    if (Array.isArray(map)) return map.map(([key]) => key)
    if (isES6Map(map) || isObservableMap(map)) return iteratorToArray(map.keys())
    return fail(`Cannot get keys from '${map}'`)
}

// use Array.from in Mobx 5
export function iteratorToArray<T>(it: Iterator<T>): Array<T> {
    const res: T[] = []
    while (true) {
        const r: any = it.next()
        if (r.done) break
        res.push(r.value)
    }
    return res
}

export function primitiveSymbol() {
    // es-disable-next-line
    return (typeof Symbol === "function" && Symbol.toPrimitive) || "@@toPrimitive"
}

export function toPrimitive(value) {
    return value === null ? null : typeof value === "object" ? "" + value : value
}
