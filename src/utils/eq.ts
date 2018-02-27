import { areBothNaN, isArrayLike, isMapLike, getEnumerableKeys } from "./utils"
import { observable } from "../api/observable"

/**
 * Naive deepEqual. Doesn't check for prototype, non-enumerable or out-of-range properties on arrays.
 * If you have such a case, you probably should use this function but something fancier :).
 */
export function deepEqual(a, b) {
    if (a === null && b === null) return true
    if (a === undefined && b === undefined) return true
    if (areBothNaN(a, b)) return true
    if (typeof a !== "object") return a === b
    const aIsArray = isArrayLike(a)
    const aIsMap = isMapLike(a)
    if (aIsArray !== isArrayLike(b)) {
        return false
    } else if (aIsMap !== isMapLike(b)) {
        return false
    } else if (aIsArray) {
        if (a.length !== b.length) return false
        for (let i = a.length - 1; i >= 0; i--) if (!deepEqual(a[i], b[i])) return false
        return true
    } else if (aIsMap) {
        if (a.size !== b.size) return false
        let equals = true
        a.forEach((value, key) => {
            equals = equals && deepEqual(b.get(key), value)
        })
        return equals
    } else if (typeof a === "object" && typeof b === "object") {
        if (a === null || b === null) return false
        if (isMapLike(a) && isMapLike(b)) {
            if (a.size !== b.size) return false
            // Freaking inefficient.... Create PR if you run into this :) Much appreciated!
            return deepEqual(observable.shallowMap(a).entries(), observable.shallowMap(b).entries())
        }
        if (getEnumerableKeys(a).length !== getEnumerableKeys(b).length) return false
        for (let prop in a) {
            if (!(prop in b)) return false
            if (!deepEqual(a[prop], b[prop])) return false
        }
        return true
    }
    return false
}
