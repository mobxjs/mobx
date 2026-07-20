import { globalState } from "../internal"

// We shorten anything used > 5 times
export const assign = Object.assign
export const getDescriptor = Object.getOwnPropertyDescriptor
export const defineProperty = Object.defineProperty
export const objectPrototype = Object.prototype

export const EMPTY_ARRAY = []
Object.freeze(EMPTY_ARRAY)

export const EMPTY_OBJECT = {}
Object.freeze(EMPTY_OBJECT)

export interface Lambda {
    (): void
    name?: string
}

const plainObjectString = Object.toString()

export function getNextId() {
    return ++globalState.mobxGuid
}

/**
 * Makes sure that the provided function is invoked at most once.
 */
export function once(func: Lambda): Lambda {
    let invoked = false
    return function () {
        if (invoked) {
            return
        }
        invoked = true
        return (func as any).apply(this, arguments)
    }
}

export const noop = () => {}

export function isFunction(fn: any): fn is Function {
    return typeof fn === "function"
}

export function isString(value: any): value is string {
    return typeof value === "string"
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

export function isPlainObject(value: any) {
    if (!isObject(value)) {
        return false
    }
    const proto = Object.getPrototypeOf(value)
    if (proto == null) {
        return true
    }
    const protoConstructor = hasProp(proto, "constructor") && proto.constructor
    return (
        typeof protoConstructor === "function" && protoConstructor.toString() === plainObjectString
    )
}

// https://stackoverflow.com/a/37865170
export function isGenerator(obj: any): boolean {
    const constructor = obj?.constructor
    if (!constructor) {
        return false
    }
    if (
        "GeneratorFunction" === constructor.name ||
        "GeneratorFunction" === constructor.displayName
    ) {
        return true
    }
    return false
}

export function addHiddenProp(object: any, propName: PropertyKey, value: any) {
    defineProperty(object, propName, {
        enumerable: false,
        writable: true,
        configurable: true,
        value
    })
}

export function addHiddenFinalProp(object: any, propName: PropertyKey, value: any) {
    defineProperty(object, propName, {
        enumerable: false,
        writable: false,
        configurable: true,
        value
    })
}

export function createInstanceofPredicate<T>(
    name: string,
    theClass: new (...args: any[]) => T
): (x: any) => x is T {
    const propName = "isMobX" + name
    theClass.prototype[propName] = true
    return function (x) {
        return isObject(x) && x[propName] === true
    } as any
}

/**
 * Yields true for both native and observable Map, even across different windows.
 */
export function isES6Map(thing: unknown): thing is Map<any, any> {
    return thing != null && Object.prototype.toString.call(thing) === "[object Map]"
}

/**
 * Makes sure a Map is an instance of non-inherited native or observable Map.
 */
export function isPlainES6Map(thing: Map<unknown, unknown>): boolean {
    const mapProto = Object.getPrototypeOf(thing)
    const objectProto = Object.getPrototypeOf(mapProto)
    const nullProto = Object.getPrototypeOf(objectProto)
    return nullProto === null
}

/**
 * Yields true for both native and observable Set, even across different windows.
 */
export function isES6Set(thing: unknown): thing is Set<any> {
    return thing != null && Object.prototype.toString.call(thing) === "[object Set]"
}

/**
 * Returns the following: own enumerable keys and symbols.
 */
export function getPlainObjectKeys(object: any) {
    const keys = Object.keys(object)
    const symbols = Object.getOwnPropertySymbols(object)
    if (!symbols.length) {
        return keys
    }
    return [...keys, ...symbols.filter(s => objectPrototype.propertyIsEnumerable.call(object, s))]
}

// From Immer utils
// Returns all own keys, including non-enumerable and symbolic
export const ownKeys: (target: any) => Array<string | symbol> = Reflect.ownKeys

export function stringifyKey(key: any): string {
    if (typeof key === "string") {
        return key
    }
    if (typeof key === "symbol") {
        return key.toString()
    }
    return new String(key).toString()
}

export function toPrimitive(value: any) {
    return value === null ? null : typeof value === "object" ? "" + value : value
}

export function hasProp(target: Object, prop: PropertyKey): boolean {
    return objectPrototype.hasOwnProperty.call(target, prop)
}

export const getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors

export function getFlag(flags: number, mask: number) {
    return !!(flags & mask)
}

export function setFlag(flags: number, mask: number, newValue: boolean): number {
    if (newValue) {
        flags |= mask
    } else {
        flags &= ~mask
    }
    return flags
}
