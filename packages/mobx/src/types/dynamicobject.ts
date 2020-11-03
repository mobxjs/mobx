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
import { globalState } from "../core/globalstate"

function getAdm(target): ObservableObjectAdministration {
    return target[$mobx]
}

// Optimization: we don't need the intermediate objects and could have a completely custom administration for DynamicObjects,
// and skip either the internal values map, or the base object with its property descriptors!
const objectProxyTraps: ProxyHandler<any> = {
    has(target: IIsObservableObject, name: PropertyKey) {
        if (name === $mobx || name === "constructor") return true
        if (__DEV__ && globalState.trackingDerivation)
            warnAboutProxyRequirement(
                "detect new properties using the 'in' operator. Use 'has' from 'mobx' instead."
            )
        const adm = getAdm(target)
        // MWE: should `in` operator be reactive? If not, below code path will be faster / more memory efficient
        // check performance stats!
        // if (adm.values.get(name as string)) return true
        if (isStringish(name)) return adm.has_(name)
        return (name as any) in target
    },
    get(target: IIsObservableObject, name: PropertyKey) {
        if (name === $mobx || name === "constructor") return target[name]
        const adm = getAdm(target)
        const observable = adm.values_.get(name)
        if (observable instanceof Atom) {
            const result = (observable as any).get()
            if (result === undefined) {
                // This fixes #1796, because deleting a prop that has an
                // undefined value won't retrigger a observer (no visible effect),
                // the autorun wouldn't subscribe to future key changes (see also next comment)
                adm.has_(name as any)
            }
            return result
        }
        // make sure we start listening to future keys
        // note that we only do this here for optimization
        if (isStringish(name)) adm.has_(name)
        return target[name]
    },
    set(target: IIsObservableObject, name: PropertyKey, value: any) {
        if (!isStringish(name)) return false
        if (__DEV__ && !getAdm(target).values_.has(name)) {
            warnAboutProxyRequirement(
                "add a new observable property through direct assignment. Use 'set' from 'mobx' instead."
            )
        }
        set(target, name, value)
        return true
    },
    deleteProperty(target: IIsObservableObject, name: PropertyKey) {
        if (__DEV__)
            warnAboutProxyRequirement(
                "delete properties from an observable object. Use 'remove' from 'mobx' instead."
            )
        if (!isStringish(name)) return false
        const adm = getAdm(target)
        adm.remove_(name)
        return true
    },
    ownKeys(target: IIsObservableObject) {
        if (__DEV__ && globalState.trackingDerivation)
            warnAboutProxyRequirement(
                "iterate keys to detect added / removed properties. Use `keys` from 'mobx' instead."
            )
        const adm = getAdm(target)
        adm.keysAtom_.reportObserved()
        return Reflect.ownKeys(target)
    },
    preventExtensions(target) {
        die(13)
    }
}

export function createDynamicObservableObject(base) {
    assertProxies()
    const proxy = new Proxy(base, objectProxyTraps)
    base[$mobx].proxy_ = proxy
    return proxy
}
