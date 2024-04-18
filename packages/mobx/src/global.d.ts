declare const __DEV__: boolean

// This code is a copy from TS PR#57230
// Should be removed after it merged
interface ReadonlySetLike<T> {
    /**
     * Despite its name, returns an iterable of the values in the set-like.
     */
    keys(): Iterator<T>
    /**
     * @returns a boolean indicating whether an element with the specified value exists in the set-like or not.
     */
    has(value: T): boolean
    /**
     * @returns the number of (unique) elements in the set-like.
     */
    readonly size: number
}
