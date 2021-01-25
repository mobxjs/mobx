import {
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
export const AUTOACTION = "autoAction"
export const AUTOACTION_BOUND = "autoAction.bound"

const ACTION_UNNAMED = "<unnamed action>"

export interface IActionFactory extends Annotation, PropertyDecorator {
    // nameless actions
    <T extends Function | undefined | null>(fn: T): T
    // named actions
    <T extends Function | undefined | null>(name: string, fn: T): T

    // named decorator
    (customName: string): PropertyDecorator & Annotation

    // (named?) decorator
    bound: IBoundActionFactory
}

interface IBoundActionFactory extends Annotation, PropertyDecorator {
    (name: string): Annotation & PropertyDecorator
}

function createActionFactory(
    autoAction: boolean,
    annotation: Annotation["annotationType_"]
): IActionFactory {
    const res: IActionFactory = function action(arg1, arg2?): any {
        // action(fn() {})
        if (isFunction(arg1)) return createAction(arg1.name || ACTION_UNNAMED, arg1, autoAction)
        // action("name", fn() {})
        if (isFunction(arg2)) return createAction(arg1, arg2, autoAction)
        // @action
        if (isStringish(arg2)) {
            return storeDecorator(arg1, arg2, annotation)
        }
        // Annation: action("name") & @action("name")
        if (isStringish(arg1)) {
            return createDecoratorAndAnnotation(annotation, arg1)
        }

        if (__DEV__) die("Invalid arguments for `action`")
    } as any
    res.annotationType_ = annotation
    return res
}

export const action: IActionFactory = createActionFactory(false, ACTION)
export const autoAction: IActionFactory = createActionFactory(true, AUTOACTION)

action.bound = createDecorator<string>(ACTION_BOUND)
autoAction.bound = createDecorator<string>(AUTOACTION_BOUND)

export function runInAction<T>(fn: () => T): T {
    return executeAction(fn.name || ACTION_UNNAMED, false, fn, this, undefined)
}

export function isAction(thing: any) {
    return isFunction(thing) && thing.isMobxAction === true
}
