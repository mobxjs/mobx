import {isPlainObject, invariant} from "../utils/utils";
import {isObservable} from "../api/isobservable";
import {extendObservableHelper} from "../api/extendobservable";
import {createObservableArray} from "../types/observablearray";
import {map, ObservableMap, IMapEntries, IKeyValueMap} from "../types/observablemap";

export enum ValueMode {
	Recursive, // If the value is an plain object, it will be made reactive, and so will all its future children.
	Reference, // Treat this value always as a reference, without any further processing.
	Structure, // Similar to recursive. However, this structure can only exist of plain arrays and objects.
				// No observers will be triggered if a new value is assigned (to a part of the tree) that deeply equals the old value.
	Flat       // If the value is an plain object, it will be made reactive, and so will all its future children.
}


/**
	* Can be used in combination with makeReactive / extendReactive.
	* Enforces that a reference to 'value' is stored as property,
	* but that 'value' itself is not turned into something reactive.
	* Future assignments to the same property will inherit this behavior.
	* @param value initial value of the reactive property that is being defined.
	*/
export function asReference<T>(value: T): T {
	// unsound typecast, but in combination with makeReactive, the end result should be of the correct type this way
	// e.g: makeReactive({ x : asReference(number)}) -> { x : number }
	return <T><any> new AsReference(value);
}

/**
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
	return <T><any>new AsStructure(value);
}

/**
	* Can be used in combination with makeReactive / extendReactive.
	* The value will be made reactive, but, if the value is an object or array,
	* children will not automatically be made reactive as well.
	*/
export function asFlat<T>(value: T): T {
	return <T><any> new AsFlat(value);
}

export class AsReference {
	constructor(public value: any) {
		assertUnwrapped(value, "Modifiers are not allowed to be nested");
	}
}

export class AsStructure {
	constructor(public value: any) {
		assertUnwrapped(value, "Modifiers are not allowed to be nested");
	}
}

export class AsFlat {
	constructor(public value: any) {
		assertUnwrapped(value, "Modifiers are not allowed to be nested");
	}
}

export function asMap<T>(): ObservableMap<T>;
export function asMap<T>(entries: IMapEntries<T>, modifierFunc?: Function): ObservableMap<T>;
export function asMap<T>(data: IKeyValueMap<T>, modifierFunc?: Function): ObservableMap<T>;
export function asMap(data?, modifierFunc?): ObservableMap<any> {
	return map(data, modifierFunc);
}

export function getValueModeFromValue(value: any, defaultMode: ValueMode): [ValueMode, any] {
	if (value instanceof AsReference)
		return [ValueMode.Reference, value.value];
	if (value instanceof AsStructure)
		return [ValueMode.Structure, value.value];
	if (value instanceof AsFlat)
		return [ValueMode.Flat, value.value];
	return [defaultMode, value];
}

export function getValueModeFromModifierFunc(func?: Function): ValueMode {
	if (func === asReference)
		return ValueMode.Reference;
	else if (func === asStructure)
		return ValueMode.Structure;
	else if (func === asFlat)
		return ValueMode.Flat;
	invariant(func === undefined, "Cannot determine value mode from function. Please pass in one of these: mobx.asReference, mobx.asStructure or mobx.asFlat, got: " + func);
	return ValueMode.Recursive;
}


export function makeChildObservable(value, parentMode: ValueMode, name?: string) {
	let childMode: ValueMode;
	if (isObservable(value))
		return value;

	switch (parentMode) {
		case ValueMode.Reference:
			return value;
		case ValueMode.Flat:
			assertUnwrapped(value, "Items inside 'asFlat' cannot have modifiers");
			childMode = ValueMode.Reference;
			break;
		case ValueMode.Structure:
			assertUnwrapped(value, "Items inside 'asStructure' cannot have modifiers");
			childMode = ValueMode.Structure;
			break;
		case ValueMode.Recursive:
			[childMode, value] = getValueModeFromValue(value, ValueMode.Recursive);
			break;
		default:
			invariant(false, "Illegal State");
	}

	if (Array.isArray(value))
		return createObservableArray(<[]> value, childMode, name);
	if (isPlainObject(value) && Object.isExtensible(value))
		return extendObservableHelper(value, value, childMode, name);
	return value;
}

export function assertUnwrapped(value, message) {
	if (value instanceof AsReference || value instanceof AsStructure || value instanceof AsFlat)
		throw new Error(`[mobx] asStructure / asReference / asFlat cannot be used here. ${message}`);
}
