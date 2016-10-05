import {isObservableArray} from "../types/observablearray";
import {isObservableMap} from "../types/observablemap";
import {isObservableValue} from "../types/observablevalue";
import {deprecated} from "../utils/utils";
const isBrowser = typeof EventTarget != 'undefined'
/**
	* Basically, a deep clone, so that no reactive property will exist anymore.
	*/
export function toJS(source, detectCycles: boolean = true, __alreadySeen: [any, any][] = null) {
	// optimization: using ES6 map would be more efficient!
	function cache(value) {
		if (detectCycles)
			__alreadySeen.push([source, value]);
		return value;
	}
	if (source instanceof Date || source instanceof RegExp || isBrowser && source instanceof EventTarget)
		return source;

	if (detectCycles && __alreadySeen === null)
		__alreadySeen = [];
	if (detectCycles && source !== null && typeof source === "object") {
		for (let i = 0, l = __alreadySeen.length; i < l; i++)
			if (__alreadySeen[i][0] === source)
				return __alreadySeen[i][1];
	}

	if (!source)
		return source;
	if (Array.isArray(source) || isObservableArray(source)) {
		const res = cache([]);
		const toAdd = source.map(value => toJS(value, detectCycles, __alreadySeen));
		res.length = toAdd.length;
		for (let i = 0, l = toAdd.length; i < l; i++)
			res[i] = toAdd[i];
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
	if (typeof source === "object") {
		const res = cache({});
		for (let key in source)
			res[key] = toJS(source[key], detectCycles, __alreadySeen);
		return res;
	}
	return source;
}

export function toJSON(source, detectCycles: boolean = true, __alreadySeen: [any, any][] = null) {
	deprecated("toJSON is deprecated. Use toJS instead");
	return toJS.apply(null, arguments);
}
