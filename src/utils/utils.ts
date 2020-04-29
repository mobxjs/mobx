import { IObservableArray, globalState, isObservableArray, fail } from "../internal"

export const EMPTY_ARRAY = []
Object.freeze(EMPTY_ARRAY)

export const EMPTY_OBJECT = {}
Object.freeze(EMPTY_OBJECT)

export interface Lambda {
    (): void
    name?: string
}

const hasProxy = typeof Proxy !== "undefined"

export function assertProxies() {
    if (!hasProxy) {
        fail(
            "`Proxy` objects are not available in the current environment. Please configure MobX to enable  a fallback implementation using `enableES5()`"
        )
    }
}

export function warnAboutProxyRequirement() {
    if (globalState.verifyProxies) {
        // TODO: add relevant URL at the end of this warning
        console.warn(
            "MobX is currently configured to be able to allow running ES5 mode, however, this line of code will not work on ES5 environments. For details see: "
        )
    }
}

export function getNextId() {
    return ++globalState.mobxGuid
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

export function isFunction(fn: any): fn is Function {
    return typeof fn === "function"
}

export function isStringish(value: any): value is string | number | symbol {
    const t = typeof value
    switch (t) {
        case "string":
        case "symbol":
        case "number":
            return true
    }
    return false
}

export function isObject(value: any): value is Object {
    return value !== null && typeof value === "object"
}

export function isPlainObject(value) {
    if (!isObject(value)) return false
    const proto = Object.getPrototypeOf(value)
    return proto === Object.prototype || proto === null
}

export const assign = Object.assign
export const getDescriptor = Object.getOwnPropertyDescriptor

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
    const descriptor = getDescriptor(object, prop)
    return !descriptor || (descriptor.configurable !== false && descriptor.writable !== false)
}

export function assertPropertyConfigurable(object: any, prop: PropertyKey) {
    if (__DEV__ && !isPropertyConfigurable(object, prop))
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

const hasGetOwnPropertySymbols = typeof Object.getOwnPropertySymbols !== "undefined"

/**
 * Returns the following: own keys, prototype keys & own symbol keys, if they are enumerable.
 */
export function getPlainObjectKeys(object) {
    const keys = Object.keys(object)
    // Not supported in IE, so there are not going to be symbol props anyway...
    if (!hasGetOwnPropertySymbols) return keys
    const symbols = Object.getOwnPropertySymbols(object)
    if (!symbols.length) return keys
    return [...keys, ...symbols.filter(s => Object.prototype.propertyIsEnumerable.call(object, s))]
}

export function stringifyKey(key: any): string {
    if (typeof key === "string") return key
    if (typeof key === "symbol") return key.toString()
    return new String(key).toString()
}

export function toPrimitive(value) {
    return value === null ? null : typeof value === "object" ? "" + value : value
}

export function hasProp(target: Object, prop: PropertyKey): boolean {
    return Object.prototype.hasOwnProperty.call(target, prop)
}
