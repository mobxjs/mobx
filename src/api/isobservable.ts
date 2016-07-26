import {ObservableArray} from "../types/observablearray";
import {ObservableMap} from "../types/observablemap";
import {isObservableObject, ObservableObjectAdministration} from "../types/observableobject";
import {BaseAtom} from "../core/atom";
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
			throw new Error("[mobx.isObservable] isObservable(object, propertyName) is not supported for arrays and maps. Use map.has or array.length instead.");
		else if (isObservableObject(value)) {
			const o = <ObservableObjectAdministration> value.$mobx;
			return o.values && !!o.values[property];
		}
		return false;
	}
	return !!value.$mobx || value instanceof BaseAtom || value instanceof Reaction || value instanceof ComputedValue;
}
