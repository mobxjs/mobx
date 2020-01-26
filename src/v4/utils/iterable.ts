import { addHiddenFinalProp } from "../internal"

// inspired by https://github.com/leebyron/iterall/

declare const Symbol

export function iteratorSymbol() {
    return (typeof Symbol === "function" && Symbol.iterator) || "@@iterator"
}

export const IS_ITERATING_MARKER = "__$$iterating"

export function declareIterator<T>(prototType, iteratorFactory: () => IterableIterator<T>) {
    addHiddenFinalProp(prototType, iteratorSymbol(), iteratorFactory)
}

export function makeIterable<T>(iterator: Iterator<T>): IterableIterator<T> {
    iterator[iteratorSymbol()] = getSelf
    return iterator as any
}

export function toStringTagSymbol() {
    return (typeof Symbol === "function" && Symbol.toStringTag) || "@@toStringTag"
}

function getSelf() {
    return this
}
