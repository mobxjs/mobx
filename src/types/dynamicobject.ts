import { Atom } from "../core/atom"
import { IIsObservableObject, ObservableObjectAdministration } from "./observableobject"
import { set } from "../api/object-api"

function getAdm(target): ObservableObjectAdministration {
    return target.$mobx
}

const objectProxyTraps: ProxyHandler<any> = {
    get(target: IIsObservableObject, name: string) {
        // TODO: use symbol for  "__mobxDidRunLazyInitializers" and "$mobx", and remove these checks
        if (name === "$mobx" || name === "constructor" || name === "__mobxDidRunLazyInitializers")
            return target[name]
        const adm = getAdm(target)
        const observable = adm.values[name]
        if (observable instanceof Atom) return (observable as any).get()
        // make sure we start listening to future keys
        // note that we only do this here for optimization
        adm.has(name)
        return target[name]
    },
    set(target: IIsObservableObject, name: string, value: any) {
        set(target, name, value)
        return true
    },
    deleteProperty(target: IIsObservableObject, name: string) {
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
    base.$mobx.proxy = proxy
    return proxy
}
