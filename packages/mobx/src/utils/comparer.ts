import { deepEqual } from "../internal"

export interface IEqualsComparer<T> {
    (a: T, b: T): boolean
}

export function compareIdentity(a: any, b: any): boolean {
    return a === b
}

export function compareStructural(a: any, b: any): boolean {
    return deepEqual(a, b)
}

export function compareShallow(a: any, b: any): boolean {
    return deepEqual(a, b, 1)
}

export const compareDefault = Object.is
