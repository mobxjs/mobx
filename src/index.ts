import {registerGlobals} from "./core/global";
registerGlobals();

import * as core from './core';
import {isComputingDerivation} from './core/global';
import {quickDiff} from './utils';
import {IDependencyTree, IObserverTree, ITransitionEvent, Lambda} from './interfaces';
import {getDependencyTree, getDNode, getObserverTree, trackTransitions} from './extras';
import SimpleEventEmitter from './simpleeventemitter';

export * from './interfaces';

export {
	isObservable,
	isObservableObject,
	isObservableArray,
	isObservableMap,
	observable,
	extendObservable,
	asReference,
	asFlat,
	asStructure,
	observe,
	autorun,
	autorunUntil,
	autorunAsync,
	expr,
	toJSON,
	// deprecated, add warning?
	isObservable as isReactive,
	map,
	fastArray,
	observable as makeReactive,
	extendObservable as extendReactive,
	autorunUntil as observeUntil,
	autorunAsync as observeAsync
} from './core';

export {
	createTransformer
} from './transform';

/*export {
	// TODO:untracked,
} from './dnode';
*/

export {transaction} from "./core/transaction";
export {
	ObservableMap
} from './observablemap';

/**
 * 'Private' elements that are exposed for testing and debugging utilities
 */
export const _ = {
	quickDiff
}


export const extras = {
	getDNode: <(thing:any)=>any> getDNode,
	getDependencyTree,
	getObserverTree,
	trackTransitions,
	SimpleEventEmitter,
	withStrict: core.withStrict,
	isComputingDerivation
} 
