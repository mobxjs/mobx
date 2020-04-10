import {
    addHiddenProp,
    createAction,
    executeAction,
    fail,
    invariant,
    Annotation,
    createDecorator,
    createDecoratorAndAnnotation,
    storeDecorator
} from "../internal"

export interface IActionFactory extends Annotation, PropertyDecorator {
    // nameless actions
    <T extends Function>(fn: T): T
    // named actions
    <T extends Function>(name: string, fn: T): T

    // named
    (customName: string): PropertyDecorator & Annotation

    bound: IBoundActionFactory
}

interface IBoundActionFactory extends Annotation, PropertyDecorator {
    (name: string): Annotation & PropertyDecorator
}

export const action: IActionFactory = function action(arg1, arg2?, arg3?): any {
    // action(fn() {})
    if (arguments.length === 1 && typeof arg1 === "function")
        return createAction(arg1.name || "<unnamed action>", arg1)
    // action("name", fn() {})
    if (arguments.length === 2 && typeof arg2 === "function") return createAction(arg1, arg2)

    // @action
    if (arguments.length >= 2 && (typeof arg2 === "string" || typeof arg2 === "symbol")) {
        return storeDecorator(arg1, arg2, "action")
    }

    // Annation: action("name") & @action("name")
    if (arguments.length === 1 && typeof arg1 === "string") {
        return createDecoratorAndAnnotation("action", arg1)
    }

    fail("Invalid arguments to action")
} as any
action.annotationType = "action"

action.bound = createDecorator<string>("action.bound")

export function runInAction<T>(block: () => T): T
export function runInAction<T>(name: string, block: () => T): T
export function runInAction(arg1, arg2?) {
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
