import {
    $mobx,
    Atom,
    IIsObservableObject,
    ObservableObjectAdministration,
    set,
    warnAboutProxyRequirement,
    assertProxies,
    die,
    isStringish
} from "../internal"

function getAdm(target): ObservableObjectAdministration {
    return target[$mobx]
}

// Optimization: we don't need the intermediate objects and could have a completely custom administration for DynamicObjects,
// and skip either the internal values map, or the base object with its property descriptors!
const objectProxyTraps: ProxyHandler<any> = {
    has(target: IIsObservableObject, name: PropertyKey) {
        // TODO: introduce isConstructor
        if (name === $mobx || name === "constructor") return true
        if (__DEV__) warnAboutProxyRequirement() // TODO: is this correct?
        const adm = getAdm(target)
        // MWE: should `in` operator be reactive? If not, below code path will be faster / more memory efficient
        // TODO: check performance stats!
        // if (adm.values.get(name as string)) return true
        if (isStringish(name)) return adm.has(name)
        return (name as any) in target
    },
    get(target: IIsObservableObject, name: PropertyKey) {
        if (name === $mobx || name === "constructor") return target[name]
        const adm = getAdm(target)
        const observable = adm.values.get(name)
        if (observable instanceof Atom) {
            const result = (observable as any).get()
            if (result === undefined) {
                // This fixes #1796, because deleting a prop that has an
                // undefined value won't retrigger a observer (no visible effect),
                // the autorun wouldn't subscribe to future key changes (see also next comment)
                adm.has(name as any)
            }
            return result
        }
        // make sure we start listening to future keys
        // note that we only do this here for optimization
        if (isStringish(name)) adm.has(name)
        return target[name]
    },
    set(target: IIsObservableObject, name: PropertyKey, value: any) {
        if (!isStringish(name)) return false
        if (__DEV__ && !getAdm(target).values.has(name)) {
            warnAboutProxyRequirement()
        }
        set(target, name, value)
        return true
    },
    deleteProperty(target: IIsObservableObject, name: PropertyKey) {
        if (__DEV__) warnAboutProxyRequirement()
        if (!isStringish(name)) return false
        const adm = getAdm(target)
        adm.remove(name)
        return true
    },
    ownKeys(target: IIsObservableObject) {
        if (__DEV__) warnAboutProxyRequirement()
        const adm = getAdm(target)
        adm.keysAtom.reportObserved()
        return Reflect.ownKeys(target)
    },
    preventExtensions(target) {
        die(13)
    }
}

export function createDynamicObservableObject(base) {
    assertProxies()
    const proxy = new Proxy(base, objectProxyTraps)
    base[$mobx].proxy = proxy
    return proxy
}
