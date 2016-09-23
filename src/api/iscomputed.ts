import {isObservableObject} from "../types/observableobject";
import {getAtom} from "../types/type-utils";
import {ComputedValue} from "../core/computedvalue";

export function isComputed(value, property?: string): boolean {
	if (value === null || value === undefined)
		return false;
	if (property !== undefined) {
		if (isObservableObject(value) === false)
			return false;
		const atom = getAtom(value, property);
		return atom instanceof ComputedValue;
	}
	return value instanceof ComputedValue;
}
