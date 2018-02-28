import { IInterceptor } from "../types/intercept-utils"
import { IObservableArray, IArrayWillChange, IArrayWillSplice } from "../types/observablearray"
import { ObservableMap, IMapWillChange } from "../types/observablemap"
import { IObjectWillChange } from "../types/observableobject"
import { IValueWillChange, IObservableValue } from "../types/observablevalue"
import { Lambda } from "../utils/utils"
import { getAdministration } from "../types/type-utils"

export function intercept<T>(
    value: IObservableValue<T>,
    handler: IInterceptor<IValueWillChange<T>>
): Lambda
export function intercept<T>(
    observableArray: IObservableArray<T>,
    handler: IInterceptor<IArrayWillChange<T> | IArrayWillSplice<T>>
): Lambda
export function intercept<K, V>(
    observableMap: ObservableMap<K, V>,
    handler: IInterceptor<IMapWillChange<K, V>>
): Lambda
export function intercept<K, V>(
    observableMap: ObservableMap<K, V>,
    property: K,
    handler: IInterceptor<IValueWillChange<V>>
): Lambda
export function intercept(object: Object, handler: IInterceptor<IObjectWillChange>): Lambda
export function intercept<T extends Object, K extends keyof T>(
    object: T,
    property: K,
    handler: IInterceptor<IValueWillChange<any>>
): Lambda
export function intercept(thing, propOrHandler?, handler?): Lambda {
    if (typeof handler === "function") return interceptProperty(thing, propOrHandler, handler)
    else return interceptInterceptable(thing, propOrHandler)
}

function interceptInterceptable(thing, handler) {
    return getAdministration(thing).intercept(handler)
}

function interceptProperty(thing, property, handler) {
    return getAdministration(thing, property).intercept(handler)
}
