import { EMPTY_ARRAY, addHiddenProp, fail } from "../internal"

export const mobxDidRunLazyInitializersSymbol = Symbol("mobx did run lazy initializers")
export const mobxPendingDecorators = Symbol("mobx pending decorators")

type DecoratorTarget = {
    [mobxDidRunLazyInitializersSymbol]?: boolean
    [mobxPendingDecorators]?: { [prop: string]: DecoratorInvocationDescription }
}

export type BabelDescriptor = PropertyDescriptor & { initializer?: () => any }

export type PropertyCreator = (
    instance: any,
    propertyName: string,
    descriptor: BabelDescriptor | undefined,
    decoratorTarget: any,
    decoratorArgs: any[]
) => void

type DecoratorInvocationDescription = {
    prop: string
    propertyCreator: PropertyCreator
    descriptor: BabelDescriptor | undefined
    decoratorTarget: any
    decoratorArguments: any[]
}

export type Stage2Decorator = {
    kind: "field" | "method" | "class"
    key: string
    placement: "static" | "prototype" | "own"
    descriptor: PropertyDescriptor
    initializer?: () => any
    finisher?: (klass) => void
}

const enumerableDescriptorCache: { [prop: string]: PropertyDescriptor } = {}
const nonEnumerableDescriptorCache: { [prop: string]: PropertyDescriptor } = {}

function createPropertyInitializerDescriptor(
    prop: string,
    enumerable: boolean
): PropertyDescriptor {
    const cache = enumerable ? enumerableDescriptorCache : nonEnumerableDescriptorCache
    return (
        cache[prop] ||
        (cache[prop] = {
            configurable: true,
            enumerable: enumerable,
            get() {
                initializeInstance(this)
                return this[prop]
            },
            set(value) {
                initializeInstance(this)
                this[prop] = value
            }
        })
    )
}

export function initializeInstance(target: any)
export function initializeInstance(target: DecoratorTarget) {
    if (target[mobxDidRunLazyInitializersSymbol] === true) return
    const decorators = target[mobxPendingDecorators]
    if (decorators) {
        addHiddenProp(target, mobxDidRunLazyInitializersSymbol, true)
        for (let key in decorators) {
            const d = decorators[key]
            d.propertyCreator(target, d.prop, d.descriptor, d.decoratorTarget, d.decoratorArguments)
        }
    }
}

export function createPropDecorator(
    propertyInitiallyEnumerable: boolean,
    propertyCreator: PropertyCreator
) {
    return function decoratorFactory() {
        let decoratorArguments: any[]

        const decorator = function decorate(
            target: DecoratorTarget,
            prop: string,
            descriptor: BabelDescriptor | undefined,
            applyImmediately?: any
            // This is a special parameter to signal the direct application of a decorator, allow extendObservable to skip the entire type decoration part,
            // as the instance to apply the decorator to equals the target
        ) {
            if (quacksLikeAStage2Decorator(arguments)) {
                const stage2decorator = target as Stage2Decorator
                const key = stage2decorator.key
                return {
                    kind: "method",
                    placement: "own",
                    key,
                    descriptor: {
                        enumerable: propertyInitiallyEnumerable,
                        configurable: true,
                        get() {
                            // TODO: initializeInstance(this)
                            propertyCreator(
                                this,
                                key,
                                stage2decorator.descriptor,
                                this,
                                decoratorArguments
                            )
                            if (stage2decorator.initializer)
                                this[key] = stage2decorator.initializer.call(this)
                            return this[key]
                        },
                        set(v) {
                            // TODO: initializeInstance(this)
                            propertyCreator(
                                this,
                                key,
                                stage2decorator.descriptor,
                                this,
                                decoratorArguments
                            )
                            this[key] = v
                        }
                    }
                }
            }

            if (applyImmediately === true) {
                propertyCreator(target, prop, descriptor, target, decoratorArguments)
                return null
            }
            if (process.env.NODE_ENV !== "production" && !quacksLikeADecorator(arguments))
                fail("This function is a decorator, but it wasn't invoked like a decorator")
            if (!Object.prototype.hasOwnProperty.call(target, mobxPendingDecorators)) {
                const inheritedDecorators = target[mobxPendingDecorators]
                addHiddenProp(target, mobxPendingDecorators, { ...inheritedDecorators })
            }
            target[mobxPendingDecorators]![prop] = {
                prop,
                propertyCreator,
                descriptor,
                decoratorTarget: target,
                decoratorArguments
            }
            return createPropertyInitializerDescriptor(prop, propertyInitiallyEnumerable)
        }

        if (quacksLikeADecorator(arguments) || quacksLikeAStage2Decorator(arguments)) {
            // @decorator
            decoratorArguments = EMPTY_ARRAY
            return decorator.apply(null, arguments)
        } else {
            // @decorator(args)
            decoratorArguments = Array.prototype.slice.call(arguments)
            return decorator
        }
    } as Function
}

export function quacksLikeADecorator(args: IArguments): boolean {
    return (
        ((args.length === 2 || args.length === 3) && typeof args[1] === "string") ||
        (args.length === 4 && args[3] === true)
    )
}

export function quacksLikeAStage2Decorator(args: IArguments): boolean {
    return args.length === 1 && args[0] && (args[0].kind === "field" || args[0].kind === "method")
}