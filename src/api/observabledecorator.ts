import { asObservableObject } from "../types/observableobject"
import { fail } from "../utils/utils"
import { IEnhancer } from "../types/modifiers"
import { createPropDecorator, BabelDescriptor } from "../utils/decorators2"

export type IObservableDecorator = {
    (target: Object, property: string, descriptor?: PropertyDescriptor): void
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
            const initialValue = descriptor
                ? descriptor.initializer ? descriptor.initializer.call(target) : descriptor.value
                : undefined
            asObservableObject(target).addObservableProp(propertyName, initialValue, enhancer)
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
