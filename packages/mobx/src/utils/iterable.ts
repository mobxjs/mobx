import { getGlobal } from "../internal"

// safely get iterator prototype if available
const maybeIteratorPrototype = getGlobal().Iterator?.prototype || {}

export function makeIterable<T, TReturn = unknown>(
    iterator: Iterator<T>
): IteratorObject<T, TReturn> {
    iterator[Symbol.iterator] = getSelf
    return Object.assign(Object.create(maybeIteratorPrototype), iterator)
}

function getSelf() {
    return this
}
