import { invariant, fail, addHiddenProp } from "../utils/utils"
import { createAction, executeAction, IAction } from "../core/action"
import { namedActionDecorator, boundActionDecorator } from "./actiondecorator"

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

    // @action.bound decorator
    bound(target: Object, propertyKey: string, descriptor?: PropertyDescriptor): void
}

export var action: IActionFactory = function action(arg1, arg2?, arg3?, arg4?): any {
    // action(fn() {})
    if (arguments.length === 1 && typeof arg1 === "function")
        return createAction(arg1.name || "<unnamed action>", arg1)
    // action("name", fn() {})
    if (arguments.length === 2 && typeof arg2 === "function") return createAction(arg1, arg2)

    // @action("name") fn() {}
    if (arguments.length === 1 && typeof arg1 === "string") return namedActionDecorator(arg1)

    // @action fn() {}
    if (arg4 === true) {
        // apply to instance immediately
        arg1[arg2] = createAction(arg1.name || arg2, arg3.value)
    } else {
        return namedActionDecorator(arg2).apply(null, arguments)
    }
} as any

action.bound = boundActionDecorator as any

export function runInAction<T>(block: () => T): T
export function runInAction<T>(name: string, block: () => T): T
export function runInAction(arg1, arg2?) {
    // TODO: deprecate?
    const actionName = typeof arg1 === "string" ? arg1 : arg1.name || "<unnamed action>"
    const fn = typeof arg1 === "function" ? arg1 : arg2

    if (process.env.NODE_ENV !== "production") {
        invariant(
            typeof fn === "function" && fn.length === 0,
            "`runInAction` expects a function without arguments"
        )
        if (typeof actionName !== "string" || !actionName)
            fail(`actions should have valid names, got: '${actionName}'`)
    }

    return executeAction(actionName, fn, this, undefined)
}

export function isAction(thing: any) {
    return typeof thing === "function" && thing.isMobxAction === true
}

export function defineBoundAction(target: any, propertyName: string, fn: Function) {
    addHiddenProp(target, propertyName, createAction(propertyName, fn.bind(target)))
}
