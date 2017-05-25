/**
 * This class exists to make the notion of a FauxArray reusable in other libraries. Currently reused in MST,
 * But could also be very used to create derivable, read only arrays.
 *
 * Should probably end up in it's own library
 */
import {makeNonEnumerable, EMPTY_ARRAY, addHiddenProp, invariant} from "../utils/utils";
import {arrayAsIterator, declareIterator} from "../utils/iterable";

// Detects bug in safari 9.1.1 (or iOS 9 safari mobile). See #364
const safariPrototypeSetterInheritanceBug = (() => {
	let v = false;
	const p = {};
	Object.defineProperty(p, "0", { set: () => { v = true; } });
	Object.create(p)["0"] = 1;
	return v === false;
})();

export interface IInterceptableArray<T> extends Array<T> {
	spliceWithArray(index: number, deleteCount?: number, newItems?: T[]): T[];
	clear(): T[];
	peek(): T[];
	replace(newItems: T[]): T[];
	find(predicate: (item: T, index: number, array: this) => boolean, thisArg?: any, fromIndex?: number): T;
	findIndex(predicate: (item: T, index: number, array: this) => boolean, thisArg?: any, fromIndex?: number): number;
	remove(value: T): boolean;
	move(fromIndex: number, toIndex: number): void;
}
/**
 * This array buffer contains two lists of properties, so that all arrays
 * can recycle their property definitions, which significantly improves performance of creating
 * properties on the fly.
 */
let INTERCEPTABLE_ARRAY_BUFFER_SIZE = 0;

// Typescript workaround to make sure ObservableArray extends Array
export class StubArray {
}
StubArray.prototype = [];

export function createInterceptableArrayClass<T>(
	// Optimization: don't access any of these methods through closure, but store them on prototype
	onGetLength: () => number,
	onGetValues: () => T[],
	onSplice:(index: number, deleteCount: number, newItems: T[]) => T[],
	onGet:(index: number) => T,
	onSet:(index: number, value: T) => void,
	// kinda ugly, this one is used when values or length are needed for internal purposes (like infering arguments)
	// and no side effects (reportObserved) should be triggered. Untracked blocks / actions would be needed otherwise...
	getInternalLength: () => number
): new (...args:any[]) => IInterceptableArray<T> {
	const clz = class InterceptableArray<T> extends StubArray /*implements IInterceptableArray<T>*/ {
		constructor () {
			super();
			if (safariPrototypeSetterInheritanceBug) {
				// Seems that Safari won't use numeric prototype setter untill any * numeric property is
				// defined on the instance. After that it works fine, even if this property is deleted.
				Object.defineProperty(this, "0", ENTRY_0);
			}
		}

		get length(): number {
			// defined below:
			throw "Illegal state"
		}

		set length(newLength: number) {
			if (typeof newLength !== "number" || newLength < 0)
				throw new Error("[mobx.array] Out of range: " + newLength);
			reserveArrayBuffer(newLength);
			let currentLength = getInternalLength.call(this);
			if (newLength === currentLength)
				return;
			else if (newLength > currentLength) {
				const newItems = new Array(newLength - currentLength);
				for (let i = 0; i < newLength - currentLength; i++)
					newItems[i] = undefined; // No Array.fill everywhere...
				this.spliceWithArray(currentLength, 0, newItems);
			}
			else
				this.spliceWithArray(newLength, currentLength - newLength);
		}

		clear(): T[] {
			return this.splice(0);
		}

		concat(...arrays: T[][]): T[] {
			return Array.prototype.concat.apply(this.peek(), arrays.map(a => a instanceof StubArray ? a.slice() : a));
		}

		replace(newItems: T[]) {
			return onSplice.call(this, 0, getInternalLength.call(this), newItems);
		}

		/**
		 * Converts this array back to a (shallow) javascript structure.
		 * For a deep clone use mobx.toJS
		 */
		toJS(): T[] {
			return (this as any).slice();
		}

		toJSON(): T[] {
			// Used by JSON.stringify
			return this.toJS();
		}

		peek(): T[] {
			// defined below
			throw "Illegal state";
		}

		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
		find(predicate: (item: T, index: number, array: this) => boolean, thisArg?, fromIndex = 0): T | undefined {
			const idx = this.findIndex.apply(this, arguments);
			return idx === -1 ? undefined : this.get(idx)
		}

		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex
		findIndex(predicate: (item: T, index: number, array: this) => boolean, thisArg?, fromIndex = 0): number {
			const items = this.peek(), l = items.length;
			for (let i = fromIndex; i < l; i++)
				if (predicate.call(thisArg, items[i], i, this))
					return i;
			return -1;
		}

		/*
			functions that do alter the internal structure of the array, (based on lib.es6.d.ts)
			since these functions alter the inner structure of the array, the have side effects.
			Because the have side effects, they should not be used in computed function,
			and for that reason the do not call dependencyState.notifyObserved
			*/
		splice(index: number, deleteCount?: number, ...newItems: T[]): T[] {
			switch (arguments.length) {
				case 0:
					return [];
				case 1:
					return this.spliceWithArray(index);
				case 2:
					return this.spliceWithArray(index, deleteCount);
			}
			return this.spliceWithArray(index, deleteCount, newItems);
		}

		spliceWithArray(index: number, deleteCount?: number, newItems?: T[]): T[] {
			const currentLength = getInternalLength.call(this);
			if (index === undefined)
				index = 0;
			else if (index > currentLength)
				index = currentLength;
			else if (index < 0)
				index = Math.max(0, currentLength + index);

			if (arguments.length === 1)
				deleteCount = currentLength - index;
			else if (deleteCount === undefined || deleteCount === null)
				deleteCount = 0;
			else
				deleteCount = Math.max(0, Math.min(deleteCount, currentLength - index));

			if (newItems === undefined)
				newItems = [];

			reserveArrayBuffer(currentLength + newItems.length - deleteCount);
			return onSplice.call(this, index, deleteCount, newItems);
		}

		push(...items: T[]): number {
			onSplice.call(this, getInternalLength.call(this), 0, items);
			return getInternalLength.call(this);
		}

		pop(): T | undefined {
			return this.splice(Math.max(getInternalLength.call(this) - 1, 0), 1)[0];
		}

		shift(): T | undefined {
			return this.splice(0, 1)[0];
		}

		unshift(...items: T[]): number {
			this.spliceWithArray(0, 0, items);
			return getInternalLength.call(this);
		}

		reverse(): T[] {
			// reverse by default mutates in place before returning the result
			// which makes it both a 'derivation' and a 'mutation'.
			// so we deviate from the default and just make it an dervitation
			const clone = (<any>this).slice();
			return clone.reverse.apply(clone, arguments);
		}

		sort(compareFn?: (a: T, b: T) => number): T[] {
			// sort by default mutates in place before returning the result
			// which goes against all good practices. Let's not change the array in place!
			const clone = (<any>this).slice();
			return clone.sort.apply(clone, arguments);
		}

		remove(value: T): boolean {
			const idx = (this as any).indexOf(value);
			if (idx > -1) {
				this.splice(idx, 1);
				return true;
			}
			return false;
		}

		// See #734, in case property accessors are unreliable...
		get(index: number): T | undefined {
			if (!(this instanceof StubArray))
				return undefined; // happens sometimes when using debuggers..., getter being invoked with incorrect this
			if (index < this.length) {
				return onGet.call(this, index);
			}
			console.warn(`[mobx.array] Attempt to read an array index (${index}) that is out of bounds (${this.length}). Please check length first. Out of bound indices will not be tracked by MobX`);
			return undefined;
		}

		// See #734, in case property accessors are unreliable...
		set(index: number, newValue: T) {
			const currentLength = getInternalLength.call(this)
			if (index < currentLength) {
				// update at index in range
				onSet.call(this, index, newValue);
			} else if (index === currentLength) {
				// add a new item
				this.spliceWithArray(index, 0, [newValue]);
			} else {
				// out of bounds
				throw new Error(`[mobx.array] Index out of bounds, ${index} is larger than ${currentLength}`);
			}
		}
	}

	clz.prototype.peek = onGetValues;
	Object.defineProperty(clz.prototype, "length", {
		enumerable: false, configurable: false,
		get: onGetLength,
		set: Object.getOwnPropertyDescriptor(clz.prototype, "length").set
	});

	declareIterator(clz.prototype, function() {
		return arrayAsIterator(this.slice());
	});

	/**
	 * Wrap function from prototype
	 */
	[
		"every",
		"filter",
		"forEach",
		"indexOf",
		"join",
		"lastIndexOf",
		"map",
		"reduce",
		"reduceRight",
		"slice",
		"some",
		"toString",
		"toLocaleString"
	].forEach(funcName => {
		const baseFunc = Array.prototype[funcName];
		invariant(typeof baseFunc === "function", `Base function not defined on Array prototype: '${funcName}'`);
		addHiddenProp(clz.prototype, funcName, function() {
			// optimization: `getValues.call(this)` instead of peak
			return baseFunc.apply(this.peek(), arguments);
		});
	});


	/**
	 * We don't want those to show up in `for (const key in ar)` ...
	 */
	makeNonEnumerable(clz.prototype, [
		"constructor",
		"clear",
		"concat",
		"get",
		"length",
		"replace",
		"toJS",
		"toJSON",
		"peek",
		"find",
		"findIndex",
		"splice",
		"spliceWithArray",
		"push",
		"pop",
		"set",
		"shift",
		"unshift",
		"reverse",
		"sort",
		"remove",
		"toString",
		"toLocaleString"
	]);

	return clz as any;
}

// See #364
const ENTRY_0 = createArrayEntryDescriptor(0);

function createArrayEntryDescriptor(index: number) {
	return {
		enumerable: false,
		configurable: false,
		get: function() {
			// TODO: Check `this`?, see #752?
			return this.get(index);
		},
		set: function(value) {
			debugger;
			this.set(index, value);
		}
	};
}

function createArrayBufferItem(index: number) {
	// Optimization: faster if done on 'clz'?
	Object.defineProperty(StubArray.prototype, "" + index, createArrayEntryDescriptor(index));
}

export function reserveArrayBuffer(max: number) {
	const WIGGLE_ROOM = 1000;
	if (max > INTERCEPTABLE_ARRAY_BUFFER_SIZE) {
		for (let index = INTERCEPTABLE_ARRAY_BUFFER_SIZE; index < max + WIGGLE_ROOM; index++)
			createArrayBufferItem(index);
		INTERCEPTABLE_ARRAY_BUFFER_SIZE = max + WIGGLE_ROOM;
	}
}

reserveArrayBuffer(1000);
