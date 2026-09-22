import { assign } from "./utils"

// safely get iterator prototype if available
const maybeIteratorPrototype = (globalThis as any).Iterator?.prototype || {}

export function makeIterable<T, TReturn = unknown>(
    iterator: Iterator<T>
): IteratorObject<T, TReturn> {
    iterator[Symbol.iterator] = getSelf
    return assign(Object.create(maybeIteratorPrototype), iterator)
}

function getSelf() {
    return this
}
