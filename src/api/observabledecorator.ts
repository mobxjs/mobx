import {
    BabelDescriptor,
    IEnhancer,
    asObservableObject,
    createPropDecorator,
    fail,
    invariant,
    quacksLikeAStage2Decorator,
    Stage2Decorator
} from "../internal"

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
        if (process.env.NODE_ENV !== "production" && arguments.length < 2)
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
    // This property is basically an ugly hack
    // To run some code upon initialization,
    // see: https://github.com/tc39/proposal-decorators/issues/153
    return {
        key: key + "_initializer",
        kind: "field",
        placement: "own",
        descriptor: {
            enumerable: false,
            configurable: true,
            writable: true
        },
        initializer() {
            asObservableObject(this).addObservableProp(
                key,
                initializer && initializer.call(this),
                enhancer
            )
            return undefined
        }
    }
}
