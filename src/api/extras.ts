import {IDepTreeNode} from "../core/observable";
import {unique, invariant} from "../utils/utils";
import {globalState} from "../core/globalstate";
import {Atom} from "../core/atom";
import {ComputedValue} from "../core/computedvalue";
import {Reaction} from "../core/reaction";
import {isObservableArray} from "../types/observablearray";
import {isObservableMap} from "../types/observablemap";
import {isObservableObject} from "../types/observableobject";

export interface IDependencyTree {
	id: number;
	name: string;
	dependencies?: IDependencyTree[];
}

export interface IObserverTree {
	id: number;
	name: string;
	observers?: IObserverTree[];
}

export function allowStateChanges<T>(allowStateChanges: boolean, func: () => T): T {
	const prev = globalState.allowStateChanges;
	globalState.allowStateChanges = allowStateChanges;
	const res = func();
	globalState.allowStateChanges = prev;
	return res;
}

// TODO: Move the next 3 functions to types
// TODO: strong typing for the following methods:
export function getAtom(thing: any, property?: string): IDepTreeNode {
	if (typeof thing === "object" && thing !== null) {
		if (isObservableArray(thing)) {
			invariant(property === undefined, "It is not possible to get index atoms from arrays");
			return thing.$mobx.atom;
		} else if (isObservableMap(thing)) {
			if (property === undefined)
				return getAtom(thing._keys);
			const observable = thing._data[property] || thing._hasMap[property];
			invariant(!!observable, `the entry '${property}' does not exist in the observable map '${getDebugName(thing)}'`);
			return observable;
		} else if (isObservableObject(thing)) {
			invariant(!!property, `please specify a property`);
			const observable = thing.$mobx.values[property];
			invariant(!!observable, `no observable property '${property}' found on the observable object '${getDebugName(thing)}'`);
			return observable;
		} else if (thing instanceof Atom || thing instanceof ComputedValue || thing instanceof Reaction) {
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
	if (thing instanceof Atom || thing instanceof ComputedValue || thing instanceof Reaction)
		return thing;
	if (isObservableMap(thing))
		return thing;
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
	return `${named.name}@${named.id}`;
}

export function getDependencyTree(thing: any, property?: string): IDependencyTree {
	return nodeToDependencyTree(getAtom(thing, property));
}

function nodeToDependencyTree(node: IDepTreeNode): IDependencyTree {
	const result: IDependencyTree = {
		id: node.id,
		name: `${node.name}@${node.id}` // TODO: use debug name
	};
	if (node.observing && node.observing.length)
		result.dependencies = unique(node.observing).map(nodeToDependencyTree);
	return result;
}

export function getObserverTree(thing: any, property?: string): IObserverTree {
	return nodeToObserverTree(getAtom(thing, property));
}

function nodeToObserverTree(node: IDepTreeNode): IObserverTree {
	const result: IObserverTree = {
		id: node.id,
		name: `${node.name}@${node.id}` // TODO: use debug name
	};
	if (node.observers && node.observers.length)
		result.observers = <any>unique(node.observers).map(<any>nodeToObserverTree);
	return result;
}
