import {
    createAction,
    executeAction,
    Annotation,
    storeAnnotation,
    die,
    isFunction,
    isStringish,
    createDecoratorAnnotation,
    createActionAnnotation
} from "../internal"

export const ACTION = "action"
/*
TODO delete
export const ACTION_BOUND = "action.bound"
export const AUTOACTION = "autoAction"
export const AUTOACTION_BOUND = "autoAction.bound"
*/
const DEFAULT_ACTION_NAME = "<unnamed action>"

const actionAnnotation = createActionAnnotation("action")
const actionBoundAnnotation = createActionAnnotation("action.bound", {
    bound: true
})
const autoActionAnnotation = createActionAnnotation("autoAction", {
    autoAction: true
})
const autoActionBoundAnnotation = createActionAnnotation("autoAction.bound", {
    autoAction: true,
    bound: true
})

export interface IActionFactory extends Annotation, PropertyDecorator {
    // nameless actions
    <T extends Function>(fn: T): T
    // named actions
    <T extends Function>(name: string, fn: T): T

    // named decorator
    (customName: string): PropertyDecorator & Annotation

    // decorator (name no longer supported)
    bound: Annotation & PropertyDecorator
}

function createActionFactory(autoAction: boolean): IActionFactory {
    const res: IActionFactory = function action(arg1, arg2?): any {
        // action(fn() {})
        if (isFunction(arg1))
            return createAction(arg1.name || DEFAULT_ACTION_NAME, arg1, autoAction)
        // action("name", fn() {})
        if (isFunction(arg2)) return createAction(arg1, arg2, autoAction)
        // @action
        if (isStringish(arg2)) {
            return storeAnnotation(arg1, arg2, actionAnnotation)
        }
        // action("name") & @action("name")
        if (isStringish(arg1)) {
            // TODO types
            return createDecoratorAnnotation(
                (createActionAnnotation("action", { name: arg1 }) as unknown) as Annotation
            )
        }

        if (__DEV__) die("Invalid arguments for `action`")
    } as IActionFactory
    return res
}

export const action: IActionFactory = createActionFactory(false)
Object.assign(action, actionAnnotation)
export const autoAction: IActionFactory = createActionFactory(true)
Object.assign(autoAction, autoActionAnnotation)

action.bound = createDecoratorAnnotation(actionBoundAnnotation)
autoAction.bound = createDecoratorAnnotation(autoActionBoundAnnotation)

export function runInAction<T>(fn: () => T): T {
    return executeAction(fn.name || DEFAULT_ACTION_NAME, false, fn, this, undefined)
}

export function isAction(thing: any) {
    return isFunction(thing) && thing.isMobxAction === true
}
