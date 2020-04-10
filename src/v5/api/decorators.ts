import { Annotation, addHiddenProp, fail, AnnotationsMap, makeObservable } from "../internal"

export const mobxDecoratorsSymbol = Symbol("mobx-decoratorators")

export function createDecorator<ArgType>(
    type: Annotation["annotationType"]
): Annotation & PropertyDecorator & ((arg: ArgType) => PropertyDecorator & Annotation) {
    return Object.assign(
        function(target: any, property?: PropertyKey): any {
            if (arguments.length === 1) {
                // @decorator(arg) member
                createDecoratorAndAnnotation(type, target)
            } else if (arguments.length === 2 || arguments.length === 3) {
                // @decorator member
                storeDecorator(target, property!, type)
            } else {
                fail(`Invalid decorator call`)
            }
        },
        {
            annotationType: type
        }
    ) as any
}

export function createDecoratorAndAnnotation(
    type: Annotation["annotationType"],
    arg?: any
): PropertyDecorator & Annotation {
    return Object.assign(
        function(target, property) {
            storeDecorator(target, property, type, arg)
        },
        {
            annotationType: type,
            arg
        }
    )
}

export function storeDecorator(
    target: any,
    property: PropertyKey,
    type: Annotation["annotationType"],
    arg?: any
) {
    // TODO: add bunch of assertions
    const desc = Object.getOwnPropertyDescriptor(target, mobxDecoratorsSymbol)
    let map: any
    if (desc) {
        map = desc.value
    } else {
        map = {}
        addHiddenProp(target, mobxDecoratorsSymbol, map)
    }
    map[property] = { annotationType: type, arg } as Annotation
}

export function applyDecorators(target: Object): boolean {
    let current = target
    // TODO optimization: this can be cached per prototype!
    // (then we can remove the weird short circuiting as well..)
    let annotations: AnnotationsMap<any>[] = []
    while (current && current !== Object.prototype) {
        const desc = Object.getOwnPropertyDescriptor(current, mobxDecoratorsSymbol)
        if (desc) {
            if (!annotations.length) {
                for (let key in desc.value) {
                    // Todo: make 'hasOwnProp' utility
                    // second conditions is to recognize actions
                    if (
                        !Object.prototype.hasOwnProperty.call(target, key) &&
                        !Object.prototype.hasOwnProperty.call(current, key)
                    ) {
                        // not all fields are defined yet, so we are in the makeObservable call of some super class,
                        // short circuit, here, we will do this again in a later makeObservable call
                        return true
                    }
                }
            }
            annotations.unshift(desc.value)
        }
        current = Object.getPrototypeOf(current)
    }
    annotations.forEach(a => {
        makeObservable(target, a)
    })
    return annotations.length > 0
}
