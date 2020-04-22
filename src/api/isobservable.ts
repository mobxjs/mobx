import {
    $mobx,
    ObservableObjectAdministration,
    fail,
    isAtom,
    isComputedValue,
    isObservableArray,
    isObservableMap,
    isObservableObject,
    isReaction
} from "../internal"

function _isObservable(value, property?: string): boolean {
    if (value === null || value === undefined) return false
    if (property !== undefined) {
        if (__DEV__ && (isObservableMap(value) || isObservableArray(value)))
            return fail(
                "isObservable(object, propertyName) is not supported for arrays and maps. Use map.has or array.length instead."
            )
        if (isObservableObject(value)) {
            return (<ObservableObjectAdministration>(value as any)[$mobx]).values.has(property)
        }
        return false
    }
    // For first check, see #701
    return (
        isObservableObject(value) ||
        !!value[$mobx] ||
        isAtom(value) ||
        isReaction(value) ||
        isComputedValue(value)
    )
}

export function isObservable(value: any): boolean {
    if (arguments.length !== 1)
        fail(
            __DEV__ &&
                `isObservable expects only 1 argument. Use isObservableProp to inspect the observability of a property`
        )
    return _isObservable(value)
}

export function isObservableProp(value: any, propName: string): boolean {
    if (typeof propName !== "string" && typeof propName !== "symbol")
        return fail(__DEV__ && `expected a property name as second argument`)
    return _isObservable(value, propName)
}
