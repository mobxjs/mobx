import { addHiddenProp } from "./utils"

type DecoratorTarget = {
    __mobxDecorators?: DecoratorInvocationDescription[]
}

type BabelDescriptor = PropertyDescriptor & { initializer?: () => any }

type PropertyCreator = (instance: any, propertyName: string, initialValue: string) => void

type DecoratorInvocationDescription = {
    prop: string
    propertyCreator: PropertyCreator
    initializer: () => any
}

const enumerableDescriptorCache: { [prop: string]: PropertyDescriptor } = {}

function createEnumerableInitDescriptor(prop: string): PropertyDescriptor {
    return (
        enumerableDescriptorCache[prop] ||
        (enumerableDescriptorCache[prop] = {
            configurable: true,
            enumerable: true,
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

function decorateObservable(target: any, prop: string, descriptor: any) {
    if (!target.__mobxDecorators) addHiddenProp(target, "__mobxDecorators", [])
    target.__mobxDecorators.push({ prop, initializer: descriptor && descriptor.initializer })
    return createEnumerableInitDescriptor(prop)
}

function initializeInstance(target: DecoratorTarget) {
    const decorators = target.__mobxDecorators!
    for (let i = 0; i < decorators.length; i++) {
        const d = decorators[i]
        d.propertyCreator(target, d.prop, d.initializer && d.initializer())
    }
}

// TODO: add param, declare enumerable
export function createPropDecorator(propertyCreator: PropertyCreator) {
    return function decorate(
        target: DecoratorTarget,
        prop: string,
        descriptor: BabelDescriptor | undefined
    ) {
        if (!target.__mobxDecorators) addHiddenProp(target, "__mobxDecorators", [])
        target.__mobxDecorators!.push({
            prop,
            propertyCreator,
            initializer: descriptor && descriptor.initializer
        })
        return createEnumerableInitDescriptor(prop)
    }
    // TODO: story property creator on return thing directly
    // TODO: surround with factory
}
