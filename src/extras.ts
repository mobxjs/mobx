/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
import {ObservableValue, DerivedValue, IObservable, IObserver} from './dnode';
import {ObservableObject} from './observableobject';
import {ObservableMap} from './observablemap';
import SimpleEventEmitter from './simpleeventemitter';
import {once, unique} from './utils';
import {isObservable} from './core';
import {IDependencyTree, ITransitionEvent, IObserverTree, Lambda} from './interfaces';

export function getDNode(thing:any, property?:string):IObservable {
	const propError = `[mobservable.getDNode] property '${property}' of '${thing}' doesn't seem to be a reactive property`;

	if (thing instanceof ObservableMap && property) {
		const dnode = thing._data[property];
		if (!dnode)
			throw new Error(propError);
		return dnode;
	}
	if (!isObservable(thing, property)) {
		if (property)
			throw new Error(propError);
		throw new Error(`[mobservable.getDNode] ${thing} doesn't seem to be reactive`);
	}
	if (property !== undefined) {
		if (thing.$mobservable instanceof ObservableObject)
			return thing.$mobservable.values[property];
		throw new Error(propError);
	}
	if (thing instanceof ObservableValue || thing instanceof DerivedValue)
		return thing;
	if (thing.$mobservable) {
		if (thing.$mobservable instanceof ObservableObject || thing instanceof ObservableMap)
			throw new Error(`[mobservable.getDNode] missing properties parameter. Please specify a property of '${thing}'.`);
		return thing.$mobservable;
	}
	throw new Error(`[mobservable.getDNode] ${thing} doesn't seem to be reactive`);
}

export function reportTransition(node:IObservable, state:string, changed:boolean = false, newValue = null) {
	transitionTracker.emit({
		id: node.id,
		name: node.name,
		state: state,
		changed: changed,
		newValue: newValue
	});
}

export var transitionTracker:SimpleEventEmitter = null;

export function getDependencyTree(thing:any, property?:string): IDependencyTree {
	return nodeToDependencyTree(getDNode(thing, property));
}

function nodeToDependencyTree(node:IObservable): IDependencyTree {
	var result:IDependencyTree = {
		id: node.id,
		name: node.name
	};
	if (node instanceof DerivedValue && node.observing.length)
		result.dependencies = unique(node.observing).map(nodeToDependencyTree);
	return result;
}

export function getObserverTree(thing:any, property?:string): IObserverTree {
	return nodeToObserverTree(getDNode(thing, property));
}

function nodeToObserverTree(node:IObservable): IObserverTree {
	var result:IObserverTree = {
		id: node.id,
		name: node.name,
	};
	if (node.observers && node.observers.length)
		result.observers = <any>unique(node.observers).map(<any>nodeToObserverTree);
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