import { isObservableMap } from "../types/observablemap"
import {
    asObservableObject,
    defineObservablePropertyFromDescriptor
} from "../types/observableobject"
import { isObservable } from "./isobservable"
import { invariant, isPropertyConfigurable, hasOwnProperty, deprecated } from "../utils/utils"
import { deepEnhancer, referenceEnhancer } from "../types/modifiers"
import { startBatch, endBatch } from "../core/observable"
import {
    CreateObservableOptions,
    asCreateObservableOptions,
    shallowCreateObservableOptions,
    observable
} from "./observable"
import { computed } from "./computed"
import { decorate } from "./decorate"
import { isComputed } from "./iscomputed"

export function extendShallowObservable<A extends Object, B extends Object>(
    target: A,
    properties: B
): A & B {
    deprecated(
        "'extendShallowObservable' is deprecated, use 'extendObservable(target, props, { deep: false })' instead"
    )
    return extendObservable(target, properties, shallowCreateObservableOptions)
}

export function extendObservable<A extends Object, B extends Object>(
    target: A,
    properties: B,
    options?: CreateObservableOptions
): A & B {
    if (process.env.NODE_ENV !== "production") {
        invariant(
            arguments.length === 2 || arguments.length === 3,
            "'extendObservable' expected 2 or 3 arguments"
        )
        invariant(
            typeof target === "object",
            "'extendObservable' expects an object as first argument"
        )
        invariant(
            !isObservableMap(target),
            "'extendObservable' should not be used on maps, use map.merge instead"
        )
        invariant(
            typeof properties === "object",
            "All arguments of 'extendObservable' should be objects"
        )
        invariant(
            !isObservable(properties),
            "Extending an object with another observable (object) is not supported. Please construct an explicit propertymap, using `toJS` if need. See issue #540"
        )
    }

    // TODO: eliminate options, preserve name
    options = asCreateObservableOptions(options)
    // TODO:
    // const defaultEnhancer =
    //     options.enhancer || (options.deep === true ? deepEnhancer : referenceEnhancer)
    const adm = asObservableObject(target)
    startBatch()
    try {
        const decorators: any = {}
        for (let key in properties) {
            // TODO: using decorators is a bit inefficient, short circuit those
            if ((target as any) === properties && !isPropertyConfigurable(target, key)) continue // see #111, skip non-configurable or non-writable props for `observable(object)`.
            const descriptor = Object.getOwnPropertyDescriptor(properties, key)!
            if (typeof descriptor.get === "function") {
                decorators[key] = computed
            } else if (typeof descriptor.value === "function" || isComputed(descriptor.value)) {
                continue
            } else {
                decorators[key] = options!.deep === true ? observable.deep : observable.ref
            }
            Object.defineProperty(target, key, descriptor)
        }
        decorate(target, decorators)
    } finally {
        endBatch()
    }
    return target as any
}
