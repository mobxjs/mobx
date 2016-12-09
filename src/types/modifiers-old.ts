import {ObservableMap, IMapEntries, IKeyValueMap} from "../types/observablemap";
import {fail} from "../utils/utils";

export function asReference<T>(value: T): T {
	return fail("asReference is deprecated, use (@)observable.ref instead");
}

export function asStructure<T>(value: T): T {
	return fail("asStructure is deprecated. Use computed.struct or reaction options instead.");
}

export function asFlat<T>(value: T): T {
	return fail("asFlat is deprecated, use modifiers.shallow instead");
}

export function asMap(): ObservableMap<any>;
export function asMap<T>(): ObservableMap<T>;
export function asMap<T>(entries: IMapEntries<T>, modifierFunc?: Function): ObservableMap<T>;
export function asMap<T>(data: IKeyValueMap<T>, modifierFunc?: Function): ObservableMap<T>;
export function asMap(data?, modifierFunc?): ObservableMap<any> {
	return fail("asMap is deprecated, use observable.map or observable.shallowMap instead");
}
