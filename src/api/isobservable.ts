import {ObservableArray} from "../types/observablearray";
import {ObservableMap} from "../types/observablemap";
import {ObservableObject} from "../types/observableobject";
import {ObservableValue} from "../types/observablevalue";
import {ComputedValue} from "../core/computedvalue";
import {Reaction} from "../core/reaction";

/**
	* Returns true if the provided value is reactive.
	* @param value object, function or array
	* @param propertyName if propertyName is specified, checkes whether value.propertyName is reactive.
	*/
export function isObservable(value, property?: string): boolean {
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
