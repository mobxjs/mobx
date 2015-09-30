import {isPlainObject} from './utils';
import {IContextInfoStruct, IObservableValue} from './interfaces';
import {ObservableArray} from './observablearray';
import {ObservableValue} from './observablevalue';
import {ObservableView} from './observableview';
import {ObservableObject} from './observableobject';
import {isReactive, extendReactive} from './index';

export enum ValueType { Reference, PlainObject, ComplexObject, Array, ViewFunction, ComplexFunction }

export enum ValueMode {
	Recursive, // If the value is an plain object, it will be made reactive, and so will all its future children.
	Reference, // Treat this value always as a reference, without any further processing.
	Structure, // Similar to recursive. However, this structure can only exist of plain arrays and objects.
				// No observers will be triggered if a new value is assigned (to a part of the tree) that deeply equals the old value.
	Flat       // If the value is an plain object, it will be made reactive, and so will all its future children.
}

export function getTypeOfValue(value): ValueType {
	if (value === null || value === undefined)
		return ValueType.Reference;
	if (typeof value === "function")
		return value.length ? ValueType.ComplexFunction : ValueType.ViewFunction;
	if (Array.isArray(value) || value instanceof ObservableArray)
		return ValueType.Array;
	if (typeof value == 'object')
		return isPlainObject(value) ? ValueType.PlainObject : ValueType.ComplexObject;
	return ValueType.Reference; // safe default, only refer by reference..
}

export function extendReactive(target, properties, mode: ValueMode, context: IContextInfoStruct):Object {
	var meta = ObservableObject.asReactive(target, context, mode);
	for(var key in properties) if (properties.hasOwnProperty(key)) {
		meta.set(key, properties[key]);
	}
	return target;
}

export function toGetterSetterFunction<T>(observable: ObservableValue<T> | ObservableView<T>):IObservableValue<T> {
	var f:any = function(value?) {
		if (arguments.length > 0)
			observable.set(value);
		else
			return observable.get();
	};
	f.$mobservable = observable;
	f.observe = function(listener, fire) {
		return observable.observe(listener, fire);
	}
	f.toString = function() {
		return observable.toString();
	}
	return f;
}

export class AsReference {
	constructor(public value:any) {
		assertUnwrapped(value, "Modifiers are not allowed to be nested");
	}
}

export class AsStructure {
	constructor(public value:any) {
		assertUnwrapped(value, "Modifiers are not allowed to be nested");
	}
}

export class AsFlat {
	constructor(public value:any) {
		assertUnwrapped(value, "Modifiers are not allowed to be nested");
	}
}

export function getValueModeFromValue(value:any, defaultMode:ValueMode): [ValueMode, any] {
	if (value instanceof AsReference)
		return [ValueMode.Reference, value.value];
	if (value instanceof AsStructure)
		return [ValueMode.Structure, value.value];
	if (value instanceof AsFlat)
		return [ValueMode.Flat, value.value];
	return [defaultMode, value];
}

export function makeChildReactive(value, parentMode:ValueMode, context) {
	let childMode: ValueMode;
	if (isReactive(value))
		return value;

	switch (parentMode) {
		case ValueMode.Reference:
			return value;
		case ValueMode.Flat:
			assertUnwrapped(value, "Items inside 'asFlat' canont have modifiers");
			childMode = ValueMode.Reference;
			break;
		case ValueMode.Structure:
			assertUnwrapped(value, "Items inside 'asStructure' canont have modifiers");
			childMode = ValueMode.Structure;
			break;
		case ValueMode.Recursive:
			[childMode, value] = getValueModeFromValue(value, ValueMode.Recursive);
			break;
		default:
			throw "Illegal State";
	}

	if (Array.isArray(value))
		return new ObservableArray(<[]> value.slice(), childMode, context);
	if (isPlainObject(value))
		return extendReactive(value, value, childMode, context);
	return value;
}

export function assertUnwrapped(value, message) {
	if (value instanceof AsReference || value instanceof AsStructure || value instanceof AsFlat)
		throw new Error(`[mobservable] asStructure / asReference / asFlat cannot be used here. ${message}`);
}