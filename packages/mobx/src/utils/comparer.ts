import { deepEqual } from "../internal"

export interface IEqualsComparer<T> {
    (a: T, b: T): boolean
}

function identityComparer<T>(a: T, b: T): boolean {
    return a === b
}

function structuralComparer<T>(a: T, b: T): boolean {
    return deepEqual(a, b)
}

function shallowComparer<T>(a: T, b: T): boolean {
    return deepEqual(a, b, 1)
}

function defaultComparer<T>(a: T, b: T): boolean {
    if (Object.is) return Object.is(a, b)

    return a === b
        ? (a as any) !== 0 || 1 / (a as any) === 1 / (b as any)
        : a !== a && b !== b
}

export const comparer = {
    identity: identityComparer,
    structural: structuralComparer,
    default: defaultComparer,
    shallow: shallowComparer
}
