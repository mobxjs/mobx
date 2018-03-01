import { isObservableMap } from "../types/observablemap"
import {
    asObservableObject,
    defineObservablePropertyFromDescriptor
} from "../types/observableobject"
import { isObservable } from "./isobservable"
import { invariant, isPropertyConfigurable, hasOwnProperty, deprecated, fail } from "../utils/utils"
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
        options.defaultDecorator || (options.deep === true ? observable.deep : observable.ref)
    const adm = asObservableObject(target)
    startBatch()
    try {
        decorators = decorators || ({} as any)
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
                Object.defineProperty(target, key, descriptor)
                decorators![key] = decorators![key] || computed
            } else {
                unassigned.push(key)
                decorators![key] = decorators![key] || defaultDecorator
            }
        }
        decorate(target, decorators as any)
        unassigned.forEach(key => (target[key] = properties[key])) // TODO: optimize
    } finally {
        endBatch()
    }
    return target as any
}
