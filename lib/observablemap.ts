import {ObservableValue} from './observablevalue';
import {ValueMode, observable, transaction, assertUnwrapped, asReference, asStructure, asFlat} from './core';
import {IObservableArray} from './interfaces';

export interface KeyValueMap<V> {
	[key:string]: V
}

export class ObservableMap<V> {
	// TODO: get id, pass to keyset and new members
	private _data: { [key:string]: ObservableValue<V> } = {};
	private _hasMap: { [key:string]: ObservableValue<boolean> } = {};
	private _keys: IObservableArray<string> = observable([]);
	private _valueMode: ValueMode;

	constructor(initialData?: KeyValueMap<V>, valueModeFunc?: Function) {
		if (valueModeFunc === asReference)
			this._valueMode = ValueMode.Reference;
		else if (valueModeFunc === asStructure)
			this._valueMode = ValueMode.Structure;
		else if (valueModeFunc === asFlat)
			this._valueMode = ValueMode.Flat;
		else if (valueModeFunc !== undefined)
			throw new Error("[mobservable.map] Second argument should be either undefined, mobservable.asReference, mobservable.asStructure or mobservable.asFlat");
		if (initialData)
			this.merge(initialData);
	}

	_has(key: string): boolean {
		return typeof this._data[key] !== 'undefined'; // https://jsperf.com/hasownproperty-vs-in-vs-undefined/12
	}
	
	has(key: string): boolean {
		this.assertValidKey(key);
		return this._updateHasMapEntry(key, false).get();
	}

	set(key: string, value: V) {
		this.assertValidKey(key);
		assertUnwrapped(value, `[mobservable.map.set] Expected unwrapped value to be inserted to key '${key}'. If you need to use modifiers pass them as second argument to the constructor`);
		if (this._has(key))
			this._data[key].set(value);
		else {
			transaction(() => {
				this._data[key] = new ObservableValue(value, this._valueMode, {
					name: "." + key,
					object: this
				});
				this._updateHasMapEntry(key, true);
				this._keys.push(key);
			}); 
		}
	}

	delete(key: string) {
		this.assertValidKey(key);
		if (this._has(key)) {
			transaction(() => {
				this._keys.remove(key);
				this._updateHasMapEntry(key, false);
				const observable = this._data[key];
				observable.set(undefined);
				if (observable.observers.length > 0 || observable.externalRefenceCount > 0)
					console.warn(`[mobservable.map.delete] Removed '${key}' from map, but its value is still being observed`);
				this._data[key] = undefined;
			});
		}
	}

	_updateHasMapEntry(key: string, value: boolean): ObservableValue<boolean> {
		let entry = this._hasMap[key];
		if (entry) {
			entry.set(value);
		} else {
			entry = new ObservableValue(value, ValueMode.Reference, {
				name: ".(has)" + key,
				object: this
			});
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

	merge(other:ObservableMap<V> | KeyValueMap<V>) {
		if (other instanceof ObservableMap)
			other.keys().forEach(key => this.set(key, other.get(key)));
		else
			Object.keys(other).forEach(key => this.set(key, other[key]));
	}

	clear() {
		transaction(() => {
			this.keys().forEach(this.delete, this);
		});
	}

	size(): number {
		return this._keys.length;
	}

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
		return "[mobservable.map {" + this.keys().map(key => `${key}: ${"" + this.get(key)}`).join(",") + "}]";
	}
}