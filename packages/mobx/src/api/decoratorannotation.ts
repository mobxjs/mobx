import { die } from "../errors"
import { assign } from "../utils/utils"
import type { Annotation } from "./annotation"

export type DecoratorAnnotation<Decorator extends (...args: any[]) => any> = Annotation & Decorator

export function createDecoratorAnnotation<Decorator extends (...args: any[]) => any>(
    annotation: Annotation,
    decorate: (annotation: Annotation, value: any, context: any) => any
): DecoratorAnnotation<Decorator> {
    return assign(function decoratorAnnotation(value, context) {
        if (context && typeof context.kind === "string") {
            return decorate(annotation, value, context)
        }
        if (__DEV__) {
            die(`Invalid arguments for \`${annotation.annotationType_}\``)
        }
        return undefined
    }, annotation) as any
}
