import {isPlainObject, deepEquals} from "../utils/utils";
import {isObservable} from "../api/isobservable";
import {observable} from "../api/observable";
import {createObservableArray} from "../types/observablearray";
import {IObservableMapInitialValues, ObservableMap, isObservableMap} from "../types/observablemap";
import {extendObservable} from "../api/extendobservable";

export interface IModifierImpl<S, T> {
	(newValue: S, oldValue?: T): T;
}

export interface IModifier<S, T> {
	isMobxModifier: boolean;
	implementation: IModifierImpl<S, T>;
	(initialValue: S): T & IModifierDescriptor<S, T>;
}

export interface IModifierDescriptor<S, T> {
	isMobxModifierDescriptor: boolean;
	initialValue: S | undefined;
	modifier: IModifier<S, T>;
}

export interface IModifiersFactoryA {
	// factories for modifers, handles:
	// 1: @observable(modifier.ref) field = value
	// 2: extendObservable(target, { field: modifier.ref(value) })
	ref<T>(initialValue: T): IModifierDescriptor<T, T>;
	shallow<T>(initialValue: T[]): IModifierDescriptor<T[], T[]>;
	shallow<T extends Object>(initialValue: T): IModifierDescriptor<T, T>;
	recursive<T>(initialValue: T): IModifierDescriptor<T, T>;
	structure<T>(initialValue: T): IModifierDescriptor<T, T>;
	map<T>(initialValue: IObservableMapInitialValues<T>): IModifierDescriptor<IObservableMapInitialValues<T>, ObservableMap<T>>;
	shallowMap<T>(initialValue: IObservableMapInitialValues<T>): IModifierDescriptor<IObservableMapInitialValues<T>, ObservableMap<T>>;
}
// MWE: modifiers type split into two, to make sure that ref is by default generic
export interface IModifiersFactoryB {
	ref: IModifier<any, any>;
	shallow: IModifier<any, any>;
	recursive: IModifier<any, any>;
	structure: IModifier<any, any>;
	map: IModifier<any, any>;
	shallowMap: IModifier<any, any>;
}

export const modifiers: IModifiersFactoryA & IModifiersFactoryB = {} as any;

export function isModifierDescriptor(thing): thing is IModifierDescriptor<any, any> {
	return typeof thing === "object" && thing !== null && thing.isMobxModifierDescriptor === true;
}

export function isModifier(thing): thing is IModifier<any, any> {
	return typeof thing === "function" && thing.isMobxModifier === true;
}

/**
 * Modifier implementation
 */
modifiers.ref = createModifier(referenceModifierImpl);
modifiers.shallow = createModifier(shallowModifierImpl);
modifiers.recursive = createModifier(recursiveModifierImpl);
modifiers.structure = createModifier(structureModifierImpl);
modifiers.map = createModifier(mapModifierImpl);
modifiers.shallowMap = createModifier(shallowMapModifierImpl);

Object.keys(modifiers).forEach(mod => {
	observable[mod] = createDecoratorForModifier(modifiers[mod]);
});

export function createModifier<S, T>(modifier: IModifierImpl<S, T>): IModifier<S, T> {
	const res: IModifier<S, T> = ((initialValue: S) => createModifierDescriptor(res, initialValue)) as any;
	res.isMobxModifier = true;
	res.implementation = modifier;
	return res;
}

function createModifierDescriptor<S, T>(modifier: IModifier<S, T>, initialValue: S | undefined): IModifierDescriptor<S, T> {
	return {
		isMobxModifierDescriptor: true,
		initialValue,
		modifier
	};
}

function createDecoratorForModifier<S, T>(modifier: IModifier<S, T>) {
	// TODO: implement
	//return (observableDecorator as any)(modifier); // Todo fix type
}

function recursiveModifierImpl(newValue) {
	if ((isPlainObject(newValue) || Array.isArray(newValue)) && !isObservable(newValue))
		return observable(newValue, modifiers.recursive);
	return newValue;
}

function shallowModifierImpl(newValue) {
	if (isPlainObject(newValue) && !isObservable(newValue)) {
		return extendObservable({}, modifiers.ref, newValue);
	} else if (Array.isArray(newValue) && !isObservable) {
		return createObservableArray(newValue, modifiers.ref);
	}
	// TODO: support map
	return newValue;
}

function referenceModifierImpl(newValue) {
	return newValue;
}

function structureModifierImpl(newValue, oldValue) {
	return deepEquals(newValue, oldValue) ? oldValue : newValue;
}

function mapModifierImpl(newValue) {
	if (isObservableMap(newValue))
		return newValue;
	return new ObservableMap(newValue, modifiers.recursive);
}

function shallowMapModifierImpl(newValue) {
	if (isObservableMap(newValue))
		return newValue;
	return new ObservableMap(newValue, modifiers.ref);
}
