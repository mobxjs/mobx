import {
    createAction,
    executeAction,
    Annotation,
    die,
    isFunction,
    isStringish,
    createActionAnnotation,
    decorateAction20223_
} from "../internal"
import { createDecoratorAnnotation, type DecoratorAnnotation } from "./decoratorannotation"
import type { ClassMethodAndFieldDecorator } from "../types/decorator_fills"

export const ACTION = "action"
export const ACTION_BOUND = "action.bound"
export const AUTOACTION = "autoAction"
export const AUTOACTION_BOUND = "autoAction.bound"

const DEFAULT_ACTION_NAME = "<unnamed action>"

const actionAnnotation = createActionAnnotation(ACTION)
const actionBoundAnnotation = createActionAnnotation(ACTION_BOUND, {
    bound: true
})
const autoActionAnnotation = createActionAnnotation(AUTOACTION, {
    autoAction: true
})
const autoActionBoundAnnotation = createActionAnnotation(AUTOACTION_BOUND, {
    autoAction: true,
    bound: true
})

function createActionDecoratorAnnotation(
    annotation: Annotation
): DecoratorAnnotation<ClassMethodAndFieldDecorator> {
    return createDecoratorAnnotation(annotation, decorateAction20223_)
}

export interface IActionFactory extends Annotation, ClassMethodAndFieldDecorator {
    // nameless actions
    <T extends Function | undefined | null>(fn: T): T
    // named actions
    <T extends Function | undefined | null>(name: string, fn: T): T

    // named annotation
    (customName: string): DecoratorAnnotation<ClassMethodAndFieldDecorator>
}

function createActionFactory(autoAction: boolean): IActionFactory {
    const res: IActionFactory = function action(arg1, arg2?): any {
        if (arg2 && typeof arg2.kind === "string") {
            return decorateAction20223_(
                autoAction ? autoActionAnnotation : actionAnnotation,
                arg1,
                arg2
            )
        }

        // action(fn() {})
        if (isFunction(arg1)) {
            return createAction(arg1.name || DEFAULT_ACTION_NAME, arg1, autoAction)
        }
        // action("name", fn() {})
        if (isFunction(arg2)) {
            return createAction(arg1, arg2, autoAction)
        }
        // action("name") annotation
        if (isStringish(arg1)) {
            return createActionDecoratorAnnotation(
                createActionAnnotation(autoAction ? AUTOACTION : ACTION, {
                    name: arg1,
                    autoAction
                })
            )
        }

        if (__DEV__) {
            die("Invalid arguments for `action`")
        }
    } as IActionFactory
    return res
}

export const action: IActionFactory = createActionFactory(false)
Object.assign(action, actionAnnotation)
export const autoAction: IActionFactory = createActionFactory(true)
Object.assign(autoAction, autoActionAnnotation)

export const actionBound = createActionDecoratorAnnotation(actionBoundAnnotation)
export const autoActionBound = createActionDecoratorAnnotation(autoActionBoundAnnotation)

export function runInAction<T>(fn: () => T): T {
    return executeAction(fn.name || DEFAULT_ACTION_NAME, false, fn, this, undefined)
}

export function isAction(thing: any) {
    return isFunction(thing) && thing.isMobxAction === true
}
