import { deepEqual } from "../internal"

export interface IEqualsComparer<T> {
    (a: T, b: T): boolean
}

function identityComparer(a: any, b: any): boolean {
    return a === b
}

function structuralComparer(a: any, b: any): boolean {
    return deepEqual(a, b)
}

function shallowComparer(a: any, b: any): boolean {
    return deepEqual(a, b, 1)
}

function defaultComparer(a: any, b: any): boolean {
    return Object.is(a, b)
}

export const comparer = {
    identity: identityComparer,
    structural: structuralComparer,
    default: defaultComparer,
    shallow: shallowComparer
}
