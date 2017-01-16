import {isObservableMap} from "../types/observablemap";
import {asObservableObject, defineObservablePropertyFromDescriptor} from "../types/observableobject";
import {isObservable} from "../api/isobservable";
import {invariant, isPropertyConfigurable, hasOwnProperty} from "../utils/utils";
import {deepEnhancer, referenceEnhancer, IEnhancer} from "../types/modifiers";

export function extendObservable<A extends Object, B extends Object>(target: A, ...properties: B[]): A & B {
	return extendObservableHelper(target, deepEnhancer, properties) as any;
}

export function extendShallowObservable<A extends Object, B extends Object>(target: A, ...properties: B[]): A & B {
	return extendObservableHelper(target, referenceEnhancer, properties) as any;
}

export function extendObservableHelper(target: Object, defaultEnhancer: IEnhancer<any>, properties: Object[]): Object {
	invariant(arguments.length >= 2, "extendObservable expected 2 or more arguments");
	invariant(typeof target === "object", "extendObservable expects an object as first argument");
	invariant(!(isObservableMap(target)), "extendObservable should not be used on maps, use map.merge instead");

	properties.forEach(propSet => {
		invariant(typeof propSet === "object", "all arguments of extendObservable should be objects");
		invariant(!isObservable(propSet), "extending an object with another observable (object) is not supported. Please construct an explicit propertymap, using `toJS` if need. See issue #540");
	});

	const adm = asObservableObject(target);
	const definedProps = {};
	// Note could be optimised if properties.length === 1
	for (let i = properties.length - 1; i >= 0; i--) {
		const propSet = properties[i];
		for (let key in propSet) if (definedProps[key] !== true && hasOwnProperty(propSet, key)) {
			definedProps[key] = true;
			if (target as any === propSet && !isPropertyConfigurable(target, key))
				continue; // see #111, skip non-configurable or non-writable props for `observable(object)`.
			const descriptor = Object.getOwnPropertyDescriptor(propSet, key);
			defineObservablePropertyFromDescriptor(adm, key, descriptor, defaultEnhancer);
		}
	}
	return target;
}
