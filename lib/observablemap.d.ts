import { ObservableValue } from './observablevalue';
import { Lambda } from './interfaces';
export interface KeyValueMap<V> {
    [key: string]: V;
}
export declare class ObservableMap<V> {
    $mobservable: boolean;
    private _data;
    private _hasMap;
    private _keys;
    private _valueMode;
    private _events;
    constructor(initialData?: KeyValueMap<V>, valueModeFunc?: Function);
    _has(key: string): boolean;
    has(key: string): boolean;
    set(key: string, value: V): void;
    delete(key: string): void;
    _updateHasMapEntry(key: string, value: boolean): ObservableValue<boolean>;
    get(key: string): V;
    keys(): string[];
    values(): V[];
    entries(): [string, V][];
    forEach(callback: (value: V, key: string, object: KeyValueMap<V>) => void, thisArg?: any): void;
    /** Merge another object into this object, returns this. */
    merge(other: ObservableMap<V> | KeyValueMap<V>): ObservableMap<V>;
    clear(): void;
    size(): number;
    /**
     * Returns a shallow non observable object clone of this map.
     * Note that the values migth still be observable. For a deep clone use mobservable.toJSON.
     */
    toJs(): KeyValueMap<V>;
    private assertValidKey(key);
    toString(): string;
    /**
     * Observes this object. Triggers for the events 'add', 'update' and 'delete'.
     * See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/observe
     * for callback details
     */
    observe(callback: (changes: IObjectChange<V>) => void): Lambda;
}
export interface IObjectChange<T> {
    name: string;
    object: ObservableMap<T>;
    type: string;
    oldValue?: T;
}
