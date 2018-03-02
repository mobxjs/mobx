import { addHiddenProp } from "./utils"

type DecoratorTarget = {
    __mobxDidRunLazyInitializers2?: boolean // TODO: rename
    __mobxDecorators?: { [prop: string]: DecoratorInvocationDescription }
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

export function initializeInstance(target: DecoratorTarget) {
    if (target.__mobxDidRunLazyInitializers2 === true) return
    addHiddenProp(target, "__mobxDidRunLazyInitializers2", true)
    const decorators = target.__mobxDecorators
    if (decorators)
        for (let key in decorators) {
            const d = decorators[key]
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
        if (!Object.prototype.hasOwnProperty.call(target, "__mobxDecorators")) {
            const inheritedDecorators = target.__mobxDecorators
            addHiddenProp(target, "__mobxDecorators", { ...inheritedDecorators })
        }
        target.__mobxDecorators[prop] = {
            prop,
            propertyCreator,
            initializer: descriptor && (descriptor.initializer || (() => descriptor.value))
        }
        return createEnumerableInitDescriptor(prop)
    }
    // TODO: story property creator on return thing directly
    // TODO: surround with factory
}
