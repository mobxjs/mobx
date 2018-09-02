import { defineObservableProperty } from "../types/observableobject"
import { fail, invariant } from "../utils/utils"
import { IEnhancer } from "../types/modifiers"
import { createPropDecorator, BabelDescriptor } from "../utils/decorators2"

export type IObservableDecorator = {
    (target: Object, property: string | symbol, descriptor?: PropertyDescriptor): void
    enhancer: IEnhancer<any>
}

export function createDecoratorForEnhancer(enhancer: IEnhancer<any>): IObservableDecorator {
    const decorator = createPropDecorator(
        true,
        (
            target: any,
            propertyName: string,
            descriptor: BabelDescriptor,
            _decoratorTarget,
            decoratorArgs: any[]
        ) => {
            if (process.env.NODE_ENV !== "production") {
                invariant(
                    !descriptor || !descriptor.get,
                    `@observable cannot be used on getter (property "${propertyName}"), use @computed instead.`
                )
            }
            const initialValue = descriptor
                ? descriptor.initializer ? descriptor.initializer.call(target) : descriptor.value
                : undefined
            defineObservableProperty(target, propertyName, initialValue, enhancer)
        }
    )
    const res: any =
        // Extra process checks, as this happens during module initialization
        typeof process !== "undefined" && process.env && process.env.NODE_ENV !== "production"
            ? function observableDecorator() {
                  // This wrapper function is just to detect illegal decorator invocations, deprecate in a next version
                  // and simply return the created prop decorator
                  if (arguments.length < 2)
                      return fail(
                          "Incorrect decorator invocation. @observable decorator doesn't expect any arguments"
                      )
                  return decorator.apply(null, arguments)
              }
            : decorator
    res.enhancer = enhancer
    return res
}
