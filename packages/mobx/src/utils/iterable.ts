export function makeIterable<T, TReturn = unknown>(
    iterator: Iterator<T>
): IteratorObject<T, TReturn> {
    return Object.assign(Object.create(Iterator.prototype), iterator)
}
