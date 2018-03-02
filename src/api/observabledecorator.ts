import { defineObservableProperty } from "../types/observableobject"
import { fail } from "../utils/utils"
import { IEnhancer } from "../types/modifiers"
import { createPropDecorator, BabelDescriptor } from "../utils/decorators2"

export function createDecoratorForEnhancer(enhancer: IEnhancer<any>) {
    const decorator = createPropDecorator(
        true,
        (
            target: any,
            propertyName: string,
            descriptor: BabelDescriptor,
            _decoratorTarget,
            decoratorArgs: any[]
        ) => {
            const initialValue = descriptor
                ? descriptor.initializer ? descriptor.initializer.call(target) : descriptor.value
                : undefined
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
