import {
    $mobx,
    Atom,
    IIsObservableObject,
    ObservableObjectAdministration,
    fail,
    mobxDidRunLazyInitializersSymbol,
    set
} from "../internal"

function getAdm(target): ObservableObjectAdministration {
    return target[$mobx]
}

// Optimization: we don't need the intermediate objects and could have a completely custom administration for DynamicObjects,
// and skip either the internal values map, or the base object with its property descriptors!
const objectProxyTraps: ProxyHandler<any> = {
    has(target: IIsObservableObject, name: PropertyKey) {
        if (name === $mobx || name === "constructor" || name === mobxDidRunLazyInitializersSymbol)
            return true
        const adm = getAdm(target)
        if (adm.values.get(name as string)) return true
        if (typeof name === "string") return adm.has(name)
        return (name as any) in target
    },
    get(target: IIsObservableObject, name: PropertyKey) {
        if (name === $mobx || name === "constructor" || name === mobxDidRunLazyInitializersSymbol)
            return target[name]
        const adm = getAdm(target)
        const observable = adm.values.get(name as string)
        if (observable instanceof Atom) return (observable as any).get()
        // make sure we start listening to future keys
        // note that we only do this here for optimization
        if (typeof name === "string") adm.has(name)
        return target[name]
    },
    set(target: IIsObservableObject, name: PropertyKey, value: any) {
        if (typeof name !== "string") return false
        set(target, name, value)
        return true
    },
    deleteProperty(target: IIsObservableObject, name: PropertyKey) {
        if (typeof name !== "string") return false
        const adm = getAdm(target)
        adm.remove(name)
        return true
    },
    ownKeys(target: IIsObservableObject) {
        const adm = getAdm(target)
        adm.keysAtom.reportObserved()
        return Reflect.ownKeys(target)
    },
    preventExtensions(target) {
        fail(`Dynamic observable objects cannot be frozen`)
        return false
    }
}

export function createDynamicObservableObject(base) {
    const proxy = new Proxy(base, objectProxyTraps)
    base[$mobx].proxy = proxy
    return proxy
}
