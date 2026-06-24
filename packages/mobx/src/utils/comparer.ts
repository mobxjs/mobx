import { deepEqual } from "../internal"

export interface IEqualsComparer<T> {
    (a: T, b: T): boolean
}

export function comparerIdentity(a: any, b: any): boolean {
    return a === b
}

export function comparerStructural(a: any, b: any): boolean {
    return deepEqual(a, b)
}

export function comparerShallow(a: any, b: any): boolean {
    return deepEqual(a, b, 1)
}

export function comparerDefault(a: any, b: any): boolean {
    return Object.is(a, b)
}
