import {
    addHiddenProp,
    createAction,
    executeAction,
    Annotation,
    createDecorator,
    createDecoratorAndAnnotation,
    storeDecorator,
    die,
    isFunction,
    isStringish
} from "../internal"

export const ACTION = "action"
export const ACTION_BOUND = "action.bound"
const ACTION_UNNAMED = "<unnamed action>"

export interface IActionFactory extends Annotation, PropertyDecorator {
    // nameless actions
    <T extends Function>(fn: T): T
    // named actions
    <T extends Function>(name: string, fn: T): T

    // named decorator
    (customName: string): PropertyDecorator & Annotation

    // (named?) decorator
    bound: IBoundActionFactory
}

interface IBoundActionFactory extends Annotation, PropertyDecorator {
    (name: string): Annotation & PropertyDecorator
}

export const action: IActionFactory = function action(arg1, arg2?): any {
    // action(fn() {})
    if (isFunction(arg1)) return createAction(arg1.name || ACTION_UNNAMED, arg1)
    // action("name", fn() {})
    if (isFunction(arg2)) return createAction(arg1, arg2)
    // @action
    if (isStringish(arg2)) {
        return storeDecorator(arg1, arg2, ACTION)
    }
    // Annation: action("name") & @action("name")
    if (isStringish(arg1)) {
        return createDecoratorAndAnnotation(ACTION, arg1)
    }

    if (__DEV__) die("Invalid arguments for `action`")
} as any
action.annotationType = ACTION

action.bound = createDecorator<string>(ACTION_BOUND)

export function runInAction<T>(fn: () => T): T {
    return executeAction(fn.name || ACTION_UNNAMED, fn, this, undefined)
}

export function isAction(thing: any) {
    return isFunction(thing) && thing.isMobxAction === true
}

export function defineBoundAction(target: any, propertyName: string, fn: Function) {
    addHiddenProp(target, propertyName, createAction(propertyName, fn.bind(target)))
}
