import { areBothNaN } from "../utils/utils"

export interface IEqualsComparer<T> {
    (a: T, b: T): boolean
}

export function identityComparer(a: any, b: any): boolean {
    return a === b
}

export function defaultComparer(a: any, b: any): boolean {
    return areBothNaN(a,b) || identityComparer(a, b)
}
