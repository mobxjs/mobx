import {
    ComputedValue,
    IComputedValueOptions,
    Annotation,
    isPlainObject,
    isFunction,
    die,
    IComputedValue,
    createComputedAnnotation,
    comparer,
    decorateComputed20223_,
    assign
} from "../internal"
import type { ClassGetterDecorator } from "../types/decorator_fills"

export const COMPUTED = "computed"
export const COMPUTED_STRUCT = "computed.struct"

interface IComputedDecoratorAnnotation extends Annotation, ClassGetterDecorator {}

function createComputedDecoratorAnnotation(annotation: Annotation): IComputedDecoratorAnnotation {
    return assign(function computedDecorator(get, context) {
        if (context && typeof context.kind === "string") {
            return decorateComputed20223_(annotation, get, context)
        }
        if (__DEV__) {
            die(`Invalid arguments for \`${annotation.annotationType_}\``)
        }
        return undefined
    }, annotation) as any
}

export interface IComputedFactory extends Annotation, ClassGetterDecorator {
    // computed annotation with options
    <T>(options: IComputedValueOptions<T>): IComputedDecoratorAnnotation
    // computed(fn, opts)
    <T>(func: () => T, options?: IComputedValueOptions<T>): IComputedValue<T>

    struct: IComputedDecoratorAnnotation
}

const computedAnnotation = createComputedAnnotation(COMPUTED)
const computedStructAnnotation = createComputedAnnotation(COMPUTED_STRUCT, {
    equals: comparer.structural
})

export const computed: IComputedFactory = function computed(arg1, arg2) {
    if (arg2 && typeof arg2.kind === "string") {
        return decorateComputed20223_(computedAnnotation, arg1, arg2)
    }

    if (isPlainObject(arg1)) {
        // computed annotation with options
        return createComputedDecoratorAnnotation(createComputedAnnotation(COMPUTED, arg1))
    }

    // computed(expr, options?)
    if (__DEV__) {
        if (!isFunction(arg1)) {
            die("First argument to `computed` should be an expression.")
        }
        if (isFunction(arg2)) {
            die(
                "A setter as second argument is no longer supported, use `{ set: fn }` option instead"
            )
        }
    }
    const opts: IComputedValueOptions<any> = isPlainObject(arg2) ? arg2 : {}
    opts.get = arg1
    opts.name ||= arg1.name || "" /* for generated name */

    return new ComputedValue(opts)
} as any

Object.assign(computed, computedAnnotation)

computed.struct = createComputedDecoratorAnnotation(computedStructAnnotation)
