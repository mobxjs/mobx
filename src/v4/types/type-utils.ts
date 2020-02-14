import {
    IDepTreeNode,
    isObservableArray,
    isObservableSet,
    isObservableMap,
    fail,
    initializeInstance,
    isObservableObject,
    isAtom,
    isComputedValue,
    isReaction
} from "../internal"

export function getAtom(thing: any, property?: string): IDepTreeNode {
    if (typeof thing === "object" && thing !== null) {
        if (isObservableArray(thing)) {
            if (property !== undefined)
                fail(
                    process.env.NODE_ENV !== "production" &&
                        "It is not possible to get index atoms from arrays"
                )
            return (thing as any).$mobx.atom
        }
        if (isObservableSet(thing)) {
            return (thing as any).$mobx
        }
        if (isObservableMap(thing)) {
            const anyThing = thing as any
            if (property === undefined) return anyThing._keysAtom
            const observable = anyThing._data.get(property) || anyThing._hasMap.get(property)
            if (!observable)
                fail(
                    process.env.NODE_ENV !== "production" &&
                        `the entry '${property}' does not exist in the observable map '${getDebugName(
                            thing
                        )}'`
                )
            return observable
        }
        // Initializers run lazily when transpiling to babel, so make sure they are run...
        initializeInstance(thing)
        if (property && !thing.$mobx) thing[property] // See #1072
        if (isObservableObject(thing)) {
            if (!property)
                return fail(process.env.NODE_ENV !== "production" && `please specify a property`)
            const observable = (thing as any).$mobx.values[property]
            if (!observable)
                fail(
                    process.env.NODE_ENV !== "production" &&
                        `no observable property '${property}' found on the observable object '${getDebugName(
                            thing
                        )}'`
                )
            return observable
        }
        if (isAtom(thing) || isComputedValue(thing) || isReaction(thing)) {
            return thing
        }
    } else if (typeof thing === "function") {
        if (isReaction(thing.$mobx)) {
            // disposer function
            return thing.$mobx
        }
    }
    return fail(process.env.NODE_ENV !== "production" && "Cannot obtain atom from " + thing)
}

export function getAdministration(thing: any, property?: string) {
    if (!thing) fail("Expecting some object")
    if (property !== undefined) return getAdministration(getAtom(thing, property))
    if (isAtom(thing) || isComputedValue(thing) || isReaction(thing)) return thing
    if (isObservableMap(thing) || isObservableSet(thing)) return thing
    // Initializers run lazily when transpiling to babel, so make sure they are run...
    initializeInstance(thing)
    if (thing.$mobx) return thing.$mobx
    fail(process.env.NODE_ENV !== "production" && "Cannot obtain administration from " + thing)
}

export function getDebugName(thing: any, property?: string): string {
    let named
    if (property !== undefined) named = getAtom(thing, property)
    else if (isObservableObject(thing) || isObservableMap(thing) || isObservableSet(thing))
        named = getAdministration(thing)
    else named = getAtom(thing) // valid for arrays as well
    return named.name
}
