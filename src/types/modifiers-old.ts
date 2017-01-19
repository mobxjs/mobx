import {observable} from "../api/observable";
import {ObservableMap, IMapEntries, IKeyValueMap} from "../types/observablemap";
import {deprecated} from "../utils/utils";

export function asReference<T>(value: T): T {
	deprecated("asReference is deprecated, use observable.ref instead");
	return observable.ref(value);
}

export function asStructure<T>(value: T): T {
	deprecated("asStructure is deprecated. Use observable.struct, computed.struct or reaction options instead.");
	return observable.struct(value);
}

export function asFlat<T>(value: T): T {
	deprecated("asFlat is deprecated, use observable.shallow instead");
	return observable.shallow(value);
}

export function asMap(): ObservableMap<any>;
export function asMap<T>(): ObservableMap<T>;
export function asMap<T>(entries: IMapEntries<T>): ObservableMap<T>;
export function asMap<T>(data: IKeyValueMap<T>): ObservableMap<T>;
export function asMap(data?): ObservableMap<any> {
	deprecated("asMap is deprecated, use observable.map or observable.shallowMap instead");
	return observable.map(data || {});
}
