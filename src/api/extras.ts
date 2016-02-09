/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
import {Atom} from "../core/atom";
import {ObservableArray} from "../types/observablearray";
import {Reaction} from "../core/reaction";
import {ComputedValue} from "../core/computedvalue";
import {IDepTreeNode} from "../core/observable";
import {ObservableObject} from "../types/observableobject";
import {ObservableMap} from "../types/observablemap";
import {SimpleEventEmitter} from "../utils/simpleeventemitter";
import {once, unique, Lambda} from "../utils/utils";
import {globalState} from "../core/globalstate";

export interface IDependencyTree {
	id: number;
	name: string;
	dependencies?: IDependencyTree[];
}

export interface IObserverTree {
	id: number;
	name: string;
	observers?: IObserverTree[];
	listeners?: number; // amount of functions manually attached using an .observe method
}

export interface ITransitionEvent {
	id: number;
	name: string;
	state: string;
	changed: boolean;
	node: IDepTreeNode;
}

/**
	* If strict is enabled, views are not allowed to modify the state.
	* This is a recommended practice, as it makes reasoning about your application simpler.
	*/
export function allowStateChanges<T>(allowStateChanges: boolean, func: () => T): T {
	const prev = globalState.allowStateChanges;
	globalState.allowStateChanges = allowStateChanges;
	const res = func();
	globalState.allowStateChanges = prev;
	return res;
}

export function getDNode(thing: any, property?: string): IDepTreeNode {
	if (property !== undefined)
		return getChildDNode(thing, property);
	if (thing instanceof Atom || thing instanceof Reaction || thing instanceof ComputedValue)
		return thing;
	if (thing instanceof ObservableArray)
		return thing.$mobservable;
	if (thing.$mobservable instanceof Reaction)
		return thing.$mobservable;
	if (thing.$mobservable instanceof ObservableObject || thing instanceof ObservableMap)
		throw new Error(`[mobservable.getDNode] missing properties parameter. Please specify a property of '${thing}'.`);
	throw new Error(`[mobservable.getDNode] ${thing} doesn't seem to be reactive`);
}

function getChildDNode(thing: any, property: string): IDepTreeNode {
	let observable;
	if (thing.$mobservable instanceof ObservableObject) {
		observable = thing.$mobservable.values[property];
	} else if (thing instanceof ObservableMap) {
		observable = thing._data[property];
	}
	if (!observable)
		throw new Error(`[mobservable.getDNode] property '${property}' of '${thing}' doesn't seem to be a reactive property`);
	return observable;
}

let transitionTracker: SimpleEventEmitter = null;

export function reportTransition(node: IDepTreeNode, state: string, changed: boolean = false) {
	if (transitionTracker) transitionTracker.emit({
		id: node.id,
		name: node.name,
		node, state, changed
	});
}

export function getDependencyTree(thing: any, property?: string): IDependencyTree {
	return nodeToDependencyTree(getDNode(thing, property));
}

function nodeToDependencyTree(node: IDepTreeNode): IDependencyTree {
	const result: IDependencyTree = {
		id: node.id,
		name: node.name
	};
	if (node.observing && node.observing.length)
		result.dependencies = unique(node.observing).map(nodeToDependencyTree);
	return result;
}

export function getObserverTree(thing: any, property?: string): IObserverTree {
	return nodeToObserverTree(getDNode(thing, property));
}

function nodeToObserverTree(node: IDepTreeNode): IObserverTree {
	const result: IObserverTree = {
		id: node.id,
		name: node.name
	};
	if (node.observers && node.observers.length)
		result.observers = <any>unique(node.observers).map(<any>nodeToObserverTree);
	return result;
}

function createConsoleReporter(extensive: boolean) {
	let lines: ITransitionEvent[] = [];
	let scheduled = false;

	return (line: ITransitionEvent) => {
		if (extensive || line.changed)
			lines.push(line);
		if (!scheduled) {
			scheduled = true;
			setTimeout(() => {
				console[console["table"] ? "table" : "dir"](lines);
				lines = [];
				scheduled = false;
			}, 1);
		}
	};
}

export function trackTransitions(extensive = false, onReport?: (lines: ITransitionEvent) => void): Lambda {
	if (!transitionTracker)
		transitionTracker = new SimpleEventEmitter();

	const reporter = onReport
		? 	(line: ITransitionEvent) => {
				if (extensive || line.changed)
					onReport(line);
			}
		: 	createConsoleReporter(extensive);
	const disposer = transitionTracker.on(reporter);

	return once(() => {
		disposer();
		if (transitionTracker.listeners.length === 0)
			transitionTracker = null;
	});
}