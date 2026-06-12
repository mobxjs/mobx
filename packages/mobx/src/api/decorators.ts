import { die } from "../internal"

export function assert20223DecoratorType(
    context: DecoratorContext,
    types: DecoratorContext["kind"][]
) {
    if (__DEV__ && !types.includes(context.kind)) {
        die(
            `The decorator applied to '${String(context.name)}' cannot be used on a ${
                context.kind
            } element`
        )
    }
}
