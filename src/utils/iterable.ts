import { addHiddenFinalProp } from "./utils"

// inspired by https://github.com/leebyron/iterall/

declare var Symbol

export function iteratorSymbol() {
    return (typeof Symbol === "function" && Symbol.iterator) || "@@iterator"
}

export const IS_ITERATING_MARKER = "__$$iterating"

export interface Iterator<T> {
    next(): {
        done: boolean
        value?: T
    }
}

export function declareIterator<T>(prototType, iteratorFactory: () => Iterator<T>) {
    addHiddenFinalProp(prototType, iteratorSymbol(), iteratorFactory)
}
