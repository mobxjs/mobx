import {ValueMode} from "../types/modifiers";
import {ObservableMap} from "../types/observablemap";
import {asObservableObject, setObservableObjectInstanceProperty} from "../types/observableobject";
import {invariant, isPropertyConfigurable} from "../utils/utils";

/**
 * Extends an object with reactive capabilities.
 * @param target the object to which reactive properties should be added
 * @param properties the properties that should be added and made reactive
 * @returns targer
 */
export function extendObservable<A extends Object, B extends Object>(target: A, ...properties: B[]): A & B {
	invariant(arguments.length >= 2, "extendObservable expected 2 or more arguments");
	invariant(typeof target === "object", "extendObservable expects an object as first argument");
	invariant(!(target instanceof ObservableMap), "extendObservable should not be used on maps, use map.merge instead");
	properties.forEach(propSet => {
		invariant(typeof propSet === "object", "all arguments of extendObservable should be objects");
		extendObservableHelper(target, propSet, ValueMode.Recursive, null);
	});
	return <A & B> target;
}

export function extendObservableHelper(target, properties, mode: ValueMode, name: string): Object {
	const adm = asObservableObject(target, name, mode);
	for (let key in properties) if (properties.hasOwnProperty(key)) {
		if (target === properties && !isPropertyConfigurable(target, key))
			continue; // see #111, skip non-configurable or non-writable props for `observable(object)`.
		setObservableObjectInstanceProperty(adm, key, properties[key]);
	}
	return target;
}
