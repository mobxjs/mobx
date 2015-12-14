import * as core from './core';
import {isComputingView, untracked} from './dnode';
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
	untracked,
	transaction
} from './dnode';

export {
	ObservableMap
} from './observablemap';

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
	SimpleEventEmitter,
	withStrict: core.withStrict
} 
