import {invariant, addHiddenFinalProp} from "./utils";

// inspired by https://github.com/leebyron/iterall/

declare var Symbol;

const SYMBOL_ITERATOR = typeof Symbol === "function" && Symbol.iterator;
export const $$iterator = SYMBOL_ITERATOR || "@@iterator";

export const IS_ITERATING_MARKER = "__$$iterating";

export interface Iterator<T> {
	next(): {
		done: boolean;
		value?: T;
	};
}

export function arrayAsIterator<T>(array: T[]): T[] & Iterator<T> {
	invariant(array[IS_ITERATING_MARKER] !== true, "Illegal state: cannot recycle array as iterator");
	addHiddenFinalProp(array, IS_ITERATING_MARKER, true);

	let idx = -1;
	addHiddenFinalProp(array, "next", function next() {
		idx++;
		return {
			done: idx >= this.length,
			value: idx < this.length ? this[idx] : undefined
		};
	});
	return array as any;
}

export function declareIterator<T>(prototType, iteratorFactory: () => Iterator<T>) {
	addHiddenFinalProp(prototType, $$iterator, iteratorFactory);
}
