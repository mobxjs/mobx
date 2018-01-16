import { addHiddenFinalProp } from "./utils"
import { invariant } from "../../mobx-core/index"

// inspired by https://github.com/leebyron/iterall/

declare var Symbol

function iteratorSymbol() {
	return (typeof Symbol === "function" && Symbol.iterator) || "@@iterator"
}

export const IS_ITERATING_MARKER = "__$$iterating"

export interface Iterator<T> {
	next(): {
		done: boolean
		value?: T
	}
}

export function arrayAsIterator<T>(array: T[]): T[] & Iterator<T> {
	// returning an array for entries(), values() etc for maps was a mis-interpretation of the specs..,
	// yet it is quite convenient to be able to use the response both as array directly and as iterator
	// it is suboptimal, but alas...
	invariant(
		array[IS_ITERATING_MARKER] !== true,
		"Illegal state: cannot recycle array as iterator"
	)
	addHiddenFinalProp(array, IS_ITERATING_MARKER, true)

	let idx = -1
	addHiddenFinalProp(array, "next", function next() {
		idx++
		return {
			done: idx >= this.length,
			value: idx < this.length ? this[idx] : undefined
		}
	})
	return array as any
}

export function declareIterator<T>(prototType, iteratorFactory: () => Iterator<T>) {
	addHiddenFinalProp(prototType, iteratorSymbol(), iteratorFactory)
}
