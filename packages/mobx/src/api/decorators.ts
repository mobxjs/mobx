import {
    Annotation,
    addHiddenProp,
    AnnotationsMap,
    makeObservable,
    assign,
    getDescriptor,
    hasProp,
    objectPrototype
} from "../internal"

export const mobxDecoratorsSymbol = Symbol("mobx-decorators")
const mobxAppliedDecoratorsSymbol = Symbol("mobx-applied-decorators")

export function createDecorator<ArgType>(
    type: Annotation["annotationType_"]
): Annotation & PropertyDecorator & ((arg: ArgType) => PropertyDecorator & Annotation) {
    return assign(
        function (target: any, property?: PropertyKey): any {
            if (property === undefined) {
                // @decorator(arg) member
                createDecoratorAndAnnotation(type, target)
            } else {
                // @decorator member
                storeDecorator(target, property!, type)
            }
        },
        {
            annotationType_: type
        }
    ) as any
}

export function createDecoratorAndAnnotation(
    type: Annotation["annotationType_"],
    arg_?: any
): PropertyDecorator & Annotation {
    return assign(
        function (target, property) {
            storeDecorator(target, property, type, arg_)
        },
        {
            annotationType_: type,
            arg_
        }
    )
}

export function storeDecorator(
    target: any,
    property: PropertyKey,
    type: Annotation["annotationType_"],
    arg_?: any
) {
    const desc = getDescriptor(target, mobxDecoratorsSymbol)
    let map: any
    if (desc) {
        map = desc.value
    } else {
        map = {}
        addHiddenProp(target, mobxDecoratorsSymbol, map)
    }
    map[property] = { annotationType_: type, arg_ } as Annotation
}

export function applyDecorators(target: Object): boolean {
    if (target[mobxAppliedDecoratorsSymbol]) return true
    let current = target
    // optimization: this could be cached per prototype!
    // (then we can remove the weird short circuiting as well..)
    let annotations: AnnotationsMap<any, any>[] = []
    while (current && current !== objectPrototype) {
        const desc = getDescriptor(current, mobxDecoratorsSymbol)
        if (desc) {
            if (!annotations.length) {
                for (let key in desc.value) {
                    // second conditions is to recognize actions
                    if (!hasProp(target, key) && !hasProp(current, key)) {
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
    addHiddenProp(target, mobxAppliedDecoratorsSymbol, true)
    return annotations.length > 0
}
