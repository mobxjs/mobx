import {deepEquals, makeNonEnumerable, Lambda, deprecated, EMPTY_ARRAY} from "../utils/utils";
import {Atom} from "../core/atom";
import {SimpleEventEmitter} from "../utils/simpleeventemitter";
import {ValueMode, assertUnwrapped, makeChildObservable} from "./modifiers";
import {checkIfStateModificationsAreAllowed} from "../core/derivation";

export interface IObservableArray<T> extends Array<T> {
	spliceWithArray(index: number, deleteCount?: number, newItems?: T[]): T[];
	observe(listener: (changeData: IArrayChange<T>|IArraySplice<T>) => void, fireImmediately?: boolean): Lambda;
	clear(): T[];
	peek(): T[];
	replace(newItems: T[]): T[];
	find(predicate: (item: T, index: number, array: IObservableArray<T>) => boolean, thisArg?: any, fromIndex?: number): T;
	remove(value: T): boolean;
}

export interface IArrayChange<T> {
	type:  string; // Always:  "update'
	object:  IObservableArray<T>;
	index:  number;
	oldValue:  T;
}

export interface IArraySplice<T> {
	type:  string; // Always:  'splice'
	object:  IObservableArray<T>;
	index:  number;
	removed:  T[];
	addedCount:  number;
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

interface IObservableArrayAdministration<T> {
	atom: Atom;
	values: T[];
	changeEvent: SimpleEventEmitter;
	lastKnownLength: number;
	mode: ValueMode;
	array: ObservableArray<T>;
	makeChildReactive: (item: T) => T;
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
	if  ((newItems === undefined || newItems.length === 0) && (deleteCount === 0 || length === 0))
		return [];

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
		newItems = EMPTY_ARRAY;
	else
		newItems = <T[]> newItems.map(adm.makeChildReactive);

	const lengthDelta = newItems.length - deleteCount;
	updateArrayLength(adm, length, lengthDelta); // create or remove new entries
	const res: T[] = adm.values.splice(index, deleteCount, ...newItems);

	notifyArraySplice(adm, index, res, newItems);
	return res;
}

function makeReactiveArrayItem(value) {
	// this = IObservableArrayAdministration, bound during construction
	assertUnwrapped(value, "Array values cannot have modifiers");
	if (this.mode === ValueMode.Flat || this.mode === ValueMode.Reference)
		return value;
	return makeChildObservable(value, this.mode, `${this.atom.name}@${this.atom.id} / ArrayEntry`);
}

function notifyArrayChildUpdate<T>(adm: IObservableArrayAdministration<T>, index: number, oldValue: T) {
	adm.atom.reportChanged();
	// conform: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe
	if (adm.changeEvent)
		adm.changeEvent.emit(<IArrayChange<T>>{ object: <IObservableArray<T>><any> adm.array, type: "update", index: index, oldValue: oldValue});
}

function notifyArraySplice<T>(adm: IObservableArrayAdministration<T>, index: number, deleted: T[], added: T[]) {
	if (deleted.length === 0 && added.length === 0)
		return;
	adm.atom.reportChanged();
	// conform: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe
	if (adm.changeEvent)
		adm.changeEvent.emit(<IArraySplice<T>>{ object: <IObservableArray<T>><any> adm.array, type: "splice", index: index, addedCount: added.length, removed: deleted});
}

export class ObservableArray<T> extends StubArray {
	private $mobx: IObservableArrayAdministration<T>;

	constructor(initialValues: T[], mode: ValueMode, name: string) {
		super();
		const adm = this.$mobx = <IObservableArrayAdministration<T>> {
			atom: new Atom(name || "ObservableArray"),
			values: undefined,
			changeEvent: undefined,
			lastKnownLength: 0,
			mode: mode,
			array: this,
			makeChildReactive: (v) => makeReactiveArrayItem.call(adm, v)
		};
		Object.defineProperty(this, "$mobx", {
			enumerable: false,
			configurable: false,
			writable: false
		});

		if (initialValues && initialValues.length) {
			updateArrayLength(adm, 0, initialValues.length);
			adm.values = initialValues.map(adm.makeChildReactive);
		} else
			adm.values = [];
	}

	observe(listener: (changeData: IArrayChange<T>|IArraySplice<T>) => void, fireImmediately = false): Lambda {
		if (this.$mobx.changeEvent === undefined)
			this.$mobx.changeEvent = new SimpleEventEmitter();
		if (fireImmediately)
			listener(<IArraySplice<T>>{ object: <IObservableArray<T>><any> this, type: "splice", index: 0, addedCount: this.$mobx.values.length, removed: []});
		return this.$mobx.changeEvent.on(listener);
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
	"remove",
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
		set: function(value) {
			const impl = <IObservableArrayAdministration<any>> this.$mobx;
			const values = impl.values;
			assertUnwrapped(value, "Modifiers cannot be used on array values. For non-reactive array values use makeReactive(asFlat(array)).");
			if (index < values.length) {
				checkIfStateModificationsAreAllowed();
				const oldValue = values[index];
				const changed = impl.mode === ValueMode.Structure ? !deepEquals(oldValue, value) : oldValue !== value;
				if (changed) {
					values[index] = impl.makeChildReactive(value);
					notifyArrayChildUpdate(impl, index, oldValue);
				}
			}
			else if (index === values.length)
				spliceWithArray(impl, index, 0, [value]);
			else
				throw new Error(`[mobx.array] Index out of bounds, ${index} is larger than ${values.length}`);
		},
		get: function() {
			const impl = <IObservableArrayAdministration<any>> this.$mobx;
			if (impl && index < impl.values.length) {
				impl.atom.reportObserved();
				return impl.values[index];
			}
			return undefined;
		}
	});
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
