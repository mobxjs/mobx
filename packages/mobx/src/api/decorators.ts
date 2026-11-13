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

/**
 * The key under which the administration keeps a decorated member.
 * `context.name` of a private member is only its description, like "#value". A class and its
 * subclass can each declare a private member with that description, so every private member
 * gets a key of its own.
 */
export function getDecoratedMemberKey(context: ClassMemberDecoratorContext): PropertyKey {
    return context.private ? Symbol(String(context.name)) : context.name
}
