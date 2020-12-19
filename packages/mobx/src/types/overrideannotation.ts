import { createDecoratorAnnotation } from "../api/decorators"
import { die, Annotation, hasProp, appliedAnnotationsSymbol } from "../internal"

const OVERRIDE = "override"

export const override: Annotation & PropertyDecorator = createDecoratorAnnotation({
    annotationType_: OVERRIDE,
    make_,
    extend_
})

export function isOverride(annotation: Annotation): boolean {
    return annotation.annotationType_ === OVERRIDE
}

// TODO warn if used on plain object
function make_(adm, key): void {
    // Must override something
    if (__DEV__ && !hasProp(adm[appliedAnnotationsSymbol], key)) {
        die(
            `'${adm.name_}.${key.toString()}' is annotated with 'override', ` +
                `but no such annotated member was found on prototype.`
        )
    }
}

function extend_(adm, key, descriptor, proxyTrap): boolean {
    die(`'override' can only be used with 'makeObservable'`)
}
