import { Atom } from "../core/atom"
import { IIsObservableObject, ObservableObjectAdministration } from "./observableobject"
import { set } from "../api/object-api"
import { $mobx } from "../utils/utils"
import { mobxDidRunLazyInitializersSymbol } from "../utils/decorators2"

function getAdm(target): ObservableObjectAdministration {
    return target[$mobx]
}

const objectProxyTraps: ProxyHandler<any> = {
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
        return adm.getKeys() as PropertyKey[]
    }
}

export function createDynamicObservableObject(base) {
    const proxy = new Proxy(base, objectProxyTraps)
    base[$mobx].proxy = proxy
    return proxy
}
