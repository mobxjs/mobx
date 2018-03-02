import { addHiddenProp, fail, EMPTY_ARRAY } from "./utils"

type DecoratorTarget = {
    __mobxDidRunLazyInitializers2?: boolean // TODO: rename
    __mobxDecorators?: { [prop: string]: DecoratorInvocationDescription }
}

export type BabelDescriptor = PropertyDescriptor & { initializer?: () => any }

type PropertyCreator = (
    instance: any,
    propertyName: string,
    descriptor: BabelDescriptor,
    decoratorArgs: any[]
) => void

type DecoratorInvocationDescription = {
    prop: string
    propertyCreator: PropertyCreator
    decoratorArguments: any[]
    descriptor: BabelDescriptor
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

export function initializeInstance(target: DecoratorTarget) {
    if (target.__mobxDidRunLazyInitializers2 === true) return
    addHiddenProp(target, "__mobxDidRunLazyInitializers2", true)
    const decorators = target.__mobxDecorators
    if (decorators)
        for (let key in decorators) {
            const d = decorators[key]
            d.propertyCreator(target, d.prop, d.descriptor, d.decoratorArguments)
        }
}

// TODO: add param, declare enumerable
export function createPropDecorator(
    propertyInitiallyEnumerable: boolean,
    propertyCreator: PropertyCreator
) {
    return function decoratorFactory() {
        let decoratorArguments: any[]

        const decorator = function decorate(
            target: DecoratorTarget,
            prop: string,
            descriptor: BabelDescriptor | undefined
        ) {
            if (process.env.NODE_ENV !== "production" && !quacksLikeADecorator(arguments))
                fail("This function is a decorator, but it wasn't invoked like a decorator")
            if (!Object.prototype.hasOwnProperty.call(target, "__mobxDecorators")) {
                const inheritedDecorators = target.__mobxDecorators
                addHiddenProp(target, "__mobxDecorators", { ...inheritedDecorators })
            }
            target.__mobxDecorators[prop] = {
                prop,
                propertyCreator,
                descriptor,
                decoratorArguments
            }
            return createPropertyInitializerDescriptor(prop, propertyInitiallyEnumerable)
        }

        if (quacksLikeADecorator(arguments)) {
            // @decorator
            decoratorArguments = EMPTY_ARRAY
            return decorator.apply(null, arguments)
        } else {
            // @decorator(args)
            decoratorArguments = Array.prototype.slice.call(arguments)
            decorator
        }
    }
}

export function quacksLikeADecorator(args: IArguments): boolean {
    return (args.length === 2 || args.length === 3) && typeof args[1] === "string"
}
