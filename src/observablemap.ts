import {ObservableValue} from './dnode';
import {ValueMode, observable, assertUnwrapped, getValueModeFromModifierFunc} from './core';
import {IObservableArray, Lambda, IObjectChange} from './interfaces';
import SimpleEventEmitter from './simpleeventemitter';
import {isComputingView, transaction} from './dnode';
import {ObservableArray} from './observablearray';
import {isPlainObject} from './utils';

export interface KeyValueMap<V> {
	[key:string]: V
}

export type Entries<V> = [string, V][]

export type IObservableMapChange<T> = IObjectChange<T, ObservableMap<T>>;

export class ObservableMap<V> {
	$mobservable = {};
	private _data: { [key:string]: ObservableValue<V> } = {};
	private _hasMap: { [key:string]: ObservableValue<boolean> } = {}; // hasMap, not hashMap >-).
	private _keys: IObservableArray<string> = <any> new ObservableArray(null, ValueMode.Reference, false, ".keys()");
	private _valueMode: ValueMode;
	private _events = new SimpleEventEmitter();

	constructor(initialData?: Entries<V> | KeyValueMap<V>, valueModeFunc?: Function) {
		this._valueMode = getValueModeFromModifierFunc(valueModeFunc);
		if (isPlainObject(initialData))
			this.merge(<KeyValueMap<V>> initialData);
		else if (Array.isArray(initialData))
			initialData.forEach(([key, value]) => this.set(key, value));
	}

	_has(key: string): boolean {
		return typeof this._data[key] !== 'undefined';
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
			const oldValue = (<any>this._data[key])._value;
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
			const oldValue = (<any>this._data[key])._value;
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

	_updateHasMapEntry(key: string, value: boolean): ObservableValue<boolean> {
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

	entries(): Entries<V> {
		return this.keys().map(key => <[string, V]>[key, this.get(key)]);
	}

	forEach(callback:(value:V, key:string, object:KeyValueMap<V>)=> void, thisArg?) {
		this.keys().forEach(key => callback.call(thisArg, this.get(key), key));
	}

	/** Merge another object into this object, returns this. */
	merge(other:ObservableMap<V> | KeyValueMap<V>):ObservableMap<V> {
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
	toJs(): KeyValueMap<V> {
		const res:KeyValueMap<V> = {};
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
	observe(callback: (changes:IObservableMapChange<V>) => void): Lambda {
		return this._events.on(callback);
	}
}