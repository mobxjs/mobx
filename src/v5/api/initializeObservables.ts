import {
    isObservableValue,
    asObservableObject,
    isComputed,
    isObservableObject,
    isObservableArray,
    isObservableMap,
    isObservableSet
} from "../internal"

// TODO: support decorator arg
// TODO: support auto mode?
export function initializeObservables(target: Object) {
    // TODO: store the analysis map on the proto of target if possible
    // TODO: don't create closure
    // own, enumerable and non-enumerable, except non-enumerable symbols. IE 9 compatible
    Object.getOwnPropertyNames(target).forEach(key => {
        const v = target[key]
        const adm = asObservableObject(target)
        if (isObservableValue(v)) {
            // TODO: reuse the the observable so all options are preserved
            adm.addObservableProp(key, v.get()) // TODO: determine enhancer from
        } else if (isComputed(v)) {
            // TODO: reuse the the observable so all options are preserved
            adm.addComputedProp(target /* TODO: or proto ? */, key, { get: v.derivation })
        } else if (
            isObservableObject(v) ||
            isObservableArray(v) ||
            isObservableMap(v) ||
            isObservableSet(v)
        ) {
            // TODO: reuse the the observable so all options are preserved
            adm.addObservableProp(key, v) // TODO: determine enhancer from
        }
        // TODO: make actions non-enumerable
    })
}
