import { deepEqual, areBothNan } from "../utils/utils"

export interface IEqualsComparer<T> {
    (a: T, b: T): boolean
}

function identityComparer(a: any, b: any): boolean {
    return a === b
}

function structuralComparer(a: any, b: any): boolean {
    return deepEqual(a, b)
}

function defaultComparer(a: any, b: any): boolean {
    return areBothNan(a,b) || identityComparer(a, b)
}

export const comparer = {
    identity: identityComparer,
    structural: structuralComparer,
    default: defaultComparer
}
