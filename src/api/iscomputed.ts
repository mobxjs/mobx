import { $mobx, fail, getAtom, isComputedValue, isObservableObject } from "../internal"

export function _isComputed(value, property?: string): boolean {
    if (value === null || value === undefined) return false
    if (property !== undefined) {
        if (isObservableObject(value) === false) return false
        if (!value[$mobx].values.has(property)) return false
        const atom = getAtom(value, property)
        return isComputedValue(atom)
    }
    return isComputedValue(value)
}

export function isComputed(value: any): boolean {
    if (arguments.length > 1)
        return fail(
            process.env.NODE_ENV !== "production" &&
                `isComputed expects only 1 argument. Use isObservableProp to inspect the observability of a property`
        )
    return _isComputed(value)
}

export function isComputedProp(value: any, propName: string): boolean {
    if (typeof propName !== "string")
        return fail(
            process.env.NODE_ENV !== "production" &&
                `isComputed expected a property name as second argument`
        )
    return _isComputed(value, propName)
}
