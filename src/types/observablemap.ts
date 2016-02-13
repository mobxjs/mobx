import {ValueMode, assertUnwrapped, getValueModeFromModifierFunc} from "./modifiers";
import {IObjectChange} from "./observableobject";
import {SimpleEventEmitter} from "../utils/simpleeventemitter";
import {transaction} from "../core/transaction";
import {ObservableArray, IObservableArray} from "./observablearray";
import {ObservableValue} from "./observablevalue";
import {isPlainObject, Lambda} from "../utils/utils";

export interface IKeyValueMap<V> {
	[key: string]: V;
}

export type IMapEntries<V> = [string, V][]

export interface IObservableMapChange<T> extends IObjectChange<T, ObservableMap<T>> { }

export class ObservableMap<V> {
	$mobservable = {};
	private _data: { [key: string]: ObservableValue<V> } = {};
	private _hasMap: { [key: string]: ObservableValue<boolean> } = {}; // hasMap, not hashMap >-).
	private _keys: IObservableArray<string> = <any> new ObservableArray(null, ValueMode.Reference, ".keys()");
	private _valueMode: ValueMode;
	private _events = new SimpleEventEmitter();

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
		this.assertValidKey(key);
		if (this._hasMap[key])
			return this._hasMap[key].get();
		return this._updateHasMapEntry(key, false).get();
	}

	set(key: string, value: V) {
		this.assertValidKey(key);
		assertUnwrapped(value, `[mobservable.map.set] Expected unwrapped value to be inserted to key '${key}'. If you need to use modifiers pass them as second argument to the constructor`);
		if (this._has(key)) {
			const oldValue = (<any>this._data[key]).value;
			const changed = this._data[key].set(value);
			if (changed) {
				this._events.emit(<IObservableMapChange<V>>{
					type: "update",
					object: this,
					name: key,
					oldValue
				});
			}
		}
		else {
			transaction(() => {
				this._data[key] = new ObservableValue(value, this._valueMode, "." + key);
				this._updateHasMapEntry(key, true);
				this._keys.push(key);
			});
			this._events.emit(<IObservableMapChange<V>>{
				type: "add",
				object: this,
				name: key
			});
		}
	}

	delete(key: string) {
		this.assertValidKey(key);
		if (this._has(key)) {
			const oldValue = (<any>this._data[key]).value;
			transaction(() => {
				this._keys.remove(key);
				this._updateHasMapEntry(key, false);
				const observable = this._data[key];
				observable.set(undefined);
				this._data[key] = undefined;
			});
			this._events.emit(<IObservableMapChange<V>>{
				type: "delete",
				object: this,
				name: key,
				oldValue
			});
		}
	}

	private _updateHasMapEntry(key: string, value: boolean): ObservableValue<boolean> {
		// optimization; don't fill the hasMap if we are not observing, or remove entry if there are no observers anymore
		let entry = this._hasMap[key];
		if (entry) {
			entry.set(value);
		} else {
			entry = this._hasMap[key] = new ObservableValue(value, ValueMode.Reference, ".(has)" + key);
		}
		return entry;
	}

	get(key: string): V {
		this.assertValidKey(key);
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
		});
		return this;
	}

	clear() {
		transaction(() => {
			this.keys().forEach(this.delete, this);
		});
	}

	get size(): number {
		return this._keys.length;
	}

	/**
	 * Returns a shallow non observable object clone of this map.
	 * Note that the values migth still be observable. For a deep clone use mobservable.toJSON.
	 */
	toJs(): IKeyValueMap<V> {
		const res: IKeyValueMap<V> = {};
		this.keys().forEach(key => res[key] = this.get(key));
		return res;
	}

	private assertValidKey(key: string) {
		if (key === null || key === undefined)
			throw new Error(`[mobservable.map] Invalid key: '${key}'`);
		if (typeof key !== "string" && typeof key !== "number")
			throw new Error(`[mobservable.map] Invalid key: '${key}'`);
	}

	toString(): string {
		return "[mobservable.map { " + this.keys().map(key => `${key}: ${"" + this.get(key)}`).join(", ") + " }]";
	}

	/**
	 * Observes this object. Triggers for the events 'add', 'update' and 'delete'.
	 * See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/observe
	 * for callback details
	 */
	observe(callback: (changes: IObservableMapChange<V>) => void): Lambda {
		return this._events.on(callback);
	}
}


/**
 * Creates a map, similar to ES6 maps (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map),
 * yet observable.
 */
export function map<V>(initialValues?: IKeyValueMap<V>, valueModifier?: Function): ObservableMap<V> {
	return new ObservableMap(initialValues, valueModifier);
}

export function isObservableMap(thing): boolean {
	return thing instanceof ObservableMap;
}
