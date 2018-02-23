import { invariant, isPlainObject } from "../utils/utils"

export function decorate(clazz, decorators) {
    invariant(typeof clazz === "function", "Decorate can only be used on classes")
    invariant(isPlainObject(decorators), "Decorators should be a key value map")
    for (let prop in decorators) {
        const decorator = decorators[prop]
        invariant(
            typeof decorator === "function",
            `Decorate: expected a decorator function for '${prop}'`
        )
        const descriptor = Object.getOwnPropertyDescriptor(clazz.prototype, prop)
        const newDescriptor = decorator(clazz.prototype, prop, descriptor)
        Object.defineProperty(clazz.prototype, prop, newDescriptor)
    }
}
