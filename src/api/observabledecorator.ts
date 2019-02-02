import {
    BabelDescriptor,
    IEnhancer,
    asObservableObject,
    createPropDecorator,
    fail,
    invariant,
    quacksLikeAStage2Decorator,
    Stage2Decorator,
    generateObservablePropConfig
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
    return {
        key,
        kind: "method",
        placement: "own",
        initializer: undefined,
        descriptor: generateObservablePropConfig(key),
        extras: [
            // introduce an additional property that is always undefined,
            // just to be able to rn initialization code upon instance creation
            // This property is basically an ugly hack
            // To run some code upon initialization,
            // see: https://github.com/tc39/proposal-decorators/issues/153
            {
                kind: "hook",
                placement: "own",
                initializer() {
                    asObservableObject(this).initializeObservableProp(
                        key!,
                        initializer && initializer.call(this),
                        enhancer
                    )
                    // rather, we would want to delete this property...
                    return undefined
                }
            }
        ]
    }
}
