import { Annotation, addHiddenProp, AnnotationsMap, hasProp, die, isOverride } from "../internal"

export const storedAnnotationsSymbol = Symbol("mobx-stored-annotations")
// TODO move to observableobject.js

// TODO delete
//export const override: PropertyDecorator & Annotation = createDecoratorAnnotation("override")
//export const OVERRIDE = "override"

/**
 * Creates a function that acts as
 * - decorator
 * - decorator factory when called with single parameter
 * - annotation object
 * TODO:
 * Possibly get rid of this. It's only used for action.bound("name"), which is no longer supported?
 */
/*
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
*/

/**
 * Creates a function that acts as
 * - decorator
 * - annotation object
 */
export function createDecoratorAnnotation(annotation: Annotation): PropertyDecorator & Annotation {
    function decorator(target, property) {
        storeAnnotation(target, property, annotation)
    }
    return Object.assign(decorator, annotation)
}

/**
 * Stores annotation to prototype,
 * so it can be inspected later by `makeObservable` called from constructor
 */
export function storeAnnotation(prototype: any, key: PropertyKey, annotation: Annotation) {
    if (!hasProp(prototype, storedAnnotationsSymbol)) {
        addHiddenProp(prototype, storedAnnotationsSymbol, {
            // Inherit annotations
            ...prototype[storedAnnotationsSymbol]
        })
    }
    // @override must override something
    if (__DEV__ && isOverride(annotation) && !hasProp(prototype[storedAnnotationsSymbol], key)) {
        die(
            `${prototype.constructor.name}.${key.toString()} is decorated with 'override', ` +
                `but no such decorated member was found on prototype.`
        )
    }
    // Cannot re-decorate
    assertNotDecorated(prototype, annotation, key)

    // Ignore override
    if (!isOverride(annotation)) {
        prototype[storedAnnotationsSymbol][key] = {
            ...annotation,
            isDecorator_: true
        }
    }
}

function assertNotDecorated(prototype: object, annotation /* TODO type */, key: PropertyKey) {
    if (__DEV__ && !isOverride(annotation) && hasProp(prototype[storedAnnotationsSymbol], key)) {
        const fieldName = `${prototype.constructor.name}.${key.toString()}`
        die(
            `Cannot re-decorate` +
                `\n@${prototype[storedAnnotationsSymbol][key].annotationType_} ${fieldName}` +
                `\nto` +
                `\n@${annotation.annotationType_} ${fieldName}` +
                `\nChanging decorator or it's configuration is not allowed` +
                `\nUse 'override' annotation for methods overriden by subclass`
        )
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
