import {observable} from "../api/observable";
import {ObservableMap, IMapEntries, IKeyValueMap} from "../types/observablemap";
import {fail, deprecated} from "../utils/utils";

export function asReference<T>(value: T): T {
	deprecated("asReference is deprecated, use modifiers.ref instead");
	return observable.ref(value);
}

export function asStructure<T>(value: T): T {
	return fail("asStructure is deprecated. Use computed.struct or reaction options instead.");
}

export function asFlat<T>(value: T): T {
	deprecated("asFlat is deprecated, use modifiers.shallow instead");
	return observable.shallow(value);
}

export function asMap(): ObservableMap<any>;
export function asMap<T>(): ObservableMap<T>;
export function asMap<T>(entries: IMapEntries<T>): ObservableMap<T>;
export function asMap<T>(data: IKeyValueMap<T>): ObservableMap<T>;
export function asMap(data?): ObservableMap<any> {
	deprecated("asMap is deprecated, use observable.map or observable.shallowMap instead");
	return observable.map(data || {})
}
