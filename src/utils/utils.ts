export const EMPTY_ARRAY = [];
Object.freeze(EMPTY_ARRAY);

export interface Lambda {
	(): void;
	name?: string;
}

export function getNextId() {
	return ++globalState.mobxGuid;
}

export function invariant(check: boolean, message: string, thing?) {
	if (!check)
		throw new Error("[mobx] Invariant failed: " + message + (thing ? ` in '${thing}'` : ""));
}

const deprecatedMessages = [];
export function deprecated(msg: string) {
	if (deprecatedMessages.indexOf(msg) !== -1)
		return;
	deprecatedMessages.push(msg);
	console.error("[mobx] Deprecated: " + msg);
}

/**
 * Makes sure that the provided function is invoked at most once.
 */
export function once(func: Lambda): Lambda {
	let invoked = false;
	return function() {
		if (invoked)
			return;
		invoked = true;
		return func.apply(this, arguments);
	};
}

export const noop = () => {};

export function unique<T>(list: T[]): T[] {
	const res = [];
	list.forEach(item => {
		if (res.indexOf(item) === -1)
			res.push(item);
	});
	return res;
}

export function joinStrings(things: string[], limit: number = 100, separator = " - "): string {
	if (!things)
		return "";
	const sliced = things.slice(0, limit);
	return `${sliced.join(separator)}${things.length > limit ? " (... and " + (things.length - limit) + "more)" : ""}`;
}

export function isPlainObject(value) {
	return value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
}

export function objectAssign(...objs: Object[]): Object;
export function objectAssign() {
	const res = arguments[0];
	for (let i = 1, l = arguments.length; i < l; i++) {
		const source = arguments[i];
		for (let key in source) if (source.hasOwnProperty(key)) {
			res[key] = source[key];
		}
	}
	return res;
}

export function valueDidChange(compareStructural: boolean, oldValue, newValue): boolean {
	return compareStructural
		? !deepEquals(oldValue, newValue)
		: oldValue !== newValue;
}

export function makeNonEnumerable(object: any, props: string[]) {
	for (let i = 0; i < props.length; i++) {
		Object.defineProperty(object, props[i], {
			configurable: true,
			writable: true,
			enumerable: false,
			value: object[props[i]]
		});
	}
}

export function addHiddenFinalProp(object: any, propName: string, value: any) {
	Object.defineProperty(object, propName, {
		enumerable: false,
		writable: false,
		configurable: false,
		value
	});
}

export function isPropertyConfigurable(object: any, prop: string): boolean {
	const descriptor = Object.getOwnPropertyDescriptor(object, prop);
	return !descriptor || (descriptor.configurable !== false && descriptor.writable !== false);
}

export function assertPropertyConfigurable(object: any, prop: string) {
	invariant(
		isPropertyConfigurable(object, prop),
		`Cannot make property '${prop}' observable, it is not configurable and writable in the target object`
	);
}

export function getEnumerableKeys(obj) {
	const res = [];
	for (let key in obj)
		res.push(key);
	return res;
}

/**
 * Naive deepEqual. Doesn't check for prototype, non-enumerable or out-of-range properties on arrays.
 * If you have such a case, you probably should use this function but something fancier :).
 */
export function deepEquals(a, b) {
	if (a === null && b === null)
		return true;
	if (a === undefined && b === undefined)
		return true;
	const aIsArray = Array.isArray(a) || isObservableArray(a);
	if (aIsArray !== (Array.isArray(b) || isObservableArray(b))) {
		return false;
	} else if (aIsArray) {
		if (a.length !== b.length)
			return false;
		for (let i = a.length -1; i >= 0; i--)
			if (!deepEquals(a[i], b[i]))
				return false;
		return true;
	} else if (typeof a === "object" && typeof b === "object") {
		if (a === null || b === null)
			return false;
		if (getEnumerableKeys(a).length !== getEnumerableKeys(b).length)
			return false;
		for (let prop in a) {
			if (!(prop in b))
				return false;
			if (!deepEquals(a[prop], b[prop]))
				return false;
		}
		return true;
	}
	return a === b;
}

/**
 * Given a new and an old list, tries to determine which items are added or removed
 * in linear time. The algorithm is heuristic and does not give the optimal results in all cases.
 * (For example, [a,b] -> [b, a] yiels [[b,a],[a,b]])
 * its basic assumptions is that the difference between base and current are a few splices.
 *
 * returns a tuple<addedItems, removedItems>
 * @type {T[]}
 */
export function quickDiff<T>(current: T[], base: T[]): [T[], T[]] {
	if (!base || !base.length)
		return [current, []];
	if (!current || !current.length)
		return [[], base];

	let added: T[] = [];
	let removed: T[] = [];

	let currentIndex = 0,
		currentSearch = 0,
		currentLength = current.length,
		currentExhausted = false,
		baseIndex = 0,
		baseSearch = 0,
		baseLength = base.length,
		isSearching = false,
		baseExhausted = false;

	while (!baseExhausted && !currentExhausted) {
		if (!isSearching) {
			// within rang and still the same
			if (currentIndex < currentLength && baseIndex < baseLength && current[currentIndex] === base[baseIndex]) {
				currentIndex++;
				baseIndex++;
				// early exit; ends where equal
				if (currentIndex === currentLength && baseIndex === baseLength)
					return [added, removed];
				continue;
			}
			currentSearch = currentIndex;
			baseSearch = baseIndex;
			isSearching = true;
		}
		baseSearch += 1;
		currentSearch += 1;
		if (baseSearch >= baseLength)
			baseExhausted = true;
		if (currentSearch >= currentLength)
			currentExhausted = true;

		if (!currentExhausted && current[currentSearch] === base[baseIndex]) {
			// items where added
			added = added.concat(current.slice(currentIndex, currentSearch));
			currentIndex = currentSearch + 1;
			baseIndex ++;
			isSearching = false;
		}
		else if (!baseExhausted && base[baseSearch] === current[currentIndex]) {
			// items where removed
			removed = removed.concat(base.slice(baseIndex, baseSearch));
			baseIndex = baseSearch + 1;
			currentIndex ++;
			isSearching = false;
		}
	}

	return [
		added.concat(current.slice(currentIndex)),
		removed.concat(base.slice(baseIndex))
	];
}

import {globalState} from "../core/globalstate";
import {isObservableArray} from "../types/observablearray";