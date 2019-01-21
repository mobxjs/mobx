import { addHiddenFinalProp } from "../internal"

// inspired by https://github.com/leebyron/iterall/

declare var Symbol

export function iteratorSymbol() {
    return (typeof Symbol === "function" && Symbol.iterator) || "@@iterator"
}

export const IS_ITERATING_MARKER = "__$$iterating"

export function declareIterator<T>(prototType, iteratorFactory: () => IterableIterator<T>) {
    addHiddenFinalProp(prototType, iteratorSymbol(), iteratorFactory)
}

export function makeIterable<T>(iterator: Iterator<T>): IterableIterator<T> {
    iterator[iteratorSymbol()] = self
    return iterator as any
}

function self() {
    return this
}
