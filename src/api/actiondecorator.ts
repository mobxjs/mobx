import {
    BabelDescriptor,
    action,
    addHiddenProp,
    createAction,
    defineBoundAction,
    fail,
    $mobx
} from "../internal"
import { isObservableObject } from "../types/observableobject"

function dontReassignFields() {
    fail(process.env.NODE_ENV !== "production" && "@action fields are not reassignable")
}

export function namedActionDecorator(name: string) {
    return function(target, prop, descriptor: BabelDescriptor) {
        if (descriptor) {
            if (process.env.NODE_ENV !== "production" && descriptor.get !== undefined) {
                return fail("@action cannot be used with getters")
            }
            // babel / typescript
            // @action method() { }
            if (descriptor.value) {
                // typescript
                return {
                    value: createAction(name, descriptor.value),
                    enumerable: false,
                    configurable: true, // See #1477
                    writable: true // for typescript, this must be writable, otherwise it cannot inherit :/ (see inheritable actions test)
                }
            }
            // babel only: @action method = () => {}
            const { initializer } = descriptor
            return {
                enumerable: false,
                configurable: true, // See #1477
                writable: true, // See #1398
                initializer() {
                    // N.B: we can't immediately invoke initializer; this would be wrong
                    return createAction(name, initializer!.call(this))
                }
            }
        }
        // bound instance methods
        return actionFieldDecorator(name).apply(this, arguments)
    }
}

export function actionFieldDecorator(name: string) {
    // Simple property that writes on first invocation to the current instance
    return function(target, prop, descriptor) {
        Object.defineProperty(target, prop, {
            configurable: true,
            enumerable: false,
            get() {
                return undefined
            },
            set(value) {
                addHiddenProp(this, prop, action(name, value))
            }
        })
    }
}

export function boundActionDecorator(target, propertyName, descriptor, applyToInstance?: boolean) {
    if (descriptor) {
        // if (descriptor.value)
        // Typescript / Babel: @action.bound method() { }
        // also: babel @action.bound method = () => {}
        return {
            configurable: true,
            enumerable: false,
            get() {
                const self = isObservableObject(this) ? this[$mobx].proxy || this : this
                defineBoundAction(
                    self,
                    propertyName,
                    descriptor.value || descriptor.initializer.call(self)
                )
                return this[propertyName]
            },
            set: dontReassignFields
        }
    }
    // field decorator Typescript @action.bound method = () => {}
    return {
        enumerable: false,
        configurable: true,
        set(v) {
            defineBoundAction(this, propertyName, v)
        },
        get() {
            return undefined
        }
    }
}
