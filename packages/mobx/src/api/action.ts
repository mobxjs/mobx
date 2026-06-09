import {
    createAction,
    executeAction,
    Annotation,
    die,
    isFunction,
    isStringish,
    createActionAnnotation,
    decorateAction20223_,
    assign
} from "../internal"
import type { ClassFieldDecorator, ClassMethodDecorator } from "../types/decorator_fills"

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

type ActionStage3Decorator = ClassMethodDecorator & ClassFieldDecorator

interface IActionDecoratorAnnotation extends Annotation, ActionStage3Decorator {}

function createActionDecoratorAnnotation(annotation: Annotation): IActionDecoratorAnnotation {
    return assign(function actionDecorator(value, context) {
        if (context && typeof context.kind === "string") {
            return decorateAction20223_(annotation, value, context)
        }
        if (__DEV__) {
            die(`Invalid arguments for \`${annotation.annotationType_}\``)
        }
        return undefined
    }, annotation) as any
}

export interface IActionFactory extends Annotation, ActionStage3Decorator {
    // nameless actions
    <T extends Function | undefined | null>(fn: T): T
    // named actions
    <T extends Function | undefined | null>(name: string, fn: T): T

    // named annotation
    (customName: string): IActionDecoratorAnnotation

    bound: IActionDecoratorAnnotation
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

action.bound = createActionDecoratorAnnotation(actionBoundAnnotation)
autoAction.bound = createActionDecoratorAnnotation(autoActionBoundAnnotation)

export function runInAction<T>(fn: () => T): T {
    return executeAction(fn.name || DEFAULT_ACTION_NAME, false, fn, this, undefined)
}

export function isAction(thing: any) {
    return isFunction(thing) && thing.isMobxAction === true
}
