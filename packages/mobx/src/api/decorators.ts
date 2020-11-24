import { Annotation, addHiddenProp, AnnotationsMap, hasProp, die } from "../internal"

export const storedAnnotationsSymbol = Symbol("mobx-stored-annotations")
export const appliedAnnotationsSymbol = Symbol("mobx-applied-annotations")

export const override: PropertyDecorator & Annotation = createDecoratorAnnotation("override")
export const OVERRIDE = "override"

/**
 * Creates a function that acts as
 * - decorator
 * - decorator factory when called with single parameter
 * - annotation object
 * TODO:
 * Possibly get rid of this. It's only used for action.bound("name"), which is no longer supported?
 */
export function createCallableDecoratorAnnotation<ArgType>(
    type: Annotation["annotationType_"]
): Annotation & PropertyDecorator & ((arg: ArgType) => PropertyDecorator & Annotation) {
    function decoratorOrFactory(targetOrArg: any, property?: PropertyKey): any {
        if (property === undefined) {
            // @decorator(arg) member
            return createDecoratorAnnotation(type, targetOrArg)
        } else {
            // @decorator member
            storeAnnotation(targetOrArg, property!, type)
        }
    }
    decoratorOrFactory.annotationType_ = type
    return decoratorOrFactory as any
}

/**
 * Creates a function that acts as
 * - decorator
 * - annotation object
 */
export function createDecoratorAnnotation(
    annotationType_: Annotation["annotationType_"],
    arg_?: any
): PropertyDecorator & Annotation {
    function decorator(target, property) {
        storeAnnotation(target, property, annotationType_, arg_)
    }
    decorator.annotationType_ = annotationType_
    decorator.arg_ = arg_
    return decorator
}

/**
 * Stores annotation to target (prototype),
 * so it can be inspected later by `makeObservable` called from constructor
 */
export function storeAnnotation(
    target: any,
    key: PropertyKey,
    annotationType_: Annotation["annotationType_"],
    arg_?: any
) {
    if (!hasProp(target, storedAnnotationsSymbol)) {
        addHiddenProp(target, storedAnnotationsSymbol, {
            // Inherit annotations
            ...target[storedAnnotationsSymbol]
        })
    }
    // @override must override something
    if (__DEV__ && annotationType_ === "override" && !target[storedAnnotationsSymbol][key]) {
        die(
            `Property '${key.toString()}' is decorated with '@override', but no such decorated member was found on prototype.`
        )
    }
    // Cannot re-decorate
    if (__DEV__ && annotationType_ !== "override" && target[storedAnnotationsSymbol][key]) {
        die(38, key, target[storedAnnotationsSymbol][key].annotationType_, annotationType_)
    }
    // Ignore override
    if (annotationType_ !== "override") {
        target[storedAnnotationsSymbol][key] = { annotationType_, arg_, isDecorator_: true }
    }
}

/**
 * Collects annotations from prototypes and stores them on target (instance)
 */
export function collectStoredAnnotations(target): AnnotationsMap<any, any> {
    if (!hasProp(target, storedAnnotationsSymbol)) {
        if (__DEV__ && !target[storedAnnotationsSymbol]) {
            die(
                `No annotations were passed to makeObservable, but no decorated members have been found either`
            )
        }
        // We need a copy as we will remove annotation from the list once it's applied.
        addHiddenProp(target, storedAnnotationsSymbol, { ...target[storedAnnotationsSymbol] })
    }
    return target[storedAnnotationsSymbol]
}
