import * as core from './core';
import {isComputingView} from './dnode';
import {quickDiff} from './utils';
import {IDependencyTree, IObserverTree, ITransitionEvent, Lambda} from './interfaces';
import {getDependencyTree, getDNode, getObserverTree, trackTransitions} from './extras';
import SimpleEventEmitter from './simpleeventemitter';

export * from './interfaces';

export {
	isObservable,
	observable,
	extendObservable,
	asReference,
	asFlat,
	asStructure,
	autorun,
	autorunUntil,
	autorunAsync,
	expr,
	transaction,
	toJSON,
} from './core';

/* Make configurable module properties writable */
export var strict: boolean;
export var logLevel: string;
declare var module;
Object.defineProperties(module.exports, {
	strict: {
		enumerable: true,
		get: core.getStrict,
		set: core.setStrict
	},
	logLevel: {
		enumerable: true,
		get: core.getLogLevel,
		set: core.setLogLevel
	}
});

/**
 * 'Private' elements that are exposed for testing and debugging utilities
 */
export const _ = {
	isComputingView,
	quickDiff
}


export const extras = {
	getDNode: <(thing:any)=>any> getDNode,
	getDependencyTree,
	getObserverTree,
	trackTransitions,
	SimpleEventEmitter
} 
