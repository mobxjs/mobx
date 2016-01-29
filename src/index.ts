/**
 * Welcome to the mobservable sources! To get an global overview of how Mobservable works,
 * this is a good place to start: 
 * https://medium.com/@mweststrate/becoming-fully-reactive-an-in-depth-explanation-of-mobservable-55995262a254#.xvbh6qd74
 */
import {registerGlobals} from "./core/global";
registerGlobals();

import * as core from './core';
import {isComputingDerivation, resetGlobalState} from './core/global';
import {quickDiff} from './utils/utils';
import {IDependencyTree, IObserverTree, ITransitionEvent, Lambda} from './interfaces';
import {getDependencyTree, getDNode, getObserverTree, trackTransitions} from './extras';
import SimpleEventEmitter from './utils/simpleeventemitter';

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

export {
	untracked
} from './core/global';

export {transaction} from "./core/transaction";
export {
	ObservableMap
} from './types/observablemap';

export {default as Atom} from "./core/atom";
export {default as Reaction} from "./core/reaction";

/**
 * 'Private' elements that are exposed for testing and debugging utilities
 */
export const _ = {
	quickDiff,
	resetGlobalState
}


export const extras = {
	getDNode: <(thing:any)=>any> getDNode,
	getDependencyTree,
	getObserverTree,
	trackTransitions,
	SimpleEventEmitter,
	isComputingDerivation,
	allowStateChanges: core.allowStateChanges
} 
