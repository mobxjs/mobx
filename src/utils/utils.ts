export const GLOBAL: any = function() { return this; }();

export const EMPTY_ARRAY = [];
Object.freeze(EMPTY_ARRAY);

export interface Lambda {
	(): void;
	name?: string;
}

export function getNextId() {
	return ++globalState.mobxGuid;
}

export function fail(message: string, thing?): never {
	invariant(false, message, thing);
	throw "X"; // unreachable
}

export function invariant(check: boolean, message: string, thing?) {
	if (!check)
		throw new Error("[mobx] Invariant failed: " + message + (thing ? ` in '${thing}'` : ""));
}


/**
 * Prints a deprecation message, but only one time.
 * Returns false if the deprecated message was already printed before
 */
const deprecatedMessages: string[] = [];

export function deprecated(msg: string): boolean {
	if (deprecatedMessages.indexOf(msg) !== -1)
		return false;
	deprecatedMessages.push(msg);
	console.error("[mobx] Deprecated: " + msg);
	return true;
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
	const res: T[] = [];
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

export function isObject(value: any): boolean {
	return value !== null && typeof value === "object";
}

export function isPlainObject(value) {
	if (value === null || typeof value !== "object")
		return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}

export function objectAssign(...objs: Object[]): Object;
export function objectAssign() {
	const res = arguments[0];
	for (let i = 1, l = arguments.length; i < l; i++) {
		const source = arguments[i];
		for (let key in source) if (hasOwnProperty(source, key)) {
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

const prototypeHasOwnProperty = Object.prototype.hasOwnProperty;
export function hasOwnProperty(object: Object, propName: string) {
	return prototypeHasOwnProperty.call(object, propName);
}

export function makeNonEnumerable(object: any, propNames: string[]) {
	for (let i = 0; i < propNames.length; i++) {
		addHiddenProp(object, propNames[i], object[propNames[i]]);
	}
}

export function addHiddenProp(object: any, propName: string, value: any) {
	Object.defineProperty(object, propName, {
		enumerable: false,
		writable: true,
		configurable: true,
		value
	});
}

export function addHiddenFinalProp(object: any, propName: string, value: any) {
	Object.defineProperty(object, propName, {
		enumerable: false,
		writable: false,
		configurable: true,
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
	const res: string[] = [];
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
	const aIsArray = isArrayLike(a);
	if (aIsArray !== isArrayLike(b)) {
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

export function createInstanceofPredicate<T>(name: string, clazz: new (...args: any[]) => T): (x: any) => x is T {
	// TODO: this is quite a slow aproach, find something faster?
	const propName = "isMobX" + name;
	clazz.prototype[propName] = true;
	return function (x) {
		return isObject(x) && x[propName] === true;
	} as any;
}

/**
 * Returns whether the argument is an array, disregarding observability.
 */
export function isArrayLike(x: any): boolean {
	return Array.isArray(x) || isObservableArray(x);
}

export function isES6Map(thing): boolean {
	if (thing instanceof GLOBAL.Map)
		return true;
	return false;
}

import {globalState} from "../core/globalstate";
import {isObservableArray} from "../types/observablearray";