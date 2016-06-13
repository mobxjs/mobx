import {IDepTreeNode} from "../core/observable";
import {ComputedValue} from "../core/computedvalue";
import {Reaction}from "../core/reaction";
import {unique, invariant} from "../utils/utils";
import {getAtom} from "../types/type-utils";
import {globalState} from "../core/globalstate";

export interface IDependencyTree {
	name: string;
	dependencies?: IDependencyTree[];
}

export interface IObserverTree {
	name: string;
	observers?: IObserverTree[];
}

export function getDependencyTree(thing: any, property?: string): IDependencyTree {
	return nodeToDependencyTree(getAtom(thing, property));
}

function nodeToDependencyTree(node: IDepTreeNode): IDependencyTree {
	const result: IDependencyTree = {
		name: node.name
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
		name: node.name
	};
	if (node.observers && node.observers.length)
		result.observers = <any>unique(node.observers).map(<any>nodeToObserverTree);
	return result;
}

export function whyRun(thing?: any, prop?: string) {
	switch (arguments.length) {
		case 0:
			thing = globalState.derivationStack[globalState.derivationStack.length - 1];
			if (!thing) {
				console.log("whyRun() can only be used if a derivation is active, or by passing an computed value / reaction explicitly.");
				return;
			}
			break;
		case 2:
			thing = getAtom(thing, prop);
			break;
	}
	thing = getAtom(thing);
	if (thing instanceof ComputedValue)
		console.log(thing.whyRun());
	else if (thing instanceof Reaction)
		console.log(thing.whyRun());
	else
		invariant(false, "whyRun can only be used on reactions and computed values");
}