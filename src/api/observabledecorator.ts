import { defineObservableProperty } from "../types/observableobject"
import { fail } from "../utils/utils"
import { IEnhancer } from "../types/modifiers"
import { createPropDecorator } from "../utils/decorators2"

export function createDecoratorForEnhancer(enhancer: IEnhancer<any>) {
    const decorator = createPropDecorator(
        (target: any, propertyName: string, initialValue: any, decoratorArgs: any[]) => {
            defineObservableProperty(target, propertyName, initialValue, enhancer)
        }
    )
    return function observableDecorator() {
        // This wrapper function is just to detect illegal decorator invocations, deprecate in a next version
        // and simply return the created prop decorator
        if (process.env.NODE_ENV !== "production" && arguments.length < 2)
            return fail(
                "Incorrect decorator invocation. @observable decorator doesn't expect any arguments"
            )
        return decorator.apply(null, arguments)
    }
}
