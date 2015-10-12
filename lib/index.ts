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
	// deprecated, add warning?
	isObservable as isReactive,
	observable as makeReactive,
	extendObservable as extendReactive,
	autorun as observe,
	autorunUntil as observeUntil,
	autorunAsync as observeAsync
} from './core';

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
