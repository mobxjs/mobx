import {IDepTreeNode} from "../core/observable";
import {unique} from "../utils/utils";
import {getAtom} from "../types/type-utils";

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
	if (node.observing && node.observing.length > 0)
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
	if (node.observers && node.observers.length > 0)
		result.observers = <any>node.observers.asArray().map(<any>nodeToObserverTree);
	return result;
}
