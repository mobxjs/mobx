import { isObservableMap } from "../types/observablemap"
import {
    asObservableObject,
    defineObservableProperty,
    defineComputedProperty
} from "../types/observableobject"
import { isObservable } from "./isobservable"
import { invariant, deprecated, fail } from "../utils/utils"
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
import { referenceEnhancer, deepEnhancer } from "../types/modifiers"

export function extendShallowObservable<A extends Object, B extends Object>(
    target: A,
    properties: B,
    decorators?: { [K in keyof B]?: Function }
): A & B {
    // TODO: or restore?
    deprecated(
        "'extendShallowObservable' is deprecated, use 'extendObservable(target, props, { deep: false })' instead"
    )
    return extendObservable(target, properties, decorators, shallowCreateObservableOptions)
}

export function extendObservable<A extends Object, B extends Object>(
    target: A,
    properties: B,
    decorators?: { [K in keyof B]?: Function },
    options?: CreateObservableOptions
): A & B {
    if (process.env.NODE_ENV !== "production") {
        invariant(
            arguments.length >= 2 && arguments.length <= 4,
            "'extendObservable' expected 2-4 arguments"
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
            !isObservable(properties),
            "Extending an object with another observable (object) is not supported. Please construct an explicit propertymap, using `toJS` if need. See issue #540"
        )
    }

    // TODO: eliminate options, preserve name
    options = asCreateObservableOptions(options)
    // TODO:
    const defaultDecorator =
        options.defaultDecorator || (options.deep === false ? observable.ref : observable.deep)
    asObservableObject(target) // make sure object is observable, even without initial props
    startBatch()
    try {
        const additionalDecorators = {} as any // don't want to modify passed in object
        const unassigned: string[] = []
        for (let key in properties) {
            const descriptor = Object.getOwnPropertyDescriptor(properties, key)!
            const { value, get } = descriptor
            // TODO: introduce and check decorators arg
            if (process.env.NODE_ENV !== "production") {
                if (Object.getOwnPropertyDescriptor(target, key))
                    fail(
                        `'extendObservable' can only be used to introduce new properties. Use 'set' or 'decorate' instead. The property '${key}' already exists on '${target}'`
                    )
                if (isComputed(value))
                    fail(
                        `Passing a 'computed' as initial property value is no longer supported by extendObservable. Use a getter or decorator instead`
                    )
            }
            if (typeof get === "function") {
                // todo: push getter
                if (decorators && decorators[key]) {
                    // just copy the description, the decorator will pick it up during decorate
                    Object.defineProperty(target, key, descriptor)
                } else {
                    // optimized shortcut; don't use the decorator but declare prop right away
                    defineComputedProperty(target, key, { get, set: descriptor.set })
                }
            } else {
                if (decorators && decorators[key]) unassigned.push(key)
                else {
                    // optimized shortcut; don't use the decorator but declare prop right away
                    // TODO: theother enhancers
                    defineObservableProperty(
                        target,
                        key,
                        value,
                        options.deep === false ? referenceEnhancer : deepEnhancer
                    )
                }
            }
        }
        if (decorators) decorate(target, decorators as any)
        // TODO: can optimize decorators away if decorators are callable?
        decorate(target, additionalDecorators)
        unassigned.forEach(key => (target[key] = properties[key])) // TODO: optimize
    } finally {
        endBatch()
    }
    return target as any
}
