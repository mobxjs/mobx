// for backward compatability with typescript pre version 5.6
// copied from https://github.com/microsoft/TypeScript/blob/main/src/lib/es2015.iterable.d.ts

/**
 * Defines the `TReturn` type used for built-in iterators produced by `Array`, `Map`, `Set`, and others.
 * This is `undefined` when `strictBuiltInIteratorReturn` is `true`; otherwise, this is `any`.
 */
type BuiltinIteratorReturn = intrinsic;


interface SetIterator<T> extends IteratorObject<T, BuiltinIteratorReturn, unknown> {
    [Symbol.iterator](): SetIterator<T>;
}

/**
 * Describes an {@link Iterator} produced by the runtime that inherits from the intrinsic `Iterator.prototype`.
 */
interface IteratorObject<T, TReturn = unknown, TNext = unknown> extends Iterator<T, TReturn, TNext> {
    [Symbol.iterator](): IteratorObject<T, TReturn, TNext>;
}

interface MapIterator<T> extends IteratorObject<T, BuiltinIteratorReturn, unknown> {
    [Symbol.iterator](): MapIterator<T>;
}


interface MapIterator<T> extends IteratorObject<T, BuiltinIteratorReturn, unknown> {
    [Symbol.iterator](): MapIterator<T>;
}
