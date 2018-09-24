import {
    BabelDescriptor,
    IEnhancer,
    asObservableObject,
    createPropDecorator,
    fail,
    invariant,
    quacksLikeAStage2Decorator
} from "../internal"
import { Stage2Decorator } from "../utils/decorators"

export type IObservableDecorator = {
    (target: Object, property: string | symbol, descriptor?: PropertyDescriptor): void
    enhancer: IEnhancer<any>
}

export function createDecoratorForEnhancer(enhancer: IEnhancer<any>): IObservableDecorator {
    invariant(enhancer)
    const legacyDecorator = createPropDecorator(
        true,
        (
            target: any,
            propertyName: string,
            descriptor: BabelDescriptor | undefined,
            _decoratorTarget,
            decoratorArgs: any[]
        ) => {
            if (process.env.NODE_ENV !== "production") {
                invariant(
                    !descriptor || !descriptor.get,
                    `@observable cannot be used on getter (property "${propertyName}"), use @computed instead.`
                )
            }
            const initialValue = descriptor
                ? descriptor.initializer
                    ? descriptor.initializer.call(target)
                    : descriptor.value
                : undefined
            asObservableObject(target).addObservableProp(propertyName, initialValue, enhancer)
        }
    )
    const res: any = function observableDecorator() {
        if (quacksLikeAStage2Decorator(arguments)) {
            return stage2ObservableDecorator(enhancer, arguments[0])
        }
        // Extra process checks, as this happens during module initialization
        if (
            process.env.NODE_ENV !== "production" &&
            arguments.length < 2 &&
            !quacksLikeAStage2Decorator(arguments)
        )
            return fail(
                "Incorrect decorator invocation. @observable decorator doesn't expect any arguments"
            )
        return legacyDecorator.apply(null, arguments)
    }
    res.enhancer = enhancer
    return res
}

function stage2ObservableDecorator(
    enhancer: IEnhancer<any>,
    elementDescriptor: Stage2Decorator
): Stage2Decorator {
    const { key, initializer } = elementDescriptor
    return {
        key,
        kind: "method",
        placement: "own", // makes sure they are immediately enumerable!
        descriptor: {
            enumerable: true,
            configurable: true,
            get() {
                asObservableObject(this).addObservableProp(
                    key,
                    initializer && initializer.call(this),
                    enhancer
                )
                return this[key]
            },
            set(v) {
                asObservableObject(this).addObservableProp(
                    key,
                    initializer && initializer.call(this),
                    enhancer
                )
                this[key] = v
            }
        }
    }
}
