import { comparer } from "../utils/comparer"
import { IComputedValueOptions } from "../core/computedvalue"
import { asObservableObject, defineComputedProperty } from "../types/observableobject"
import { invariant } from "../utils/utils"
import { createClassPropertyDecorator } from "../utils/decorators"
import { ComputedValue, IComputedValue } from "../core/computedvalue"
import { createPropDecorator } from "../utils/decorators2"

export interface IComputed {
    <T>(options: IComputedValueOptions<T>): any // decorator
    <T>(func: () => T, options?: IComputedValueOptions<T>): IComputedValue<T> // normal usage
    // TODO: restore setter as separate second arg and add unit test for it
    (target: Object, key: string | symbol, baseDescriptor?: PropertyDescriptor): void // decorator
    struct(target: Object, key: string | symbol, baseDescriptor?: PropertyDescriptor): void // decorator
}

// export function createDecoratorForEnhancer(enhancer: IEnhancer<any>) {
//     const decorator = createPropDecorator(
//         (target: any, propertyName: string, initialValue: string, decoratorArgs: any[]) => {
//             defineObservableProperty(target, propertyName, initialValue, enhancer)
//         }
//     )
//     return function observableDecorator() {
//         // This wrapper function is just to detect illegal decorator invocations, deprecate in a next version
//         // and simply return the created prop decorator
//         if (process.env.NODE_ENV !== "production" && arguments.length < 2)
//             return fail(
//                 "Incorrect decorator invocation. @observable decorator doesn't expect any arguments"
//             )
//         return decorator.apply(null, arguments)
//     }
// }

function createComputedDecorator(options: IComputedValueOptions<any>) {
    return createPropDecorator(
        (target: any, propertyName: string, descriptor: any, decoratorArgs: any[]) => {
            const { get, set } = descriptor // initialValue is the descriptor for get / set props
            // TODO: assert a getter
            defineComputedProperty(target, propertyName, { ...options, get, set })
        }
    )

    return createClassPropertyDecorator(
        (target, name, _, __, originalDescriptor) => {
            process.env.NODE_ENV !== "production" &&
                invariant(
                    typeof originalDescriptor !== "undefined" &&
                        typeof originalDescriptor.get === "function",
                    "@computed can only be used on getter functions like: '@computed get myProps() { return ...; }'."
                )

            const { get, set } = originalDescriptor
            defineComputedProperty(target, name, { ...options, get, set })
        },
        function(name) {
            const observable = this.$mobx.values[name]
            if (
                observable === undefined // See #505
            )
                return undefined
            return observable.get()
        },
        function(name, value) {
            this.$mobx.values[name].set(value)
        },
        false,
        false
    )
}

const computedDecorator = createComputedDecorator({})
const computedStructDecorator = createComputedDecorator({ equals: comparer.structural })

/**
 * Decorator for class properties: @computed get value() { return expr; }.
 * For legacy purposes also invokable as ES5 observable created: `computed(() => expr)`;
 */
export var computed: IComputed = function computed(arg1, arg2, arg3) {
    if (typeof arg2 === "string") {
        return computedDecorator.apply(null, arguments)
    }
    if (arg1 !== null && typeof arg1 === "object" && arguments.length === 1) {
        return createComputedDecorator(arg1)
    }

    if (process.env.NODE_ENV !== "production") {
        invariant(
            typeof arg1 === "function",
            "First argument to `computed` should be an expression."
        )
        invariant(arguments.length < 3, "Computed takes one or two arguments if used as function")
    }
    const opts: IComputedValueOptions<any> = typeof arg2 === "object" ? arg2 : {}
    opts.get = arg1
    opts.set = typeof arg2 === "function" ? arg2 : opts.set
    opts.name = opts.name || arg1.name || "" /* for generated name */

    return new ComputedValue(opts)
} as any

computed.struct = computedStructDecorator
