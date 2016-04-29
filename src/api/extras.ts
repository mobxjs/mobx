import {IDepTreeNode} from "../core/observable";
import {unique, Lambda} from "../utils/utils";
import {globalState} from "../core/globalstate";
import {registerListener} from "../types/listen-utils";

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

export function getDependencyTree(thing: any): IDependencyTree {
	return nodeToDependencyTree(thing);
}

function nodeToDependencyTree(node: IDepTreeNode): IDependencyTree {
	const result: IDependencyTree = {
		id: node.id,
		name: `${node.name}@${node.id}`
	};
	if (node.observing && node.observing.length)
		result.dependencies = unique(node.observing).map(nodeToDependencyTree);
	return result;
}

export function getObserverTree(thing: any): IObserverTree {
	return nodeToObserverTree(thing);
}

function nodeToObserverTree(node: IDepTreeNode): IObserverTree {
	const result: IObserverTree = {
		id: node.id,
		name: `${node.name}@${node.id}`
	};
	if (node.observers && node.observers.length)
		result.observers = <any>unique(node.observers).map(<any>nodeToObserverTree);
	return result;
}

function createConsoleReporter(extensive: boolean) {
/*	let lines: ITransitionEvent[] = [];
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
*/
}

export function trackTransitions(extensive = false, onReport?: (c) => void): Lambda {
	return registerListener(globalState, change => {
		if (onReport)
			onReport(change);
		console.log(change);
	});
	// if (!transitionTracker)
	// 	transitionTracker = new SimpleEventEmitter();

	// const reporter = onReport
	// 	? 	(line: ITransitionEvent) => {
	// 			if (extensive || line.changed)
	// 				onReport(line);
	// 		}
	// 	: 	createConsoleReporter(extensive);
	// const disposer = transitionTracker.on(reporter);

	// return once(() => {
	// 	disposer();
	// 	if (transitionTracker.listeners.length === 0)
	// 		transitionTracker = null;
	// });
}