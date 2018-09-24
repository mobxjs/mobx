import {
    ComputedValue,
    IComputedValue,
    IComputedValueOptions,
    asObservableObject,
    comparer,
    createPropDecorator,
    invariant,
    quacksLikeAStage2Decorator,
    Stage2Decorator,
    EMPTY_OBJECT
} from "../internal"

export interface IComputed {
    <T>(options: IComputedValueOptions<T>): any // decorator
    <T>(func: () => T, setter: (v: T) => void): IComputedValue<T> // normal usage
    <T>(func: () => T, options?: IComputedValueOptions<T>): IComputedValue<T> // normal usage
    (target: Object, key: string | symbol, baseDescriptor?: PropertyDescriptor): void // decorator
    struct(target: Object, key: string | symbol, baseDescriptor?: PropertyDescriptor): void // decorator
}

const legacyComputedDecorator = createPropDecorator(
    false,
    (
        instance: any,
        propertyName: string,
        descriptor: any,
        decoratorTarget: any,
        decoratorArgs: any[]
    ) => {
        const { get, set } = descriptor // initialValue is the descriptor for get / set props
        // Optimization: faster on decorator target or instance? Assuming target
        // Optimization: find out if declaring on instance isn't just faster. (also makes the property descriptor simpler). But, more memory usage..
        const options = decoratorArgs[0] || EMPTY_OBJECT
        asObservableObject(instance).addComputedProp(decoratorTarget, propertyName, {
            get,
            set,
            context: instance,
            ...options
        })
    }
)

export const computedDecorator = function computedDecorator(arg1) {
    if (arguments.length > 1) return legacyComputedDecorator.apply(null, arguments)
    if (quacksLikeAStage2Decorator(arguments)) {
        return stage2ComputedDecorator(EMPTY_OBJECT, arg1)
    }
    return function() {
        if (quacksLikeAStage2Decorator(arguments))
            return stage2ComputedDecorator(arg1, arguments[0])
        else return legacyComputedDecorator(arg1).apply(null, arguments)
    }
}

const computedStructDecorator = computedDecorator({ equals: comparer.structural })

/**
 * Decorator for class properties: @computed get value() { return expr; }.
 * For legacy purposes also invokable as ES5 observable created: `computed(() => expr)`;
 */
export var computed: IComputed = function computed(arg1, arg2, arg3) {
    if (typeof arg2 === "string") {
        // @computed
        return legacyComputedDecorator.apply(null, arguments)
    }
    if (arguments.length === 1 && typeof arg1 === "object") {
        // @computed({ options })
        // @computed get() {}  /* stage 2 only *?
        return computedDecorator(arg1)
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

function stage2ComputedDecorator(
    options: IComputedValueOptions<any>,
    elementDescriptor: Stage2Decorator
): Stage2Decorator {
    const { key, descriptor } = elementDescriptor
    const { get, set } = descriptor
    return {
        key,
        kind: "method",
        placement: "prototype",
        descriptor: {
            enumerable: false,
            configurable: true,
            get() {
                asObservableObject(this).addComputedProp(this, key, {
                    get,
                    set,
                    context: this,
                    ...options
                })
                return this[key]
            },
            set(v) {
                asObservableObject(this).addComputedProp(this, key, {
                    get,
                    set,
                    context: this,
                    ...options
                })
                this[key] = v
            }
        }
    }
}

computed.struct = computedStructDecorator
