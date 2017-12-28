import { isObservableArray } from "../types/observablearray"
import { isObservableMap } from "../types/observablemap"
import { isObservableObject, ObservableObjectAdministration } from "../types/observableobject"
import { isAtom } from "../core/atom"
import { isComputedValue } from "../core/computedvalue"
import { isReaction } from "../core/reaction"
import { getMessage } from "../utils/messages"

/**
 * Returns true if the provided value is reactive.
 * @param value object, function or array
 * @param property if property is specified, checks whether value.property is reactive.
 */
export function isObservable(value, property?: string): boolean {
    if (value === null || value === undefined) return false
    if (property !== undefined) {
        if (isObservableArray(value) || isObservableMap(value)) throw new Error(getMessage("m019"))
        else if (isObservableObject(value)) {
            const o = <ObservableObjectAdministration>(value as any).$mobx
            return o.values && !!o.values[property]
        }
        return false
    }
    // For first check, see #701
    return (
        isObservableObject(value) ||
        !!value.$mobx ||
        isAtom(value) ||
        isReaction(value) ||
        isComputedValue(value)
    )
}
