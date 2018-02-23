import { IObservableArray, IArrayChange, IArraySplice } from "../types/observablearray"
import { ObservableMap, IMapChange } from "../types/observablemap"
import { IObjectChange } from "../types/observableobject"
import { IComputedValue } from "../core/computedvalue"
import { IObservableValue, IValueDidChange } from "../types/observablevalue"
import { Lambda } from "../utils/utils"
import { getAdministration, getAtom } from "../types/type-utils"
import { IObservable } from "../core/observable"
import { fail } from "../utils/utils"

export function onBecomeObserved(
    value: IObservable | IComputedValue<any> | IObservableArray<any> | ObservableMap<any>,
    listener: Lambda
): Lambda
export function onBecomeObserved(
    value: ObservableMap<any> | Object,
    property: string,
    listener: Lambda
): Lambda
export function onBecomeObserved(thing, arg2, arg3?): Lambda {
    return interceptHook("onBecomeObserved", thing, arg2, arg3)
}

export function onBecomeUnobserved(
    value: IObservable | IComputedValue<any> | IObservableArray<any> | ObservableMap<any>,
    listener: Lambda
): Lambda
export function onBecomeUnobserved(
    value: ObservableMap<any> | Object,
    property: string,
    listener: Lambda
): Lambda
export function onBecomeUnobserved(thing, arg2, arg3?): Lambda {
    return interceptHook("onBecomeUnobserved", thing, arg2, arg3)
}

function interceptHook(hook: "onBecomeObserved" | "onBecomeUnobserved", thing, arg2, arg3) {
    const atom: IObservable =
        typeof arg2 === "string" ? getAtom(thing, arg2) : getAtom(thing) as any
    const cb = typeof arg2 === "string" ? arg3 : arg2
    const orig = atom[hook]

    if (typeof orig !== "function") return fail("Not an atom that can be (un)observed")

    atom[hook] = function() {
        orig.call(this)
        cb.call(this)
    }
    return function() {
        this[hook] = orig
    }
}
