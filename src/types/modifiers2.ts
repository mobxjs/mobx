import {fail, isPlainObject, deepEquals} from "../utils/utils";
import {isObservable} from "../api/isobservable";
import {observable} from "../api/observable";
import {createObservableArray} from "../types/observablearray";

export interface IModifier<S, T> {
	(newValue: S, currentValue?: T): T;
}

export interface IModifierDescriptor<S, T> {
	isMobxModifierDescriptor: boolean;
	initialValue: S | undefined;
	modifier: IModifier<S, T>;
};

export interface IModifierFunc<S, T> {
	// right hand / assignments / property description initialization
	(initialValue: S): T;
	// left hand side: decorator
	(target: Object, key: string, baseDescriptor: PropertyDescriptor): PropertyDescriptor;
}


export function createModifierForObservabe<S, T>(def: IModifier<S, T>): IModifierFunc<S, T> {
	// const modifierDecorator = createDecoratorForModifier(def);

	// the created modifier function
	return function applyModifier() {
		switch (arguments.length) {
			case 0:
			case 1:
				return createModifierDescriptor(def, arguments[0]);
			// case 3:
				// return modifierDecorator;
			default:
				return fail("Invalid invocation of modifier. Either invoke it as decorator, or with zero to two arguments");
		}
	} as any;
}

function createModifierDescriptor<S, T>(modifier: IModifier<S, T>, initialValue: S | undefined): IModifierDescriptor<S, T> {
	return {
		isMobxModifierDescriptor: true,
		initialValue,
		modifier
	};
}

export function isModifierDescriptor(thing): thing is IModifierDescriptor<any, any> {
	return typeof thing === "object" && thing !== null && thing.isMobxModifierDescriptor === true;
}

export function recursiveModifier(newValue) {
	if ((isPlainObject(newValue) || Array.isArray(newValue)) && !isObservable(newValue))
		return observable(newValue);
	return newValue;
}

export function shallowModifier(newValue) {
	if (isPlainObject(newValue) && !isObservable(newValue)) {
		const newPropSet = {};
		// TODO: exclude action, computed!
		for (var key in newValue)
			newPropSet[key] = /* TODO: observable.ref*/(newValue[key])
		return observable(newPropSet);
	} else if (Array.isArray(newValue) && !isObservable) {
		return createObservableArray(newValue, referenceModifier);
	}
	return newValue;
}

export function referenceModifier(newValue) {
	return newValue;
}

export function structureModifier(newValue, oldValue) {
	return deepEquals(newValue, oldValue) ? oldValue : newValue;
}
