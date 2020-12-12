import { die, Annotation, hasProp, appliedAnnotationsSymbol } from "../internal"

const OVERRIDE = "override"

export const overrideAnnotation = {
    annotationType_: OVERRIDE,
    make_,
    extend_
}

export function isOverride(annotation: Annotation): boolean {
    return annotation.annotationType_ === OVERRIDE
}

function make_(adm, key) {
    // Must override something
    if (__DEV__ && !hasProp(this[appliedAnnotationsSymbol], key)) {
        die(
            `'${adm.name_}.${key.toString()}' is annotated with 'override', ` +
                `but no such annotated member was found on prototype.`
        )
    }
}

function extend_(adm, key, descriptor) {
    die(`'override' can only be used with 'makeObservable'`)
}
