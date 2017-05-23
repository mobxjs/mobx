import {IEnhancer, deepEnhancer} from "./modifiers";
import {untracked} from "../core/derivation";
import {IObservableArray, ObservableArray} from "./observablearray";
import {ObservableValue, UNCHANGED} from "./observablevalue";
import {createInstanceofPredicate, isPlainObject, getNextId, Lambda, invariant, deprecated, isES6Map, fail} from "../utils/utils";
import {IInterceptable, IInterceptor, hasInterceptors, registerInterceptor, interceptChange} from "./intercept-utils";
import {IListenable, registerListener, hasListeners, notifyListeners} from "./listen-utils";
import {isSpyEnabled, spyReportStart, spyReportEnd} from "../core/spy";
import {arrayAsIterator, declareIterator, Iterator} from "../utils/iterable";
import {observable} from "../api/observable";
import {runInTransaction} from "../api/transaction";
import {referenceEnhancer} from "./modifiers";
import {getMessage} from "../utils/messages";


/**
 * Map as defined by Typescript's lib.es2015.collection.d.ts
 *
 * Imported here to not require consumers to have these libs enabled in their tsconfig if not actually using maps
 */
export interface IMap<K, V> {
	clear(): void;
	delete(key: K): boolean;
	forEach(callbackfn: (value: V, index: K, map: IMap<K, V>) => void, thisArg?: any): void;
	get(key: K): V | undefined;
	has(key: K): boolean;
	set(key: K, value?: V): this;
	readonly size: number;
}


export interface IKeyValueMap<V> {
	[key: string]: V;
}

export type IMapEntry<V> = [string, V];
export type IMapEntries<V> = IMapEntry<V>[];

// In 3.0, change to IObjectMapChange
export type IMapChange<T> = IMapChangeUpdate<T> | IMapChangeAdd<T> | IMapChangeDelete<T>;

export interface IMapChangeBase<T> {
	object: ObservableMap<T>;
	name: string;
}

export interface IMapChangeUpdate<T> extends IMapChangeBase<T> {
	type: "update";
	newValue: T;
	oldValue: T;
}

export interface IMapChangeAdd<T> extends IMapChangeBase<T> {
	type: "add";
	newValue: T;
}

export interface IMapChangeDelete<T>  extends IMapChangeBase<T> {
	type: "delete";
	oldValue: T;
}

export interface IMapWillChange<T> {
	object: ObservableMap<T>;
	type: "update" | "add" | "delete";
	name: string;
	newValue?: T;
}

const ObservableMapMarker = {};

export type IObservableMapInitialValues<V> = IMapEntries<V> | IKeyValueMap<V> | IMap<string, V>;

export class ObservableMap<V> implements IInterceptable<IMapWillChange<V>>, IListenable, IMap<string, V> {
	$mobx = ObservableMapMarker;
	private _data: { [key: string]: ObservableValue<V | undefined> } = Object.create(null);
	private _hasMap: { [key: string]: ObservableValue<boolean> } = Object.create(null); // hasMap, not hashMap >-).
	private _keys: IObservableArray<string> = <any> new ObservableArray(undefined, referenceEnhancer, `${this.name}.keys()`, true);
	interceptors = null;
	changeListeners = null;

	constructor(initialData?: IObservableMapInitialValues<V>, public enhancer: IEnhancer<V> = deepEnhancer, public name = "ObservableMap@" + getNextId()) {
		this.merge(initialData);
	}

	private _has(key: string): boolean {
		return typeof this._data[key] !== "undefined";
	}

	has(key: string): boolean {
		if (!this.isValidKey(key))
			return false;
		key = "" + key;
		if (this._hasMap[key])
			return this._hasMap[key].get();
		return this._updateHasMapEntry(key, false).get();
	}

	set(key: string, value?: V | undefined) {
		this.assertValidKey(key);
		key = "" + key;
		const hasKey = this._has(key);
		if (hasInterceptors(this)) {
			const change = interceptChange<IMapWillChange<V>>(this, {
				type: hasKey ? "update" : "add",
				object: this,
				newValue: value,
				name: key
			});
			if (!change)
				return this;
			value = change.newValue;
		}
		if (hasKey) {
			this._updateValue(key, value);
		} else {
			this._addValue(key, value);
		}
		return this;
	}

	delete(key: string): boolean {
		this.assertValidKey(key);
		key = "" + key;
		if (hasInterceptors(this)) {
			const change = interceptChange<IMapWillChange<V>>(this, {
				type: "delete",
				object: this,
				name: key
			});
			if (!change)
				return false;
		}

		if (this._has(key)) {
			const notifySpy = isSpyEnabled();
			const notify = hasListeners(this);
			const change = notify || notifySpy ? <IMapChange<V>>{
					type: "delete",
					object: this,
					oldValue: (<any>this._data[key]).value,
					name: key
				} : null;

			if (notifySpy)
				spyReportStart(change);
			runInTransaction(() => {
				this._keys.remove(key);
				this._updateHasMapEntry(key, false);
				const observable = this._data[key]!;
				observable.setNewValue(undefined as any);
				this._data[key] = undefined as any;
			});
			if (notify)
				notifyListeners(this, change);
			if (notifySpy)
				spyReportEnd();
			return true;
		}
		return false;
	}

	private _updateHasMapEntry(key: string, value: boolean): ObservableValue<boolean> {
		// optimization; don't fill the hasMap if we are not observing, or remove entry if there are no observers anymore
		let entry = this._hasMap[key];
		if (entry) {
			entry.setNewValue(value);
		} else {
			entry = this._hasMap[key] = new ObservableValue(value, referenceEnhancer, `${this.name}.${key}?`, false);
		}
		return entry;
	}

	private _updateValue(name: string, newValue: V | undefined) {
		const observable = this._data[name]!;
		newValue = (observable as any).prepareNewValue(newValue) as V;
		if (newValue !== UNCHANGED) {
			const notifySpy = isSpyEnabled();
			const notify = hasListeners(this);
			const change = notify || notifySpy ? <IMapChange<V>>{
					type: "update",
					object: this,
					oldValue: (observable as any).value,
					name, newValue
				} : null;

			if (notifySpy)
				spyReportStart(change);
			observable.setNewValue(newValue as V);
			if (notify)
				notifyListeners(this, change);
			if (notifySpy)
				spyReportEnd();
		}
	}

	private _addValue(name: string, newValue: V | undefined) {
		runInTransaction(() => {
			const observable = this._data[name] = new ObservableValue(newValue, this.enhancer, `${this.name}.${name}`, false);
			newValue = (observable as any).value; // value might have been changed
			this._updateHasMapEntry(name, true);
			this._keys.push(name);
		});

		const notifySpy = isSpyEnabled();
		const notify = hasListeners(this);
		const change = notify || notifySpy ? <IMapChange<V>>{
				type: "add",
				object: this,
				name, newValue
			} : null;

		if (notifySpy)
			spyReportStart(change);
		if (notify)
			notifyListeners(this, change);
		if (notifySpy)
			spyReportEnd();
	}

	get(key: string): V | undefined {
		key = "" + key;
		if (this.has(key))
			return this._data[key]!.get();
		return undefined;
	}

	keys(): string[] & Iterator<string> {
		return arrayAsIterator(this._keys.slice());
	}

	values(): V[] & Iterator<V> {
		return (arrayAsIterator as any)(this._keys.map(this.get, this));
	}

	entries(): IMapEntries<V> & Iterator<IMapEntry<V>> {
		return arrayAsIterator(this._keys.map(key => <[string, V]>[key, this.get(key)]));
	}

	forEach(callback: (value: V, key: string, object: IMap<string, V>) => void, thisArg?) {
		this.keys().forEach(key => callback.call(thisArg, this.get(key), key, this));
	}

	/** Merge another object into this object, returns this. */
	merge(other: ObservableMap<V> | IKeyValueMap<V> | any): ObservableMap<V> {
		if (isObservableMap(other)) {
			other = other.toJS();
		}
		runInTransaction(() => {
			if (isPlainObject(other))
				Object.keys(other).forEach(key => this.set(key, other[key]));
			else if (Array.isArray(other))
				other.forEach(([key, value]) => this.set(key, value));
			else if (isES6Map(other))
				other.forEach((value, key) => this.set(key, value));
			else if (other !== null && other !== undefined)
				fail("Cannot initialize map from " + other);
		});
		return this;
	}

	clear() {
		runInTransaction(() => {
			untracked(() => {
				this.keys().forEach(this.delete, this);
			});
		});
	}

	replace(values: ObservableMap<V> | IKeyValueMap<V> | any): ObservableMap<V> {
		runInTransaction(() => {
			this.clear();
			this.merge(values);
		});
		return this;
	}

	get size(): number {
		return this._keys.length;
	}

	/**
	 * Returns a shallow non observable object clone of this map.
	 * Note that the values migth still be observable. For a deep clone use mobx.toJS.
	 */
	toJS(): IKeyValueMap<V> {
		const res: IKeyValueMap<V> = {};
		this.keys().forEach(key => res[key] = this.get(key)!);
		return res;
	}

	toJSON(): IKeyValueMap<V> {
		// Used by JSON.stringify
		return this.toJS();
	}

	private isValidKey(key: string) {
		if (key === null || key === undefined)
			return false;
		if (typeof key === "string" || typeof key === "number" || typeof key === "boolean")
			return true;
		return false;
	}

	private assertValidKey(key: string) {
		if (!this.isValidKey(key))
			throw new Error(`[mobx.map] Invalid key: '${key}', only strings, numbers and booleans are accepted as key in observable maps.`);
	}

	toString(): string {
		return this.name + "[{ " + this.keys().map(key => `${key}: ${"" + this.get(key)}`).join(", ") + " }]";
	}

	/**
	 * Observes this object. Triggers for the events 'add', 'update' and 'delete'.
	 * See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/observe
	 * for callback details
	 */
	observe(listener: (changes: IMapChange<V>) => void, fireImmediately?: boolean): Lambda {
		invariant(fireImmediately !== true, getMessage("m033"));
		return registerListener(this, listener);
	}

	intercept(handler: IInterceptor<IMapWillChange<V>>): Lambda {
		return registerInterceptor(this, handler);
	}
}

declareIterator(ObservableMap.prototype, function() {
	return this.entries();
});

export function map<V>(initialValues?: IObservableMapInitialValues<V>): ObservableMap<V> {
	deprecated("`mobx.map` is deprecated, use `new ObservableMap` or `mobx.observable.map` instead");
	return observable.map<V>(initialValues);
}

/* 'var' fixes small-build issue */
export var isObservableMap = createInstanceofPredicate("ObservableMap", ObservableMap) as (thing: any) => thing is ObservableMap<any>;
