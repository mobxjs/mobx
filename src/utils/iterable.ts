export function makeIterable<T>(iterator: Iterator<T>): IterableIterator<T> {
    iterator[Symbol.iterator] = self
    return iterator as any
}

function self() {
    return this
}
