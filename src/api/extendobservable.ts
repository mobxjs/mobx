import {ValueMode} from "../types/modifiers";
import {ObservableMap} from "../types/observablemap";
import {ObservableObject} from "../types/observableobject";

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


export function extendObservableHelper(target, properties, mode: ValueMode, name: string): Object {
	const meta = ObservableObject.asReactive(target, name, mode);
	for (let key in properties) if (properties.hasOwnProperty(key)) {
		meta.set(key, properties[key]);
	}
	return target;
}
