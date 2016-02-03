/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
import ObservableValue from "../types/observablevalue";
import ComputedValue from "../core/computedvalue";
import Reaction from "../core/reaction";
import {IDepTreeNode} from "../core/observable";
import {ObservableObject} from '../types/observableobject';
import {ObservableMap} from '../types/observablemap';
import SimpleEventEmitter from '../utils/simpleeventemitter';
import {once, unique, Lambda} from '../utils/utils';
import {isObservable} from '../api/observable';
import globalState from "../core/globalstate";

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
    node: any; // TODO: IAtom;
}

/**
    * If strict is enabled, views are not allowed to modify the state.
    * This is a recommended practice, as it makes reasoning about your application simpler.
    */
export function allowStateChanges<T>(allowStateChanges: boolean, func:() => T):T {
    const prev = globalState.allowStateChanges;
    globalState.allowStateChanges = allowStateChanges;
    const res = func();
    globalState.allowStateChanges = prev;
    return res;   
}



export function getDNode(thing:any, property?:string):IDepTreeNode {
	const propError = `[mobservable.getDNode] property '${property}' of '${thing}' doesn't seem to be a reactive property`;

	if (thing instanceof ObservableMap && property) {
		const value = thing._data[property];
		if (!value)
			throw new Error(propError);
		return getDNode(value);
	}
	if (!isObservable(thing, property)) {
		if (property)
			throw new Error(propError);
		throw new Error(`[mobservable.getDNode] ${thing} doesn't seem to be reactive`);
	}
	if (property !== undefined) {
		if (thing.$mobservable instanceof ObservableObject)
			return getDNode(thing.$mobservable.values[property]);
		throw new Error(propError);
	}
	if (thing instanceof ObservableValue)
		return thing.atom;
	if (thing instanceof ComputedValue || thing instanceof Reaction)
		return thing;
	if (thing.$mobservable) {
		if (thing.$mobservable instanceof ObservableObject || thing instanceof ObservableMap)
			throw new Error(`[mobservable.getDNode] missing properties parameter. Please specify a property of '${thing}'.`);
		if (thing.$mobservable instanceof ObservableValue)
			return thing. $mobservable.atom;
		return thing.$mobservable;
	}
	throw new Error(`[mobservable.getDNode] ${thing} doesn't seem to be reactive`);
}

export function reportTransition(node:IDepTreeNode, state:string, changed:boolean = false) {
	transitionTracker && transitionTracker.emit({
		id: node.id,
		name: node.name,
		node, state, changed
	});
}

// TODO: export needed?
export var transitionTracker:SimpleEventEmitter = null;

export function getDependencyTree(thing:any, property?:string): IDependencyTree {
	return nodeToDependencyTree(getDNode(thing, property));
}

function nodeToDependencyTree(node:IDepTreeNode): IDependencyTree {
	var result:IDependencyTree = {
		id: node.id,
		name: node.name
	};
	if (node.observing && node.observing.length)
		result.dependencies = unique(node.observing).map(nodeToDependencyTree);
	return result;
}

export function getObserverTree(thing:any, property?:string): IObserverTree {
	return nodeToObserverTree(getDNode(thing, property));
}

function nodeToObserverTree(node:IDepTreeNode): IObserverTree {
	var result:IObserverTree = {
		id: node.id,
		name: node.name,
	};
	if (node.observers && node.observers.length)
		result.observers = <any>unique(node.observers).map(<any>nodeToObserverTree);
	return result;
}

function createConsoleReporter(extensive:boolean) {
	var lines:ITransitionEvent[] = [];
	var scheduled = false;

	return (line:ITransitionEvent) => {
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
	}
}

export function trackTransitions(extensive=false, onReport?:(lines:ITransitionEvent) => void) : Lambda {
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