import { invariant, addHiddenProp, fail, addHiddenFinalProp } from "../utils/utils"
import { createAction, executeAction, IAction } from "../core/action"
import { BabelDescriptor } from "../utils/decorators2"

export interface IActionFactory {
    // nameless actions
    <A1, R, T extends (a1: A1) => R>(fn: T): T & IAction
    <A1, A2, R, T extends (a1: A1, a2: A2) => R>(fn: T): T & IAction
    <A1, A2, A3, R, T extends (a1: A1, a2: A2, a3: A3) => R>(fn: T): T & IAction
    <A1, A2, A3, A4, R, T extends (a1: A1, a2: A2, a3: A3, a4: A4) => R>(fn: T): T & IAction
    <A1, A2, A3, A4, A5, R, T extends (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => R>(fn: T): T &
        IAction
    <A1, A2, A3, A4, A5, A6, R, T extends (a1: A1, a2: A2, a3: A3, a4: A4, a6: A6) => R>(fn: T): T &
        IAction

    // named actions
    <A1, R, T extends (a1: A1) => R>(name: string, fn: T): T & IAction
    <A1, A2, R, T extends (a1: A1, a2: A2) => R>(name: string, fn: T): T & IAction
    <A1, A2, A3, R, T extends (a1: A1, a2: A2, a3: A3) => R>(name: string, fn: T): T & IAction
    <A1, A2, A3, A4, R, T extends (a1: A1, a2: A2, a3: A3, a4: A4) => R>(name: string, fn: T): T &
        IAction
    <A1, A2, A3, A4, A5, R, T extends (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => R>(
        name: string,
        fn: T
    ): T & IAction
    <A1, A2, A3, A4, A5, A6, R, T extends (a1: A1, a2: A2, a3: A3, a4: A4, a6: A6) => R>(
        name: string,
        fn: T
    ): T & IAction

    // generic forms
    <T extends Function>(fn: T): T & IAction
    <T extends Function>(name: string, fn: T): T & IAction

    // named decorator
    (customName: string): (target: Object, key: string, baseDescriptor?: PropertyDescriptor) => void

    // unnamed decorator
    (target: Object, propertyKey: string, descriptor?: PropertyDescriptor): void

    // generic forms
    bound<T extends Function>(fn: T): T & IAction
    bound<T extends Function>(name: string, fn: T): T & IAction

    // .bound decorator
    bound(target: Object, propertyKey: string, descriptor?: PropertyDescriptor): void
}

// TODO: move decoators to own file
function actionFieldDecorator(name: string) {
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

function dontReassignFields() {
    invariant(false, process.env.NODE_ENV !== "production" && "@action fields are not reassignable")
}

const boundActionDecorator = function(target, propertyName, descriptor, applyToInstance?: boolean) {
    if (applyToInstance === true) {
        defineBoundAction(target, propertyName, descriptor.value)
        return null
    }
    if (descriptor) {
        if (descriptor.value)
            // Typescript / Babel: @action.bound method() { }
            return {
                configurable: true,
                enumerable: false,
                get() {
                    defineBoundAction(this, propertyName, descriptor.value)
                    return this[propertyName]
                },
                set: dontReassignFields
            }
        // babel
        return {
            configurable: true,
            enumerable: false,
            writeable: false,
            initializer() {
                defineBoundAction(this, propertyName, descriptor.initializer.call(this))
            }
        }
    }
    // field decorator
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

export var action: IActionFactory = function action(arg1, arg2?, arg3?, arg4?): any {
    if (arguments.length === 1 && typeof arg1 === "function")
        return createAction(arg1.name || "<unnamed action>", arg1)
    if (arguments.length === 2 && typeof arg2 === "function") return createAction(arg1, arg2)

    if (arguments.length === 1 && typeof arg1 === "string") return namedActionDecorator(arg1)

    if (arg4 === true) {
        // apply to instance immediately
        arg1[arg2] = createAction(name, arg3.value)
    } else {
        return namedActionDecorator(arg2).apply(null, arguments)
    }
} as any

action.bound = boundActionDecorator as any

function namedActionDecorator(name: string) {
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
                    configurable: false,
                    writable: true // for typescript, this must be writable, otherwise it cannot inherit :/ (see inheritable actions test)
                }
            }
            // babel only: @action method = () => {}
            const { initializer } = descriptor
            return {
                enumerable: false,
                configurable: false,
                writable: false,
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

export function runInAction<T>(block: () => T, scope?: any): T
export function runInAction<T>(name: string, block: () => T, scope?: any): T
export function runInAction(arg1, arg2?, arg3?) {
    const actionName = typeof arg1 === "string" ? arg1 : arg1.name || "<unnamed action>"
    const fn = typeof arg1 === "function" ? arg1 : arg2
    const scope = typeof arg1 === "function" ? arg2 : arg3

    if (process.env.NODE_ENV !== "production") {
        invariant(
            typeof fn === "function" && fn.length === 0,
            "`runInAction` expects a function without arguments"
        )
        if (typeof actionName !== "string" || !actionName)
            fail(`actions should have valid names, got: '${actionName}'`)
    }

    return executeAction(actionName, fn, scope, undefined)
}

export function isAction(thing: any) {
    return typeof thing === "function" && thing.isMobxAction === true
}

export function defineBoundAction(target: any, propertyName: string, fn: Function) {
    addHiddenFinalProp(target, propertyName, createAction(propertyName, fn.bind(target)))
}
