import {
    $mobx,
    IIsObservableObject,
    ObservableObjectAdministration,
    die,
    isStringish,
    CreateObservableOptions,
    asObservableObject
} from "../internal"

function getAdm(target): ObservableObjectAdministration {
    return target[$mobx]
}

// Optimization: we don't need the intermediate objects and could have a completely custom administration for DynamicObjects,
// and skip either the internal values map, or the base object with its property descriptors!
const objectProxyTraps: ProxyHandler<any> = {
    has(target: IIsObservableObject, name: PropertyKey): boolean {
        return getAdm(target).has_(name)
    },
    get(target: IIsObservableObject, name: PropertyKey): any {
        return getAdm(target).get_(name)
    },
    set(target: IIsObservableObject, name: PropertyKey, value: any): boolean {
        if (!isStringish(name)) {
            return false
        }
        // null (intercepted) -> true (success)
        return getAdm(target).set_(name, value, true) ?? true
    },
    deleteProperty(target: IIsObservableObject, name: PropertyKey): boolean {
        if (!isStringish(name)) {
            return false
        }
        // null (intercepted) -> true (success)
        return getAdm(target).delete_(name, true) ?? true
    },
    defineProperty(
        target: IIsObservableObject,
        name: PropertyKey,
        descriptor: PropertyDescriptor
    ): boolean {
        // null (intercepted) -> true (success)
        return getAdm(target).defineProperty_(name, descriptor) ?? true
    },
    ownKeys(target: IIsObservableObject): ArrayLike<string | symbol> {
        return getAdm(target).ownKeys_()
    },
    preventExtensions(target) {
        die(13)
    }
}

export function asDynamicObservableObject(
    target: any,
    options?: CreateObservableOptions
): IIsObservableObject {
    target = asObservableObject(target, options)
    return (target[$mobx].proxy_ ??= new Proxy(target, objectProxyTraps))
}
