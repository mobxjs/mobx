import {
    BabelDescriptor,
    action,
    addHiddenProp,
    createAction,
    defineBoundAction,
    fail,
    quacksLikeAStage2Decorator,
    Stage2Decorator
} from "../internal"

function dontReassignFields() {
    fail(process.env.NODE_ENV !== "production" && "@action fields are not reassignable")
}

export function namedActionDecorator(name: string) {
    return function(target, prop, descriptor: BabelDescriptor) {
        if (quacksLikeAStage2Decorator(arguments)) {
            const decorator = target as Stage2Decorator
            // @action.bound method() {}
            if (decorator.kind === "method") {
                const { descriptor } = decorator
                if (process.env.NODE_ENV !== "production" && descriptor.get !== undefined) {
                    return fail("@action cannot be used with getters")
                }
                return {
                    ...decorator,
                    placement: "prototype",
                    descriptor: {
                        ...descriptor,
                        value: createAction(name, descriptor.value)
                    }
                }
            } else {
                // @action.bound method = () => {}
                // kind = field
                return {
                    ...decorator,
                    initializer() {
                        return createAction(name, decorator.initializer.call(this))
                    }
                }
            }
        }
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
    if (applyToInstance === true) {
        defineBoundAction(target, propertyName, descriptor.value)
        return null
    }
    if (quacksLikeAStage2Decorator(arguments)) {
        // @action.bound method() and // @action.bound method = () => {}
        const decorator = target as Stage2Decorator
        return {
            kind: "field",
            placement: "own",
            key: decorator.key,
            descriptor: {
                configurable: true,
                enumerable: false,
                writable: true
            },
            initializer() {
                const fn = decorator.initializer
                    ? decorator.initializer.call(this)
                    : decorator.descriptor.value
                return createAction(decorator.key, fn.bind(this))
            }
        }
    }
    if (descriptor) {
        // if (descriptor.value)
        // Typescript / Babel: @action.bound method() { }
        // also: babel @action.bound method = () => {}
        return {
            configurable: true,
            enumerable: false,
            get() {
                defineBoundAction(
                    this,
                    propertyName,
                    descriptor.value || descriptor.initializer.call(this)
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
