import {
    ComputedValue,
    IComputedValueOptions,
    invariant,
    Annotation,
    storeDecorator,
    createDecoratorAndAnnotation
} from "../internal"

export interface IComputedFactory extends Annotation, PropertyDecorator {
    <T>(options: IComputedValueOptions<T>): Annotation & PropertyDecorator

    <T>(func: () => T, setter: (v: T) => void): ComputedValue<T> // TODO: does this overload actually exist?
    <T>(func: () => T, options?: IComputedValueOptions<T>): ComputedValue<T>

    struct: Annotation & PropertyDecorator
}

/**
 * Decorator for class properties: @computed get value() { return expr; }.
 * For legacy purposes also invokable as ES5 observable created: `computed(() => expr)`;
 */
export const computed: IComputedFactory = function computed(arg1, arg2, arg3) {
    if (typeof arg2 === "string") {
        // @computed
        return storeDecorator(arg1, arg2, "computed")
    }
    if (arg1 !== null && typeof arg1 === "object" && arguments.length === 1) {
        // @computed({ options })
        return createDecoratorAndAnnotation("computed", arg1)
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
computed.annotationType = "computed"

computed.struct = Object.assign(
    function(target, property) {
        storeDecorator(target, property, "computed.struct")
    },
    {
        annotationType: "computed.struct" as const
    }
)
