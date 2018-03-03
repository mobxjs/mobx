import { isObservableMap } from "../types/observablemap"
import { asObservableObject } from "../types/observableobject"
import { isObservable } from "./isobservable"
import { invariant, deprecated, fail } from "../utils/utils"
import { startBatch, endBatch } from "../core/observable"
import {
    CreateObservableOptions,
    asCreateObservableOptions,
    shallowCreateObservableOptions,
    deepDecorator,
    refDecorator
} from "./observable"
import { isComputed } from "./iscomputed"
import { computedDecorator } from "./computed"
import { applyToInstance } from "../utils/decorators2"

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
    // TODO: the default decorator should be piced from observable object
    const defaultDecorator =
        options.defaultDecorator || (options.deep === false ? refDecorator : deepDecorator)
    // TODO: pass in the default decorator
    asObservableObject(target) // make sure object is observable, even without initial props
    startBatch()
    try {
        for (let key in properties) {
            const descriptor = Object.getOwnPropertyDescriptor(properties, key)!
            // const { value, get } = descriptor
            // TODO: introduce and check decorators arg
            if (process.env.NODE_ENV !== "production") {
                if (Object.getOwnPropertyDescriptor(target, key))
                    fail(
                        `'extendObservable' can only be used to introduce new properties. Use 'set' or 'decorate' instead. The property '${key}' already exists on '${target}'`
                    )
                if (isComputed(descriptor.value))
                    fail(
                        `Passing a 'computed' as initial property value is no longer supported by extendObservable. Use a getter or decorator instead`
                    )
                // TODO: check for superfluos decorators
            }
            const decorator =
                decorators && key in decorators
                    ? decorators[key]
                    : descriptor.get ? computedDecorator : defaultDecorator
            if (process.env.NODE_ENV !== "production" && typeof decorator !== "function")
                return fail(`Not a valid decorator for '${key}', got: ${decorator}`)

            const resultDescriptor = decorator!(target, key, descriptor, applyToInstance)
            if (
                resultDescriptor // otherwise, assume already applied, due to `applyToInstance`
            )
                Object.defineProperty(target, key, resultDescriptor)
        }
    } finally {
        endBatch()
    }
    return target as any
}
