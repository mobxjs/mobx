import { invariant, addHiddenProp } from "../utils/utils"
import { createClassPropertyDecorator } from "../utils/decorators"
import { createAction, executeAction, IAction } from "../core/action"
import { getMessage } from "../utils/messages"

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

    // .bound
    bound<A1, R, T extends (a1: A1) => R>(fn: T): T & IAction
    bound<A1, A2, R, T extends (a1: A1, a2: A2) => R>(fn: T): T & IAction
    bound<A1, A2, A3, R, T extends (a1: A1, a2: A2, a3: A3) => R>(fn: T): T & IAction
    bound<A1, A2, A3, A4, R, T extends (a1: A1, a2: A2, a3: A3, a4: A4) => R>(fn: T): T & IAction
    bound<A1, A2, A3, A4, A5, R, T extends (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => R>(
        fn: T
    ): T & IAction
    bound<A1, A2, A3, A4, A5, A6, R, T extends (a1: A1, a2: A2, a3: A3, a4: A4, a6: A6) => R>(
        fn: T
    ): T & IAction

    // generic forms
    bound<T extends Function>(fn: T): T & IAction
    bound<T extends Function>(name: string, fn: T): T & IAction

    // .bound decorator
    bound(target: Object, propertyKey: string, descriptor?: PropertyDescriptor): void
}

const actionFieldDecorator = createClassPropertyDecorator(
    function(target, key, value, args, originalDescriptor) {
        const actionName =
            args && args.length === 1 ? args[0] : value.name || key || "<unnamed action>"
        const wrappedAction = action(actionName, value)
        addHiddenProp(target, key, wrappedAction)
    },
    function(key) {
        return this[key]
    },
    function() {
        invariant(false, getMessage("m001"))
    },
    false,
    true
)

const boundActionDecorator = createClassPropertyDecorator(
    function(target, key, value) {
        defineBoundAction(target, key, value)
    },
    function(key) {
        return this[key]
    },
    function() {
        invariant(false, getMessage("m001"))
    },
    false,
    false
)

export var action: IActionFactory = function action(arg1, arg2?, arg3?, arg4?): any {
    if (arguments.length === 1 && typeof arg1 === "function")
        return createAction(arg1.name || "<unnamed action>", arg1)
    if (arguments.length === 2 && typeof arg2 === "function") return createAction(arg1, arg2)

    if (arguments.length === 1 && typeof arg1 === "string") return namedActionDecorator(arg1)

    return namedActionDecorator(arg2).apply(null, arguments)
} as any

action.bound = function boundAction(arg1, arg2?, arg3?) {
    if (typeof arg1 === "function") {
        const action = createAction("<not yet bound action>", arg1)
        ;(action as any).autoBind = true
        return action
    }

    return boundActionDecorator.apply(null, arguments)
}

function namedActionDecorator(name: string) {
    return function(target, prop, descriptor) {
        if (descriptor && typeof descriptor.value === "function") {
            // TypeScript @action method() { }. Defined on proto before being decorated
            // Don't use the field decorator if we are just decorating a method
            descriptor.value = createAction(name, descriptor.value)
            descriptor.enumerable = false
            descriptor.configurable = true
            return descriptor
        }
        // bound instance methods
        return actionFieldDecorator(name).apply(this, arguments)
    }
}

export function runInAction<T>(block: () => T, scope?: any): T
export function runInAction<T>(name: string, block: () => T, scope?: any): T
export function runInAction<T>(arg1, arg2?, arg3?) {
    const actionName = typeof arg1 === "string" ? arg1 : arg1.name || "<unnamed action>"
    const fn = typeof arg1 === "function" ? arg1 : arg2
    const scope = typeof arg1 === "function" ? arg2 : arg3

    invariant(typeof fn === "function", getMessage("m002"))
    invariant(fn.length === 0, getMessage("m003"))
    invariant(
        typeof actionName === "string" && actionName.length > 0,
        `actions should have valid names, got: '${actionName}'`
    )

    return executeAction(actionName, fn, scope, undefined)
}

export function isAction(thing: any) {
    return typeof thing === "function" && thing.isMobxAction === true
}

export function defineBoundAction(target: any, propertyName: string, fn: Function) {
    const res = function() {
        return executeAction(propertyName, fn, target, arguments)
    }
    ;(res as any).isMobxAction = true
    addHiddenProp(target, propertyName, res)
}
