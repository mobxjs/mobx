import {isObservableArray} from "../types/observablearray";
import {isObservableObject} from "../types/observableobject";
import {isObservableMap} from "../types/observablemap";
import {isObservableValue} from "../types/observablevalue";
import {isObservable} from "./isobservable";
import {deprecated, isArrayLike} from "../utils/utils";

/**
	* Basically, a deep clone, so that no reactive property will exist anymore.
	*/
export function toJS<T>(source: T, detectCycles?: boolean): T;
export function toJS(source: any, detectCycles?: boolean): any;
export function toJS(source, detectCycles: boolean, __alreadySeen: [any, any][]); // internal overload
export function toJS(source, detectCycles: boolean = true, __alreadySeen: [any, any][] = []) {
	// optimization: using ES6 map would be more efficient!
	// optimization: lift this function outside toJS, this makes recursion expensive
	function cache(value) {
		if (detectCycles)
			__alreadySeen.push([source, value]);
		return value;
	}
	if (isObservable(source)) {
		if (detectCycles && __alreadySeen === null)
			__alreadySeen = [];
		if (detectCycles && source !== null && typeof source === "object") {
			for (let i = 0, l = __alreadySeen.length; i < l; i++)
				if (__alreadySeen[i][0] === source)
					return __alreadySeen[i][1];
		}

		if (isObservableArray(source)) {
			const res = cache([]);
			const toAdd = source.map(value => toJS(value, detectCycles, __alreadySeen));
			res.length = toAdd.length;
			for (let i = 0, l = toAdd.length; i < l; i++)
				res[i] = toAdd[i];
			return res;
		}
		if (isObservableObject(source)) {
			const res = cache({});
			for (let key in source)
				res[key] = toJS(source[key], detectCycles, __alreadySeen);
			return res;
		}
		if (isObservableMap(source)) {
			const res = cache({});
			source.forEach(
				(value, key) => res[key] = toJS(value, detectCycles, __alreadySeen)
			);
			return res;
		}
		if (isObservableValue(source))
			return toJS(source.get(), detectCycles, __alreadySeen);
	}
	return source;
}
