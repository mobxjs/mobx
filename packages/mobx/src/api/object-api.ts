import { $mobx, IIsObservableObject, isObservableObject, die } from "../internal"

export function apiDefineProperty(obj: Object, key: PropertyKey, descriptor: PropertyDescriptor) {
    if (isObservableObject(obj)) {
        return (obj as any as IIsObservableObject)[$mobx].defineProperty_(key, descriptor)
    }
    die(39)
}
