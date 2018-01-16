export const EMPTY_ARRAY = []
Object.freeze(EMPTY_ARRAY)

export const EMPTY_OBJECT = Object.create(null);
Object.freeze(EMPTY_OBJECT);

export interface Lambda {
    (): void
    name?: string
}

export function fail(message: string, thing?: any): never {
    invariant(false, message, thing)
    throw "X" // unreachable
}

export function invariant(check: boolean, message: string, thing?: any) {
    if (!check)
        throw new Error("[mobx] Invariant failed: " + message + (thing ? ` in '${thing}'` : ""))
}

/**
 * Makes sure that the provided function is invoked at most once.
 */
export function once(func: Lambda): Lambda {
    let invoked = false
    return function(this: any) {
        if (invoked) return
        invoked = true
        return (func as any).apply(this, arguments)
    }
}

export const noop = () => {}

export const identity:<T>(x: T) => T = x => x;

export function unique<T>(list: T[]): T[] {
    const res: T[] = []
    list.forEach(item => {
        if (res.indexOf(item) === -1) res.push(item)
    })
    return res
}

export function joinStrings(things: string[], limit: number = 100, separator = " - "): string {
    if (!things) return ""
    const sliced = things.slice(0, limit)
    return `${sliced.join(separator)}${things.length > limit
        ? " (... and " + (things.length - limit) + "more)"
        : ""}`
}

export function isObject(value: any): boolean {
    return value !== null && typeof value === "object"
}

export function isPlainObject(value: any) {
    if (value === null || typeof value !== "object") return false
    const proto = Object.getPrototypeOf(value)
    return proto === Object.prototype || proto === null
}

const prototypeHasOwnProperty = Object.prototype.hasOwnProperty
export function hasOwnProperty(object: Object, propName: string) {
    return prototypeHasOwnProperty.call(object, propName)
}

export function createInstanceofPredicate<T>(
    name: string,
    clazz: new (...args: any[]) => T
): (x: any) => x is T {
    const propName = "isMobX" + name
    clazz.prototype[propName] = true
    return function(x: any) {
        return isObject(x) && x[propName] === true
    } as any
}

export function areBothNaN(a: any, b: any): boolean {
    return (typeof a === "number" && typeof b === "number" && isNaN(a) && isNaN(b));
}

declare var Symbol: any

export function primitiveSymbol() {
    return (typeof Symbol === "function" && Symbol.toPrimitive) || "@@toPrimitive"
}

export function toPrimitive(value: any): string | number | boolean | null | undefined | Function {
    return value === null ? null : typeof value === "object" ? "" + value : value
}
