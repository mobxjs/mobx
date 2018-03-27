import { invariant, isPlainObject } from "../utils/utils"

export function decorate<T>(
    clazz: new (...args: any[]) => T,
    decorators: { [P in keyof T]?: MethodDecorator | PropertyDecorator }
): void
export function decorate<T>(
    object: T,
    decorators: { [P in keyof T]?: MethodDecorator | PropertyDecorator }
): T
export function decorate(thing: any, decorators: any) {
    process.env.NODE_ENV !== "production" &&
        invariant(isPlainObject(decorators), "Decorators should be a key value map")
    const target = typeof thing === "function" ? thing.prototype : thing
    for (let prop in decorators) {
        const decorator = decorators[prop]
        process.env.NODE_ENV !== "production" &&
            invariant(
                typeof decorator === "function",
                `Decorate: expected a decorator function for '${prop}'`
            )
        const descriptor = Object.getOwnPropertyDescriptor(target, prop)
        const newDescriptor = decorator(target, prop, descriptor)
        if (newDescriptor) Object.defineProperty(target, prop, newDescriptor)
    }
    return thing
}
