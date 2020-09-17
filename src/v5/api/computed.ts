import {
    ComputedValue,
    IComputedValue,
    IComputedValueOptions,
    asObservableObject,
    comparer,
    createPropDecorator,
    invariant,
    stringifyKey
} from "../internal"

export interface IComputed {
    <T>(options: IComputedValueOptions<T>): any // decorator
    <T>(func: () => T, setter: (v: T) => void): IComputedValue<T> // normal usage
    <T>(func: () => T, options?: IComputedValueOptions<T>): IComputedValue<T> // normal usage
    (target: Object, key: string | symbol, baseDescriptor?: PropertyDescriptor): void // decorator
    struct: (target: Object, key: string | symbol, baseDescriptor?: PropertyDescriptor) => void // decorator
}

export const computedDecorator = createPropDecorator(
    false,
    (
        instance: any,
        propertyName: PropertyKey,
        descriptor: any,
        decoratorTarget: any,
        decoratorArgs: any[]
    ) => {
        if (process.env.NODE_ENV !== "production") {
            invariant(
                descriptor && descriptor.get,
                `Trying to declare a computed value for unspecified getter '${stringifyKey(
                    propertyName
                )}'`
            )
        }
        const { get, set } = descriptor // initialValue is the descriptor for get / set props
        // Optimization: faster on decorator target or instance? Assuming target
        // Optimization: find out if declaring on instance isn't just faster. (also makes the property descriptor simpler). But, more memory usage..
        // Forcing instance now, fixes hot reloadig issues on React Native:
        const options = decoratorArgs[0] || {}
        asObservableObject(instance).addComputedProp(instance, propertyName, {
            get,
            set,
            context: instance,
            ...options
        })
    }
)

const computedStructDecorator = computedDecorator({ equals: comparer.structural })

/**
 * Decorator for class properties: @computed get value() { return expr; }.
 * For legacy purposes also invokable as ES5 observable created: `computed(() => expr)`;
 */
export const computed: IComputed = function computed(arg1, arg2, arg3) {
    if (typeof arg2 === "string") {
        // @computed
        return computedDecorator.apply(null, arguments)
    }
    if (arg1 !== null && typeof arg1 === "object" && arguments.length === 1) {
        // @computed({ options })
        return computedDecorator.apply(null, arguments)
    }

    // computed(expr, options?)
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
