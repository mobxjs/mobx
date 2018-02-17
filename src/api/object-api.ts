import { isObservableMap, ObservableMap } from "../types/observablemap"
import {
    isObservableObject,
    IObservableObject,
    ObservableObjectAdministration,
    IIsObservableObject
} from "../types/observableobject"
import { isObservableArray, IObservableArray } from "../types/observablearray"
import { fail } from "../utils/utils"

export function keys(obj: IObservableObject): string[]
export function keys<T>(map: ObservableMap<T>): string[]
export function keys(obj: any): string[] {
    if (isObservableObject(obj)) {
        return ((obj as any) as IIsObservableObject).$mobx.getKeys()
    }
    if (isObservableMap(obj)) {
        return obj.keys()
    }
    return fail("'values()' can only be used with observable objects and maps")
}
