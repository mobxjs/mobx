import {ValueMode, assertUnwrapped, getValueModeFromModifierFunc} from "./modifiers";
import {transaction} from "../core/transaction";
import {ObservableArray, IObservableArray} from "./observablearray";
import {ObservableValue, UNCHANGED} from "./observablevalue";
import {isPlainObject, Lambda, invariant} from "../utils/utils";
import {getNextId} from "../core/globalstate";
import {IInterceptable, IInterceptor, hasInterceptors, registerInterceptor, interceptChange} from "./intercept-utils";
import {IListenable, registerListener, hasListeners, notifyListeners} from "./listen-utils";
import {isSpyEnabled, spyReportStart, spyReportEnd} from "../core/spy";

export interface IKeyValueMap<V> {
	[key: string]: V;
}

export type IMapEntries<V> = [string, V][]

// In 3.0, change to IObjectMapChange
export interface IMapChange<T> {
	object: ObservableMap<T>;
	type: "update" | "add" | "delete";
	name: string;
	newValue?: any;
	oldValue?: any;
}

export interface IMapWillChange<T> {
	object: ObservableMap<T>;
	type: "update" | "add" | "delete";
	name: string;
	newValue?: any;
}

const ObservableMapMarker = {};

export class ObservableMap<V> implements IInterceptable<IMapWillChange<V>>, IListenable {
	$mobx = ObservableMapMarker;
	private _data: { [key: string]: ObservableValue<V> } = {};
	private _hasMap: { [key: string]: ObservableValue<boolean> } = {}; // hasMap, not hashMap >-).
	private _valueMode: ValueMode;
	public name = "ObservableMap";
	public id = getNextId();
	private _keys: IObservableArray<string> = <any> new ObservableArray(null, ValueMode.Reference, `${this.name}@${this.id} / keys()`, true);
	interceptors = null;
	changeListeners = null;

	constructor(initialData?: IMapEntries<V> | IKeyValueMap<V>, valueModeFunc?: Function) {
		this._valueMode = getValueModeFromModifierFunc(valueModeFunc);
		if (isPlainObject(initialData))
			this.merge(<IKeyValueMap<V>> initialData);
		else if (Array.isArray(initialData))
			initialData.forEach(([key, value]) => this.set(key, value));
	}

	private _has(key: string): boolean {
		return typeof this._data[key] !== "undefined";
	}

	has(key: string): boolean {
		if (!this.isValidKey(key))
			return false;
		if (this._hasMap[key])
			return this._hasMap[key].get();
		return this._updateHasMapEntry(key, false).get();
	}

	set(key: string, value: V) {
		this.assertValidKey(key);
		const hasKey = this._has(key);
		assertUnwrapped(value, `[mobx.map.set] Expected unwrapped value to be inserted to key '${key}'. If you need to use modifiers pass them as second argument to the constructor`);
		if (hasInterceptors(this)) {
			const change = interceptChange<IMapWillChange<V>>(this, {
				type: hasKey ? "update" : "add",
				object: this,
				newValue: value,
				name: key
			});
			if (!change)
				return;
			value = change.newValue;
		}
		if (hasKey) {
			this._updateValue(key, value);
		} else {
			this._addValue(key, value);
		}
	}

	delete(key: string) {
		if (hasInterceptors(this)) {
			const change = interceptChange<IMapWillChange<V>>(this, {
				type: "delete",
				object: this,
				name: key
			});
			if (!change)
				return;
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
			transaction(() => {
				this._keys.remove(key);
				this._updateHasMapEntry(key, false);
				const observable = this._data[key];
				observable.setNewValue(undefined);
				this._data[key] = undefined;
			}, undefined, false);
			if (notify)
				notifyListeners(this, change);
			if (notifySpy)
				spyReportEnd();

		}
	}

	private _updateHasMapEntry(key: string, value: boolean): ObservableValue<boolean> {
		// optimization; don't fill the hasMap if we are not observing, or remove entry if there are no observers anymore
		let entry = this._hasMap[key];
		if (entry) {
			entry.setNewValue(value);
		} else {
			entry = this._hasMap[key] = new ObservableValue(value, ValueMode.Reference, `${this.name}@${this.id} / Contains "${key}"`, false);
		}
		return entry;
	}

	private _updateValue(name: string, newValue: V) {
		const observable = this._data[name];
		newValue = observable.prepareNewValue(newValue) as V;
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

	private _addValue(name: string, newValue: V) {
		transaction(() => {
			const observable = this._data[name] = new ObservableValue(newValue, this._valueMode, `${this.name}@${this.id} / Entry "${name}"`, false);
			newValue = (observable as any).value; // value might have been changed
			this._updateHasMapEntry(name, true);
			this._keys.push(name);
		}, undefined, false);

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

	get(key: string): V {
		if (this.has(key))
			return this._data[key].get();
		return undefined;
	}

	keys(): string[] {
		return this._keys.slice();
	}

	values(): V[] {
		return this.keys().map(this.get, this);
	}

	entries(): IMapEntries<V> {
		return this.keys().map(key => <[string, V]>[key, this.get(key)]);
	}

	forEach(callback: (value: V, key: string, object: IKeyValueMap<V>) => void, thisArg?) {
		this.keys().forEach(key => callback.call(thisArg, this.get(key), key));
	}

	/** Merge another object into this object, returns this. */
	merge(other: ObservableMap<V> | IKeyValueMap<V>): ObservableMap<V> {
		transaction(() => {
			if (other instanceof ObservableMap)
				other.keys().forEach(key => this.set(key, other.get(key)));
			else
				Object.keys(other).forEach(key => this.set(key, other[key]));
		}, undefined, false);
		return this;
	}

	clear() {
		transaction(() => {
			this.keys().forEach(this.delete, this);
		}, undefined, false);
	}

	get size(): number {
		return this._keys.length;
	}

	/**
	 * Returns a shallow non observable object clone of this map.
	 * Note that the values migth still be observable. For a deep clone use mobx.toJSON.
	 */
	toJs(): IKeyValueMap<V> {
		const res: IKeyValueMap<V> = {};
		this.keys().forEach(key => res[key] = this.get(key));
		return res;
	}

	private isValidKey(key: string) {
		if (key === null || key === undefined)
			return false;
		if (typeof key !== "string" && typeof key !== "number")
			return false;
		return true;
	}

	private assertValidKey(key: string) {
		if (!this.isValidKey(key))
			throw new Error(`[mobx.map] Invalid key: '${key}'`);
	}

	toString(): string {
		return "[mobx.map { " + this.keys().map(key => `${key}: ${"" + this.get(key)}`).join(", ") + " }]";
	}

	/**
	 * Observes this object. Triggers for the events 'add', 'update' and 'delete'.
	 * See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/observe
	 * for callback details
	 */
	observe(listener: (changes: IMapChange<V>) => void, fireImmediately?: boolean): Lambda {
		invariant(fireImmediately !== true, "`observe` doesn't support the fire immediately property for observable maps.");
		return registerListener(this, listener);
	}

	intercept(handler: IInterceptor<IMapWillChange<V>>): Lambda {
		return registerInterceptor(this, handler);
	}
}


/**
 * Creates a map, similar to ES6 maps (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map),
 * yet observable.
 */
export function map<V>(initialValues?: IMapEntries<V> | IKeyValueMap<V>, valueModifier?: Function): ObservableMap<V> {
	return new ObservableMap(initialValues, valueModifier);
}

export function isObservableMap(thing): boolean {
	return thing instanceof ObservableMap;
}
