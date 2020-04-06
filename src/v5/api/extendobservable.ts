import {
    CreateObservableOptions,
    invariant,
    isObservableMap,
    AnnotationsMap,
    makeObservable,
    extractAnnotationsFromObject
} from "../internal"

export function extendObservable<A extends Object, B extends Object>(
    target: A,
    properties?: B,
    annotations?: AnnotationsMap<B>,
    options?: CreateObservableOptions
): A & B {
    if (process.env.NODE_ENV !== "production") {
        invariant(
            arguments.length >= 2 && arguments.length <= 4,
            "'extendObservable' expected 2-4 arguments"
        )
        invariant(
            typeof target === "object",
            "'extendObservable' expects an object as first argument"
        )
        invariant(
            !isObservableMap(target),
            "'extendObservable' should not be used on maps, use map.merge instead"
        )
    }

    const inferredAnnotations = { ...annotations }
    extractAnnotationsFromObject(properties, inferredAnnotations, options)
    makeObservable(Object.assign(target, properties), inferredAnnotations, options)
    return target as any
}
