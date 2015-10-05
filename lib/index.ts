import * as core from './core';
import {isComputingView} from './dnode';
import {quickDiff} from './utils';
import {IDependencyTree, IObserverTree, ITransitionEvent, Lambda} from './interfaces';
import {getDependencyTree, getDNode, getObserverTree, trackTransitions} from './extras';


export * from './interfaces';

export default core.observable;
export {
	isReactive,
	observable,
	observablex,
	extendReactive,
	asReference,
	asFlat,
	asStructure,
	observe,
	observeUntil,
	observeAsync,
	expr,
	transaction,
	toJSON,
	logLevel,
	strict
} from './core';

/* Make configurable module properties writable */
declare var module;
Object.defineProperties(module.exports, {
	strict: {
		enumerable: true,
		get: () => core.strict,
		set: (v) => core.strict = v
	},
	logLevel: {
		enumerable: true,
		get: () => core.logLevel,
		set: (v) => core.logLevel = v
	}
});

/**
 * 'Private' elements that are exposed for testing and debugging utilities
 */
export const _ = {
	isComputingView,
	quickDiff,
}


export const extras = {
	getDNode: <(thing:any)=>any> getDNode,
	getDependencyTree,
	getObserverTree,
	trackTransitions
} 
