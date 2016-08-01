import {IDepTreeNode} from "../core/observable";
import {invariant} from "../utils/utils";
import {runLazyInitializers} from "../utils/decorators";
import {BaseAtom} from "../core/atom";
import {ComputedValue} from "../core/computedvalue";
import {Reaction} from "../core/reaction";
import {isObservableArray} from "../types/observablearray";
import {isObservableMap} from "../types/observablemap";
import {isObservableObject} from "../types/observableobject";

export function getAtom(thing: any, property?: string): IDepTreeNode {
	if (typeof thing === "object" && thing !== null) {
		if (isObservableArray(thing)) {
			invariant(property === undefined, "It is not possible to get index atoms from arrays");
			return thing.$mobx.atom;
		}
		if (isObservableMap(thing)) {
			if (property === undefined)
				return getAtom(thing._keys);
			const observable = thing._data[property] || thing._hasMap[property];
			invariant(!!observable, `the entry '${property}' does not exist in the observable map '${getDebugName(thing)}'`);
			return observable;
		}
		// Initializers run lazily when transpiling to babel, so make sure they are run...
		runLazyInitializers(thing);
		if (isObservableObject(thing)) {
			invariant(!!property, `please specify a property`);
			const observable = thing.$mobx.values[property];
			invariant(!!observable, `no observable property '${property}' found on the observable object '${getDebugName(thing)}'`);
			return observable;
		}
		if (thing instanceof BaseAtom || thing instanceof ComputedValue || thing instanceof Reaction) {
			return thing;
		}
	} else if (typeof thing === "function") {
		if (thing.$mobx instanceof Reaction) {
			// disposer function
			return thing.$mobx;
		}
	}
	invariant(false, "Cannot obtain atom from " + thing);
}

export function getAdministration(thing: any, property?: string) {
	invariant(thing, "Expection some object");
	if (property !== undefined)
		return getAdministration(getAtom(thing, property));
	if (thing instanceof BaseAtom || thing instanceof ComputedValue || thing instanceof Reaction)
		return thing;
	if (isObservableMap(thing))
		return thing;
	// Initializers run lazily when transpiling to babel, so make sure they are run...
	runLazyInitializers(thing);
	if (thing.$mobx)
		return thing.$mobx;
	invariant(false, "Cannot obtain administration from " + thing);
}

export function getDebugName(thing: any, property?: string): string {
	let named;
	if (property !== undefined)
		named = getAtom(thing, property);
	else if (isObservableObject(thing) || isObservableMap(thing))
		named = getAdministration(thing);
	else
		named = getAtom(thing); // valid for arrays as well
	return named.name;
}
