import {IObservableArray, ObservableArray} from "../types/observablearray";
import {ObservableMap} from "../types/observablemap";
import {ObservableObject} from "../types/observableobject";
import ObservableValue, {IObservableValue, toGetterSetterFunction} from "../types/observablevalue";
import {ValueMode, getValueModeFromValue, makeChildObservable, asReference} from "../types/modifiers";
import ComputedValue from "../core/computedvalue";
import Reaction from "../core/reaction";
import {isPlainObject} from "../utils/utils";
import {allowStateChanges} from "../api/extras";

/**
	* Turns an object, array or function into a reactive structure.
	* @param value the value which should become observable.
	*/
export function observable(target:Object, key:string, baseDescriptor?:PropertyDescriptor):any;
export function observable<T>(value: T[]): IObservableArray<T>;
export function observable<T, S extends Object>(value: ()=>T, thisArg?: S): IObservableValue<T>;
export function observable<T extends string|number|boolean|Date|RegExp|Function|void>(value: T): IObservableValue<T>;
export function observable<T extends Object>(value: T): T;
export function observable(v:any, keyOrScope?:string | any) {
	if (typeof arguments[1] === "string")
		return observableDecorator.apply(null, arguments);
	switch (arguments.length) {
		case 0:
			throw new Error("[mobservable.observable] Please provide at least one argument.");
		case 1:
			break;
		case 2:
			if (typeof v === "function")
				break;
			throw new Error("[mobservable.observable] Only one argument expected.");
		default:
			throw new Error("[mobservable.observable] Too many arguments. Please provide exactly one argument, or a function and a scope.");
	}

	if (isObservable(v))
		return v;

	let [mode, value] = getValueModeFromValue(v, ValueMode.Recursive);
	const sourceType = mode === ValueMode.Reference ? ValueType.Reference : getTypeOfValue(value);

	switch(sourceType) {
		case ValueType.Reference:
		case ValueType.ComplexObject:
			return toGetterSetterFunction(new ObservableValue(value, mode, null));
		case ValueType.ComplexFunction:
			throw new Error("[mobservable.observable] To be able to make a function reactive it should not have arguments. If you need an observable reference to a function, use `observable(asReference(f))`");
		case ValueType.ViewFunction: {
			return toGetterSetterFunction(new ComputedValue(value, keyOrScope, value.name, mode === ValueMode.Structure));
		}
		case ValueType.Array:
		case ValueType.PlainObject:
			return makeChildObservable(value, mode, null);
	}
	throw "Illegal State";
}


/**
	* Extends an object with reactive capabilities.
	* @param target the object to which reactive properties should be added
	* @param properties the properties that should be added and made reactive
	* @returns targer
	*/
export function extendObservable<A extends Object, B extends Object>(target: A, ...properties: B[]): A & B {
	if (arguments.length < 2)
		throw new Error("[mobservable.extendObservable] expected 2 or more arguments");
	if (target instanceof ObservableMap || properties instanceof ObservableMap)
		throw new Error("[mobservable.extendObservable] 'extendObservable' should not be used on maps, use map.merge instead");
	properties.forEach(propSet => {
		if (!propSet || typeof target !== "object")
			throw new Error("[mobservable.extendObservable] 'extendObservable' expects one or more objects with properties to define");
		extendObservableHelper(target, propSet, ValueMode.Recursive, null);
	}); 
	return <A & B> target;
}

/**
	* Returns true if the provided value is reactive.
	* @param value object, function or array
	* @param propertyName if propertyName is specified, checkes whether value.propertyName is reactive.
	*/
export function isObservable(value, property?:string):boolean {
	if (value === null || value === undefined)
		return false;
	if (property !== undefined) {
		if (value instanceof ObservableMap || value instanceof ObservableArray)
			throw new Error("[mobservable.isObservable] isObservable(object, propertyName) is not supported for arrays and maps. Use map.has or array.length instead.");
		else if (value.$mobservable instanceof ObservableObject) {
			const o = <ObservableObject>value.$mobservable;
			return o.values && !!o.values[property];
		}
		return false;
	}
	return !!value.$mobservable || value instanceof ObservableValue || value instanceof ComputedValue || value instanceof Reaction;
}


/**
	* ES6 / Typescript decorator which can to make class properties and getter functions reactive.
	* Use this annotation to wrap properties of an object in an observable, for example:
	* class OrderLine {
	*   @observable amount = 3;
	*   @observable price = 2;
	*   @observable total() {
	*      return this.amount * this.price;
	*   }
	* }
	*/
function observableDecorator(target:Object, key:string, baseDescriptor:PropertyDescriptor) {
	if (arguments.length < 2 || arguments.length > 3)
		throw new Error("[mobservable.@observable] A decorator expects 2 or 3 arguments, got: " + arguments.length);
	// - In typescript, observable annotations are invoked on the prototype, not on actual instances,
	// so upon invocation, determine the 'this' instance, and define a property on the
	// instance as well (that hides the propotype property)
	// - In typescript, the baseDescriptor is empty for attributes without initial value
	// - In babel, the initial value is passed as the closure baseDiscriptor.initializer' 
	
	const isDecoratingGetter = baseDescriptor && baseDescriptor.hasOwnProperty("get");
	const descriptor:PropertyDescriptor = {};
	let baseValue = undefined;
	if (baseDescriptor) {
		if (baseDescriptor.hasOwnProperty('get'))
			baseValue = baseDescriptor.get;
		else if (baseDescriptor.hasOwnProperty('value'))
			baseValue = baseDescriptor.value;
		else if ((<any>baseDescriptor).initializer) { // For babel
			baseValue = (<any>baseDescriptor).initializer();
			if (typeof baseValue === "function")
				baseValue = asReference(baseValue);
		}
	}

	if (!target || typeof target !== "object")
		throw new Error(`The @observable decorator can only be used on objects`);
	if (isDecoratingGetter) {
		if (typeof baseValue !== "function")
			throw new Error(`@observable expects a getter function if used on a property (in member: '${key}').`);
		if (descriptor.set)
			throw new Error(`@observable properties cannot have a setter (in member: '${key}').`);
		if (baseValue.length !== 0)
			throw new Error(`@observable getter functions should not take arguments (in member: '${key}').`);
	}

	descriptor.configurable = true;
	descriptor.enumerable = true;
	descriptor.get = function() {
		// the getter might create a reactive property lazily, so this might even happen during a view.
		// TODO: eliminate non-strict; creating observables during views is allowed, just don't use set.
		allowStateChanges(true, () => {
			ObservableObject.asReactive(this, null,ValueMode.Recursive).set(key, baseValue);
		});
		return this[key];
	};
	descriptor.set = isDecoratingGetter 
		? () => {throw new Error(`[DerivedValue '${key}'] View functions do not accept new values`); }
		: function(value) { 
			ObservableObject.asReactive(this, null,ValueMode.Recursive).set(key, typeof value === "function" ? asReference(value) : value); 
		}
	;
	if (!baseDescriptor) {
		Object.defineProperty(target, key, descriptor); // For typescript
	} else { 
		return descriptor;
	}
}

/**
 * Internal methods
 */

export enum ValueType { Reference, PlainObject, ComplexObject, Array, ViewFunction, ComplexFunction }

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

export function extendObservableHelper(target, properties, mode: ValueMode, name: string):Object {
	var meta = ObservableObject.asReactive(target, name, mode);
	for(var key in properties) if (properties.hasOwnProperty(key)) {
		meta.set(key, properties[key]);
	}
	return target;
}
