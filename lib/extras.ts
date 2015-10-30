/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
import {DataNode, ViewNode} from './dnode';
import {ObservableObject} from './observableobject';
import {ObservableMap} from './observablemap';
import SimpleEventEmitter from './simpleeventemitter';
import {once, unique} from './utils';
import {isObservable} from './core';
import {IDependencyTree, ITransitionEvent, IObserverTree, Lambda} from './interfaces';

export function getDNode(thing:any, property?:string):DataNode {
	if (!isObservable(thing))
		throw new Error(`[mobservable.getDNode] ${thing} doesn't seem to be reactive`);
	if (property !== undefined) {
		var dnode;
		if (thing instanceof ObservableMap)
			dnode = thing._data[property];
		else if (thing.$mobservable instanceof ObservableObject) {
			const o = <ObservableObject> thing.$mobservable;
			dnode = o.values && o.values[property];
		}
		if (!dnode)
			throw new Error(`[mobservable.getDNode] property '${property}' of '${thing}' doesn't seem to be a reactive property`);
		return dnode;
	}
	if (thing instanceof DataNode)
		return thing;
	if (thing.$mobservable) {
		if (thing.$mobservable instanceof ObservableObject || thing instanceof ObservableMap)
			throw new Error(`[mobservable.getDNode] missing properties parameter. Please specify a property of '${thing}'.`);
		return thing.$mobservable;
	}
	throw new Error(`[mobservable.getDNode] ${thing} doesn't seem to be reactive`);
}

export function reportTransition(node:DataNode, state:string, changed:boolean = false, newValue = null) {
	transitionTracker.emit({
		id: node.id,
		name: node.context.name,
		context: node.context.object,
		state: state,
		changed: changed,
		newValue: newValue
	});
}

export var transitionTracker:SimpleEventEmitter = null;

export function getDependencyTree(thing:any, property?:string): IDependencyTree {
	return nodeToDependencyTree(getDNode(thing, property));
}

function nodeToDependencyTree(node:DataNode): IDependencyTree {
	var result:IDependencyTree = {
		id: node.id,
		name: node.context.name,
		context: node.context.object || null
	};
	if (node instanceof ViewNode && node.observing.length)
		result.dependencies = unique(node.observing).map(nodeToDependencyTree);
	return result;
}

export function getObserverTree(thing:any, property?:string): IObserverTree {
	return nodeToObserverTree(getDNode(thing, property));
}

function nodeToObserverTree(node:DataNode): IObserverTree {
	var result:IObserverTree = {
		id: node.id,
		name: node.context.name,
		context: node.context.object || null
	};
	if (node.observers.length)
		result.observers = unique(node.observers).map(nodeToObserverTree);
	if (node.externalRefenceCount > 0)
		result.listeners =  node.externalRefenceCount;
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