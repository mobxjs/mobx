import {IEnhancer, deepEnhancer} from "./modifiers";
import {untracked} from "../core/derivation";
import {allowStateChanges} from "../core/action";
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

interface IMapConstructor {
	new (): IMap<any, any>;
	new <K, V>(entries?: [K, V][]): IMap<K, V>;
	readonly prototype: IMap<any, any>;
}

declare var Map: IMapConstructor;


export interface IKeyValueMap<V> {
	[key: string]: V;
}

export type IMapEntry<K, V> = [K, V];
export type IMapEntries<K, V> = IMapEntry<K, V>[];

// In 3.0, change to IObjectMapChange
export interface IMapChange<K, T> {
	object: ObservableMap<K, T>;
	type: "update" | "add" | "delete";
	name: string;
	newValue?: any;
	oldValue?: any;
}

export interface IMapWillChange<K, T> {
	object: ObservableMap<K, T>;
	type: "update" | "add" | "delete";
	name: string;
	newValue?: any;
}

const ObservableMapMarker = {};

export type IObservableMapInitialValues<K, V> = IMapEntries<K, V> | IKeyValueMap<V> | IMap<K, V>;




export class ObservableMap<K, V> implements IInterceptable<IMapWillChange<K, V>>, IListenable, IMap<K, V> {
	$mobx = ObservableMapMarker;
	private _data: IMap<K, ObservableValue<V>>;
	private _hasMap: IMap<K, ObservableValue<boolean>>; // hasMap, not hashMap >-).
	private _keys: IObservableArray<K> = <any> new ObservableArray(undefined, referenceEnhancer, `${this.name}.keys()`, true);
	interceptors = null;
	changeListeners = null;

	constructor(initialData?: IObservableMapInitialValues<K, V>, public enhancer: IEnhancer<V> = deepEnhancer, public name = "ObservableMap@" + getNextId()) {
		if (typeof Map !== 'function') {
			throw new Error('mobx.map requires Map polyfill for the current browser. Check babel-polyfill or core-js/es6/map.js');
		}
		this._data = new Map();
		this._hasMap = new Map();
		allowStateChanges(true, () => {
			this.merge(initialData);
		});
	}

	private _has(key: K): boolean {
		return this._data.has(key);
	}

	has(key: K): boolean {
		if (this._hasMap.has(key))
			return this._hasMap.get(key)!.get();
		return this._updateHasMapEntry(key, false).get();
	}

	set(key: K, value: V) {
		const hasKey = this._has(key);
		if (hasInterceptors(this)) {
			const change = interceptChange<IMapWillChange<K, V>>(this, {
				type: hasKey ? "update" : "add",
				object: this,
				newValue: value,
				name: "" + key
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

	delete(key: K): boolean {
		if (hasInterceptors(this)) {
			const change = interceptChange<IMapWillChange<K, V>>(this, {
				type: "delete",
				object: this,
				name: "" + key
			});
			if (!change)
				return false;
		}

		if (this._has(key)) {
			const notifySpy = isSpyEnabled();
			const notify = hasListeners(this);
			const change = notify || notifySpy ? <IMapChange<K, V>>{
					type: "delete",
					object: this,
					oldValue: (<any>this._data.get(key)).value,
					name: "" + key
				} : null;

			if (notifySpy)
				spyReportStart(change);
			runInTransaction(() => {
				this._keys.remove(key);
				this._updateHasMapEntry(key, false);
				const observable = this._data.get(key)!;
				observable.setNewValue(undefined as any);
				this._data.delete(key);
			});
			if (notify)
				notifyListeners(this, change);
			if (notifySpy)
				spyReportEnd();
			return true;
		}
		return false;
	}

	private _updateHasMapEntry(key: K, value: boolean): ObservableValue<boolean> {
		// optimization; don't fill the hasMap if we are not observing, or remove entry if there are no observers anymore
		let entry = this._hasMap.get(key);
		if (entry) {
			entry.setNewValue(value);
		} else {
			entry = new ObservableValue(value, referenceEnhancer, `${this.name}.${key}?`, false);
			this._hasMap.set(key, entry);
		}
		return entry;
	}

	private _updateValue(name: K, newValue: V | undefined) {
		const observable = this._data.get(name)!;
		newValue = (observable as any).prepareNewValue(newValue) as V;
		if (newValue !== UNCHANGED) {
			const notifySpy = isSpyEnabled();
			const notify = hasListeners(this);
			const change = notify || notifySpy ? <IMapChange<K, V>>{
					type: "update",
					object: this,
					oldValue: (observable as any).value,
					name: "" + name,
					newValue
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

	private _addValue(name: K, newValue: V) {
		runInTransaction(() => {
			const observable = new ObservableValue(newValue, this.enhancer, `${this.name}.${name}`, false);
			this._data.set(name, observable);
			newValue = (observable as any).value; // value might have been changed
			this._updateHasMapEntry(name, true);
			this._keys.push(name);
		});

		const notifySpy = isSpyEnabled();
		const notify = hasListeners(this);
		const change = notify || notifySpy ? <IMapChange<K, V>>{
				type: "add",
				object: this,
				name: "" + name,
				newValue
			} : null;

		if (notifySpy)
			spyReportStart(change);
		if (notify)
			notifyListeners(this, change);
		if (notifySpy)
			spyReportEnd();
	}

	get(key: K): V | undefined {
		if (this.has(key))
			return this._data.get(key)!.get();
		return undefined;
	}

	keys(): K[] & Iterator<K> {
		return arrayAsIterator(this._keys.slice());
	}

	values(): V[] & Iterator<V> {
		return (arrayAsIterator as any)(this._keys.map(this.get, this));
	}

	entries(): IMapEntries<K, V> & Iterator<IMapEntry<K, V>> {
		return arrayAsIterator(this._keys.map(key => <[K, V]>[key, this.get(key)]));
	}

	forEach(callback: (value: V, key: K, object: IMap<K, V>) => void, thisArg?) {
		this.keys().forEach(key => callback.call(thisArg, this.get(key), key, this));
	}

	/** Merge another object into this object, returns this. */
	merge(other: ObservableMap<K, V> | IKeyValueMap<V> | any): ObservableMap<K, V> {
		if (isObservableMap(other)) {
			other = other.toJS();
		}
		runInTransaction(() => {
			if (isPlainObject(other))
				// FIXME
				Object.keys(other).forEach(key => this.set((key as any) as K, other[key]));
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

	replace(values: ObservableMap<K, V> | IKeyValueMap<V> | any): ObservableMap<K, V> {
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
	 * Returns a plain object that represents this map.
	 * Note that all the keys being stringified.
	 * If there are duplicating keys after converting them to strings, behaviour is undetermined.
	 */
	toPOJO(): IKeyValueMap<V> {
		const res: IKeyValueMap<V> = {};
		this.keys().forEach(key => res["" + key] = this.get(key)!);
		return res;
	}

	/**
	 * Returns a shallow non observable object clone of this map.
	 * Note that the values migth still be observable. For a deep clone use mobx.toJS.
	 */
	toJS(): IMap<K, V> {
		const res: IMap<K, V> = new Map();
		this.keys().forEach(key => res.set(key, this.get(key)));
		return res;
	}

	toJSON(): IKeyValueMap<V> {
		// Used by JSON.stringify
		return this.toPOJO();
	}

	toString(): string {
		return this.name + "[{ " + this.keys().map(key => `${key}: ${"" + this.get(key)}`).join(", ") + " }]";
	}

	/**
	 * Observes this object. Triggers for the events 'add', 'update' and 'delete'.
	 * See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/observe
	 * for callback details
	 */
	observe(listener: (changes: IMapChange<K, V>) => void, fireImmediately?: boolean): Lambda {
		invariant(fireImmediately !== true, "`observe` doesn't support the fire immediately property for observable maps.");
		return registerListener(this, listener);
	}

	intercept(handler: IInterceptor<IMapWillChange<K, V>>): Lambda {
		return registerInterceptor(this, handler);
	}
}

declareIterator(ObservableMap.prototype, function() {
	return this.entries();
});

export function map<K, V>(initialValues?: IObservableMapInitialValues<K, V>): ObservableMap<K, V> {
	deprecated("`mobx.map` is deprecated, use `new ObservableMap` or `mobx.observable.map` instead");
	return observable.map<K, V>(initialValues);
}

/* 'var' fixes small-build issue */
export var isObservableMap = createInstanceofPredicate("ObservableMap", ObservableMap) as (thing: any) => thing is ObservableMap<any, any>;
