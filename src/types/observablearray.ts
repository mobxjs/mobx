import {isObject, createInstanceofPredicate, getNextId, makeNonEnumerable, Lambda, EMPTY_ARRAY, addHiddenFinalProp, addHiddenProp, invariant} from "../utils/utils";
import {createFauxArrayBasedClass, reserveArrayBuffer, IFauxArray} from "../utils/fauxarray";
import {BaseAtom} from "../core/atom";
import {checkIfStateModificationsAreAllowed} from "../core/derivation";
import {IInterceptable, IInterceptor, hasInterceptors, registerInterceptor, interceptChange} from "./intercept-utils";
import {IListenable, registerListener, hasListeners, notifyListeners} from "./listen-utils";
import {isSpyEnabled, spyReportStart, spyReportEnd} from "../core/spy";
import {arrayAsIterator, declareIterator} from "../utils/iterable";
import {IEnhancer} from "../types/modifiers";

const MAX_SPLICE_SIZE = 10000; // See e.g. https://github.com/mobxjs/mobx/issues/859

export interface IObservableArray<T> extends IFauxArray<T> {
	observe(listener: (changeData: IArrayChange<T>|IArraySplice<T>) => void, fireImmediately?: boolean): Lambda;
	intercept(handler: IInterceptor<IArrayChange<T> | IArraySplice<T>>): Lambda;
	intercept<T>(handler: IInterceptor<IArrayChange<T> | IArraySplice<T>>): Lambda; // TODO: remove in 4.0
}

// In 3.0, change to IArrayDidChange
export interface IArrayChange<T> {
	type: "update";
	object: IObservableArray<T>;
	index: number;
	newValue: T;
	oldValue: T;
}

// In 3.0, change to IArrayDidSplice
export interface IArraySplice<T> {
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

class ObservableArrayAdministration<T> implements IInterceptable<IArrayWillChange<T> | IArrayWillSplice<T>>, IListenable {
	atom: BaseAtom;
	values: T[];
	interceptors = null;
	changeListeners = null;
	enhancer: (newV: T, oldV: T | undefined) => T;

	constructor(name, enhancer: IEnhancer<T>, public array: IObservableArray<T>, public owned: boolean) {
		this.atom = new BaseAtom(name || ("ObservableArray@" + getNextId()));
		this.enhancer = (newV, oldV) => enhancer(newV, oldV, name + "[..]");
	}

	intercept(handler: IInterceptor<IArrayChange<T> | IArraySplice<T>>): Lambda {
		return registerInterceptor<IArrayChange<T>|IArraySplice<T>>(this, handler);
	}

	observe(listener: (changeData: IArrayChange<T>|IArraySplice<T>) => void, fireImmediately = false): Lambda {
		if (fireImmediately) {
			listener(<IArraySplice<T>>{
				object: this.array,
				type: "splice",
				index: 0,
				added: this.values.slice(),
				addedCount: this.values.length,
				removed: [],
				removedCount: 0
			});
		}
		return registerListener(this, listener);
	}

	spliceWithArray(index: number, deleteCount: number, newItems: T[]): T[] {
		checkIfStateModificationsAreAllowed(this.atom);

		if (hasInterceptors(this)) {
			const change = interceptChange<IArrayWillSplice<T>>(this as any, {
				object: this.array,
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

		newItems = <T[]> newItems.map(v => this.enhancer(v, undefined));
		const lengthDelta = newItems.length - deleteCount;
		reserveArrayBuffer(this.values.length + lengthDelta);
		const res = this.spliceItemsIntoValues(index, deleteCount, newItems);

		if (deleteCount !== 0 || newItems.length !== 0)
			this.notifyArraySplice(index, newItems, res);
		return res;
	}

	spliceItemsIntoValues(index, deleteCount, newItems: T[]): T[] {
		if (newItems.length < MAX_SPLICE_SIZE) {
			return this.values.splice(index, deleteCount, ...newItems);
		} else {
			const res = this.values.slice(index, index + deleteCount)
			this.values = this.values.slice(0, index).concat(newItems, this.values.slice(index + deleteCount ))
			return res;
		}
	}

	notifyArrayChildUpdate<T>(index: number, newValue: T, oldValue: T) {
		const notifySpy = !this.owned && isSpyEnabled();
		const notify = hasListeners(this);
		const change = notify || notifySpy ? {
				object: this.array,
				type: "update",
				index, newValue, oldValue
			} : null;

		if (notifySpy)
			spyReportStart(change);
		this.atom.reportChanged();
		if (notify)
			notifyListeners(this, change);
		if (notifySpy)
			spyReportEnd();
	}

	notifyArraySplice<T>(index: number, added: T[], removed: T[]) {
		const notifySpy = !this.owned && isSpyEnabled();
		const notify = hasListeners(this);
		const change = notify || notifySpy ? {
				object: this.array,
				type: "splice",
				index, removed, added,
				removedCount: removed.length,
				addedCount: added.length
			} : null;

		if (notifySpy)
			spyReportStart(change);
		this.atom.reportChanged();
		// conform: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe
		if (notify)
			notifyListeners(this, change);
		if (notifySpy)
			spyReportEnd();
	}
}

export class ObservableArray<T> extends createFauxArrayBasedClass(
	function length() {
		const impl = this.$mobx;
		impl.atom.reportObserved();
		return impl.values.length;
	},
	function values(): T[] {
		const adm = this.$mobx as ObservableArrayAdministration<any>;
		adm.atom.reportObserved();
		return adm.values;
	},
	function spliceWithArray(index: number, deleteCount: number, newItems: T[]): T[] {
		return this.$mobx.spliceWithArray(index, deleteCount, newItems)
	},
	function get(index: number): T {
		// range checks are preformed by interceptable array
		const adm = this.$mobx as ObservableArrayAdministration<any>;
		adm.atom.reportObserved();
		return adm.values[index];
	},
	function set(index: number, newValue: T): void {
		const adm = this.$mobx as ObservableArrayAdministration<any>;
		const values = adm.values;
		// range checks are preformed by interceptable array
		checkIfStateModificationsAreAllowed(adm.atom);
		const oldValue = values[index];
		if (hasInterceptors(adm)) {
			const change = interceptChange<IArrayWillChange<T>>(adm as any, {
				type: "update",
				object: this as any,
				index, newValue
			});
			if (!change)
				return;
			newValue = change.newValue;
		}
		newValue = adm.enhancer(newValue, oldValue);
		const changed = newValue !== oldValue;
		if (changed) {
			values[index] = newValue;
			adm.notifyArrayChildUpdate(index, newValue, oldValue);
		}
	},
	function getInternalLength() {
		return this.$mobx.values.length
	}
) {
	private $mobx: ObservableArrayAdministration<T>;

	constructor(initialValues: T[] | undefined, enhancer: IEnhancer<T>, name = "ObservableArray@" + getNextId(), owned = false) {
		super();

		const adm = new ObservableArrayAdministration<T>(name, enhancer, this as any, owned);
		addHiddenFinalProp(this, "$mobx", adm);

		// TODO: simplify to just a splice?
		if (initialValues && initialValues.length) {
			reserveArrayBuffer(initialValues.length);
			adm.values = initialValues.map(v => enhancer(v, undefined, name + "[..]"));
			adm.notifyArraySplice(0, adm.values.slice(), EMPTY_ARRAY);
		} else {
			adm.values = [];
		}
	}

	intercept(handler: IInterceptor<IArrayChange<T> | IArraySplice<T>>): Lambda {
		return this.$mobx.intercept(handler);
	}

	observe(listener: (changeData: IArrayChange<T>|IArraySplice<T>) => void, fireImmediately = false): Lambda {
		return this.$mobx.observe(listener, fireImmediately);
	}

	move(fromIndex: number, toIndex: number): void {
		const oldItems = this.$mobx.values;
		const length = oldItems.length;
		function checkIndex(index: number) {
			if (index < 0) {
				throw new Error(`[mobx.array] Index out of bounds: ${index} is negative`);
			}
			if (index >= length) {
				throw new Error(`[mobx.array] Index out of bounds: ${index} is not smaller than ${length}`);
			}
		}
		checkIndex.call(this, fromIndex);
		checkIndex.call(this, toIndex);
		if (fromIndex === toIndex) {
			return;
		}
		let newItems: T[];
		if (fromIndex < toIndex) {
			newItems = [...oldItems.slice(0, fromIndex), ...oldItems.slice(fromIndex + 1, toIndex + 1), oldItems[fromIndex], ...oldItems.slice(toIndex + 1)];
		} else {	// toIndex < fromIndex
			newItems = [...oldItems.slice(0, toIndex), oldItems[fromIndex], ...oldItems.slice(toIndex, fromIndex), ...oldItems.slice(fromIndex + 1)];
		}
		(this as any).replace(newItems);
	}
}

makeNonEnumerable(ObservableArray.prototype, [
	"constructor",
	"intercept",
	"move",
	"observe"
]);

const isObservableArrayAdministration = createInstanceofPredicate("ObservableArrayAdministration", ObservableArrayAdministration);

export function isObservableArray(thing): thing is IObservableArray<any> {
	return isObject(thing) && isObservableArrayAdministration(thing.$mobx);
}
