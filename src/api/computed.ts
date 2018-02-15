import { IEqualsComparer, comparer } from "../types/comparer"
import { asObservableObject, defineComputedProperty } from "../types/observableobject"
import { invariant } from "../utils/utils"
import { createClassPropertyDecorator } from "../utils/decorators"
import { ComputedValue, IComputedValue } from "../core/computedvalue"

export interface IComputedValueOptions<T> {
    compareStructural?: boolean // TODO: remove in 4.0 in favor of equals
    struct?: boolean // TODO: remove in 4.0 in favor of equals
    equals?: IEqualsComparer<T>
    name?: string
    setter?: (value: T) => void
    context?: any
}

export interface IComputed {
    <T>(func: () => T, setter?: (value: T) => void): IComputedValue<T>
    <T>(func: () => T, options: IComputedValueOptions<T>): IComputedValue<T>
    (target: Object, key: string | symbol, baseDescriptor?: PropertyDescriptor): void
    struct(target: Object, key: string | symbol, baseDescriptor?: PropertyDescriptor): void
    equals(equals: IEqualsComparer<any>): PropertyDecorator
}

function createComputedDecorator(equals: IEqualsComparer<any>) {
    return createClassPropertyDecorator(
        (target, name, _, __, originalDescriptor) => {
            invariant(
                typeof originalDescriptor !== "undefined" &&
                    typeof originalDescriptor.get === "function",
                "@computed can only be used on getter functions like: '@computed get myProps() { return ...; }'."
            )

            const adm = asObservableObject(target, "")
            defineComputedProperty(
                adm,
                name,
                originalDescriptor.get,
                originalDescriptor.set,
                equals,
                false
            )
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

const computedDecorator = createComputedDecorator(comparer.default)
const computedStructDecorator = createComputedDecorator(comparer.structural)

/**
 * Decorator for class properties: @computed get value() { return expr; }.
 * For legacy purposes also invokable as ES5 observable created: `computed(() => expr)`;
 */
export var computed: IComputed = function computed(arg1, arg2, arg3) {
    if (typeof arg2 === "string") {
        return computedDecorator.apply(null, arguments)
    }
    invariant(typeof arg1 === "function", "First argument to `computed` should be an expression.")
    invariant(arguments.length < 3, "Computed takes one or two arguments if used as function")
    const opts: IComputedValueOptions<any> = typeof arg2 === "object" ? arg2 : {}
    opts.setter = typeof arg2 === "function" ? arg2 : opts.setter

    const equals = opts.equals
        ? opts.equals
        : opts.compareStructural || opts.struct ? comparer.structural : comparer.default

    return new ComputedValue(arg1, opts.context, equals, opts.name || arg1.name || "", opts.setter)
} as any

computed.struct = computedStructDecorator
computed.equals = createComputedDecorator
