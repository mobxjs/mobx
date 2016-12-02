import {ObservableMap, IMapEntries, IKeyValueMap} from "../types/observablemap";
import {deprecated, fail} from "../utils/utils";
import {modifiers} from "./modifiers";

/**
 * @deprecated
	* Can be used in combination with makeReactive / extendReactive.
	* Enforces that a reference to 'value' is stored as property,
	* but that 'value' itself is not turned into something reactive.
	* Future assignments to the same property will inherit this behavior.
	* @param value initial value of the reactive property that is being defined.
	*/
export function asReference<T>(value: T): T {
	fail("asReference is deprecated, use modifiers.ref instead");
	// unsound typecast, but in combination with makeReactive, the end result should be of the correct type this way
	// e.g: makeReactive({ x : asReference(number)}) -> { x : number }
	return modifiers.ref(value) as any;
}

/**
 * @deprecated
	* Can be used in combination with makeReactive / extendReactive.
	* Enforces that values that are deeply equalled identical to the previous are considered to unchanged.
	* (the default equality used by mobx is reference equality).
	* Values that are still reference equal, but not deep equal, are considered to be changed.
	* asStructure can only be used incombinations with arrays or objects.
	* It does not support cyclic structures.
	* Future assignments to the same property will inherit this behavior.
	* @param value initial value of the reactive property that is being defined.
	*/
export function asStructure<T>(value: T): T {
	fail("asStructure is deprecated, use modifiers.structure instead");
	return modifiers.structure(value) as any;
}

/**
 * @deprecated
	* Can be used in combination with makeReactive / extendReactive.
	* The value will be made reactive, but, if the value is an object or array,
	* children will not automatically be made reactive as well.
	*/
export function asFlat<T>(value: T): T {
	fail("asFlat is deprecated, use modifiers.shallow instead");
	return modifiers.shallow(value) as any;
}

export function asMap(): ObservableMap<any>;
export function asMap<T>(): ObservableMap<T>;
export function asMap<T>(entries: IMapEntries<T>, modifierFunc?: Function): ObservableMap<T>;
export function asMap<T>(data: IKeyValueMap<T>, modifierFunc?: Function): ObservableMap<T>;
export function asMap(data?, modifierFunc?): ObservableMap<any> {
	fail("asMap is deprecated, use modifiers.map / modifiers.shallowMap instead");
	if (modifierFunc === asStructure || modifierFunc === asFlat)
		return modifiers.shallowMap(data);
	return modifiers.map(data);
}
