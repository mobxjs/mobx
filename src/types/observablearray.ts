import {deepEquals, makeNonEnumerable, Lambda, deprecated, EMPTY_ARRAY} from "../utils/utils";
import {Atom} from "../core/atom";
import {ValueMode, assertUnwrapped, makeChildObservable} from "./modifiers";
import {checkIfStateModificationsAreAllowed} from "../core/derivation";
import {IInterceptable, IInterceptor, hasInterceptors, registerInterceptor, interceptChange} from "./intercept-utils";
import {IListenable, registerListener, hasListeners, notifyListeners} from "./listen-utils";
import {isSpyEnabled, spyReportStart, spyReportEnd} from "../core/spy";

export interface IObservableArray<T> extends Array<T> {
	spliceWithArray(index: number, deleteCount?: number, newItems?: T[]): T[];
	observe(listener: (changeData: IArrayDidChange<T>|IArrayDidSplice<T>) => void, fireImmediately?: boolean): Lambda;
	intercept<T>(handler: IInterceptor<IArrayDidChange<T> | IArrayDidSplice<T>>): Lambda;
	clear(): T[];
	peek(): T[];
	replace(newItems: T[]): T[];
	find(predicate: (item: T, index: number, array: IObservableArray<T>) => boolean, thisArg?: any, fromIndex?: number): T;
	remove(value: T): boolean;
}

export interface IArrayDidChange<T> {
	type: "update";
	object: IObservableArray<T>;
	index: number;
	newValue: T;
	oldValue: T;
}

export interface IArrayDidSplice<T> {
	type: "splice";
	object: IObservableArray<T>;
	index: number;
	added: T[];
	addedCount: number;
	removed: T[];
	removedCount: number;
}

export interface IArrayWillChange<T> {
	type: "update";
	object: IObservableArray<T>;
	index: number;
	newValue: T;
}

export interface IArrayWillSplice<T> {
	type: "splice";
	object: IObservableArray<T>;
	index: number;
	added: T[];
	removedCount: number;
}

/**
 * This array buffer contains two lists of properties, so that all arrays
 * can recycle their property definitions, which significantly improves performance of creating
 * properties on the fly.
 */
let OBSERVABLE_ARRAY_BUFFER_SIZE = 0;

// Typescript workaround to make sure ObservableArray extends Array
export class StubArray {
}
StubArray.prototype = [];

interface IObservableArrayAdministration<T> extends IInterceptable<IArrayWillChange<T> | IArrayWillSplice<T>>, IListenable {
	atom: Atom;
	values: T[];
	lastKnownLength: number;
	mode: ValueMode;
	array: IObservableArray<T>;
	makeChildReactive: (item: T) => T;
	owned: boolean; // If owned by another object, supress global events for this object (e.g: keys in observableMap)
}

function getArrayLength(adm: IObservableArrayAdministration<any>): number {
	adm.atom.reportObserved();
	return adm.values.length;
}

function setArrayLength(adm: IObservableArrayAdministration<any>, newLength: number): number {
	if (typeof newLength !== "number" || newLength < 0)
		throw new Error("[mobx.array] Out of range: " + newLength);
	let currentLength = adm.values.length;
	if (newLength === currentLength)
		return;
	else if (newLength > currentLength)
		spliceWithArray(adm, currentLength, 0, new Array(newLength - currentLength));
	else
		spliceWithArray(adm, newLength, currentLength - newLength);
}

// adds / removes the necessary numeric properties to this object
function updateArrayLength(adm: IObservableArrayAdministration<any>, oldLength: number, delta: number) {
	if (oldLength !== adm.lastKnownLength)
		throw new Error("[mobx] Modification exception: the internal structure of an observable array was changed. Did you use peek() to change it?");
	checkIfStateModificationsAreAllowed();
	adm.lastKnownLength += delta;
	if (delta > 0 && oldLength + delta > OBSERVABLE_ARRAY_BUFFER_SIZE)
		reserveArrayBuffer(oldLength + delta);
}

function spliceWithArray<T>(adm: IObservableArrayAdministration<T>, index: number, deleteCount?: number, newItems?: T[]): T[] {
	const length = adm.values.length;

	if (index === undefined)
		index = 0;
	else if (index > length)
		index = length;
	else if (index < 0)
		index = Math.max(0, length + index);

	if (arguments.length === 2)
		deleteCount = length - index;
	else if (deleteCount === undefined || deleteCount === null)
		deleteCount = 0;
	else
		deleteCount = Math.max(0, Math.min(deleteCount, length - index));

	if (newItems === undefined)
		newItems = [];

	if (hasInterceptors(adm)) {
		const change = interceptChange<IArrayWillSplice<T>>(adm as any, {
			object: this,
			type: "splice",
			index,
			removedCount: deleteCount,
			added: newItems
		});
		if (!change)
			return EMPTY_ARRAY;
		deleteCount = change.removedCount;
		newItems = change.added;
	}

	newItems = <T[]> newItems.map(adm.makeChildReactive);
	const lengthDelta = newItems.length - deleteCount;
	updateArrayLength(adm, length, lengthDelta); // create or remove new entries
	const res: T[] = adm.values.splice(index, deleteCount, ...newItems); // FIXME: splat might exceed callstack size!

	if (deleteCount !== 0 || newItems.length !== 0)
		notifyArraySplice(adm, index, newItems, res);
	return res;
}

function makeReactiveArrayItem(value) {
	// this = IObservableArrayAdministration, bound during construction
	assertUnwrapped(value, "Array values cannot have modifiers");
	if (this.mode === ValueMode.Flat || this.mode === ValueMode.Reference)
		return value;
	return makeChildObservable(value, this.mode, `${this.atom.name}@${this.atom.id} / ArrayEntry`);
}

function notifyArrayChildUpdate<T>(adm: IObservableArrayAdministration<T>, index: number, newValue: T, oldValue: T) {
	const notifySpy = !adm.owned && isSpyEnabled();
	const notify = hasListeners(adm);
	const change = notify || notifySpy ? {
			object: adm.array,
			type: "update",
			index, newValue, oldValue
		} : null;

	if (notifySpy)
		spyReportStart(change);
	adm.atom.reportChanged();
	if (notify)
		notifyListeners(adm, change);
	if (notifySpy)
		spyReportEnd();
}

function notifyArraySplice<T>(adm: IObservableArrayAdministration<T>, index: number, added: T[], removed: T[]) {
	const notifySpy = !adm.owned && isSpyEnabled();
	const notify = hasListeners(adm);
	const change = notify || notifySpy ? {
			object: adm.array,
			type: "splice",
			index, removed, added,
			removedCount: removed.length,
			addedCount: added.length
		} : null;

	if (notifySpy)
		spyReportStart(change);
	adm.atom.reportChanged();
	// conform: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe
	if (notify)
		notifyListeners(adm, change);
	if (notifySpy)
		spyReportEnd();
}

export class ObservableArray<T> extends StubArray {
	private $mobx: IObservableArrayAdministration<T>;

	constructor(initialValues: T[], mode: ValueMode, name: string, owned = false) {
		super();
		const adm = this.$mobx = <IObservableArrayAdministration<T>> {
			atom: new Atom(name || "ObservableArray"),
			values: undefined,
			lastKnownLength: 0,
			mode: mode,
			array: this as any,
			makeChildReactive: (v) => makeReactiveArrayItem.call(adm, v),
			interceptors: null,
			owned,
			changeListeners: null
		};
		Object.defineProperty(this, "$mobx", {
			enumerable: false,
			configurable: false,
			writable: false
		});

		if (initialValues && initialValues.length) {
			updateArrayLength(adm, 0, initialValues.length);
			adm.values = initialValues.map(adm.makeChildReactive);
			notifyArraySplice(adm, 0, adm.values.slice(), EMPTY_ARRAY);
		} else {
			adm.values = [];
		}
	}

	intercept<T>(handler: IInterceptor<IArrayDidChange<T> | IArrayDidSplice<T>>): Lambda {
		return registerInterceptor<IArrayDidChange<T>|IArrayDidSplice<T>>(this.$mobx as any, handler);
	}

	observe(listener: (changeData: IArrayDidChange<T>|IArrayDidSplice<T>) => void, fireImmediately = false): Lambda {
		if (fireImmediately) {
			listener(<IArrayDidSplice<T>>{
				object: this as any,
				type: "splice",
				index: 0,
				added: this.$mobx.values.slice(),
				addedCount: this.$mobx.values.length,
				removed: [],
				removedCount: 0
			});
		}
		return registerListener(this.$mobx, listener);
	}

	clear(): T[] {
		return this.splice(0);
	}

	replace(newItems: T[]) {
		return spliceWithArray(this.$mobx, 0, this.$mobx.values.length, newItems);
	}

	toJSON(): T[] {
		this.$mobx.atom.reportObserved();
		// JSON.stringify recurses on returned objects, so this will work fine
		return this.$mobx.values.slice();
	}

	peek(): T[] {
		return this.$mobx.values;
	}

	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
	find(predicate: (item: T, index: number, array: ObservableArray<T>) => boolean, thisArg?, fromIndex = 0): T {
		this.$mobx.atom.reportObserved();
		const items = this.$mobx.values, l = items.length;
		for (let i = fromIndex; i < l; i++)
			if (predicate.call(thisArg, items[i], i, this))
				return items[i];
		return null;
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
				return spliceWithArray(this.$mobx, index);
			case 2:
				return spliceWithArray(this.$mobx, index, deleteCount);
		}
		return spliceWithArray(this.$mobx, index, deleteCount, newItems);
	}

	push(...items: T[]): number {
		spliceWithArray(this.$mobx, this.$mobx.values.length, 0, items);
		return this.$mobx.values.length;
	}

	pop(): T {
		return this.splice(Math.max(this.$mobx.values.length - 1, 0), 1)[0];
	}

	shift(): T {
		return this.splice(0, 1)[0];
	}

	unshift(...items: T[]): number {
		spliceWithArray(this.$mobx, 0, 0, items);
		return this.$mobx.values.length;
	}

	reverse(): T[] {
		this.$mobx.atom.reportObserved();
		// reverse by default mutates in place before returning the result
		// which makes it both a 'derivation' and a 'mutation'.
		// so we deviate from the default and just make it an dervitation
		const clone = (<any>this).slice();
		return clone.reverse.apply(clone, arguments);
	}

	sort(compareFn?: (a: T, b: T) => number): T[] {
		this.$mobx.atom.reportObserved();
		// sort by default mutates in place before returning the result
		// which goes against all good practices. Let's not change the array in place!
		const clone = (<any>this).slice();
		return clone.sort.apply(clone, arguments);
	}

	remove(value: T): boolean {
		const idx = this.$mobx.values.indexOf(value);
		if (idx > -1) {
			this.splice(idx, 1);
			return true;
		}
		return false;
	}

	toString(): string {
		return "[mobx.array] " + Array.prototype.toString.apply(this.$mobx.values, arguments);
	}

	toLocaleString(): string {
		return "[mobx.array] " + Array.prototype.toLocaleString.apply(this.$mobx.values, arguments);
	}
}

/**
 * We don't want those to show up in `for (const key in ar)` ...
 */
makeNonEnumerable(ObservableArray.prototype, [
	"constructor",
	"observe",
	"clear",
	"replace",
	"toJSON",
	"peek",
	"find",
	"splice",
	"push",
	"pop",
	"shift",
	"unshift",
	"reverse",
	"sort",
	"toString",
	"toLocaleString",
	"remove"
]);
Object.defineProperty(ObservableArray.prototype, "length", {
	enumerable: false,
	configurable: true,
	get: function(): number {
		return getArrayLength(this.$mobx);
	},
	set: function(newLength: number) {
		setArrayLength(this.$mobx, newLength);
	}
});


/**
 * Wrap function from prototype
 */
[
	"concat",
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
	"some"
].forEach(funcName => {
	const baseFunc = Array.prototype[funcName];
	Object.defineProperty(ObservableArray.prototype, funcName, {
		configurable: false,
		writable: true,
		enumerable: false,
		value: function() {
			this.$mobx.atom.reportObserved();
			return baseFunc.apply(this.$mobx.values, arguments);
		}
	});
});

function createArrayBufferItem(index: number) {
	Object.defineProperty(ObservableArray.prototype, "" + index, {
		enumerable: false,
		configurable: false,
		set: createArraySetter(index),
		get: createArrayGetter(index)
	});
}

function createArraySetter(index: number) {
	return function<T>(newValue: T) {
		const adm = <IObservableArrayAdministration<T>> this.$mobx;
		const values = adm.values;
		assertUnwrapped(newValue, "Modifiers cannot be used on array values. For non-reactive array values use makeReactive(asFlat(array)).");
		if (index < values.length) {
			// update at index in range 
			checkIfStateModificationsAreAllowed();
			const oldValue = values[index];
			if (hasInterceptors(adm)) {
				const change = interceptChange<IArrayWillChange<T>>(adm as any, {
					type: "update",
					object: adm.array,
					index, newValue
				});
				if (!change)
					return;
				newValue = change.newValue;
			}
			newValue = adm.makeChildReactive(newValue);
			const changed = (adm.mode === ValueMode.Structure) ? !deepEquals(oldValue, newValue) : oldValue !== newValue;
			if (changed) {
				values[index] = newValue;
				notifyArrayChildUpdate(adm, index, newValue, oldValue);
			}
		} else if (index === values.length) {
			// add a new item
			spliceWithArray(adm, index, 0, [newValue]);
		} else
			// out of bounds
			throw new Error(`[mobx.array] Index out of bounds, ${index} is larger than ${values.length}`);
	};
}

function createArrayGetter(index: number) {
	return function () {
		const impl = <IObservableArrayAdministration<any>> this.$mobx;
		if (impl && index < impl.values.length) {
			impl.atom.reportObserved();
			return impl.values[index];
		}
		return undefined;
	};
}

function reserveArrayBuffer(max: number) {
	for (let index = OBSERVABLE_ARRAY_BUFFER_SIZE; index < max; index++)
		createArrayBufferItem(index);
	OBSERVABLE_ARRAY_BUFFER_SIZE = max;
}

reserveArrayBuffer(1000);

export function createObservableArray<T>(initialValues: T[], mode: ValueMode, name: string): IObservableArray<T> {
	return <IObservableArray<T>><any> new ObservableArray(initialValues, mode, name);
}

export function fastArray<V>(initialValues?: V[]): IObservableArray<V> {
	deprecated("fastArray is deprecated. Please use `observable(asFlat([]))`");
	return createObservableArray(initialValues, ValueMode.Flat, null);
}

export function isObservableArray(thing): boolean {
	return thing instanceof ObservableArray;
}
