import { IDependencyTree, IObserverTree, ITransitionEvent, Lambda } from './interfaces';
import SimpleEventEmitter from './simpleeventemitter';
export * from './interfaces';
export { isObservable, observable, extendObservable, asReference, asFlat, asStructure, autorun, autorunUntil, autorunAsync, expr, transaction, toJSON, isObservable as isReactive, map, observable as makeReactive, extendObservable as extendReactive, autorun as observe, autorunUntil as observeUntil, autorunAsync as observeAsync } from './core';
/**
 * 'Private' elements that are exposed for testing and debugging utilities
 */
export declare const _: {
    isComputingView: () => boolean;
    quickDiff: <T>(current: T[], base: T[]) => [T[], T[]];
};
export declare const extras: {
    getDNode: (thing: any) => any;
    getDependencyTree: (thing: any, property?: string) => IDependencyTree;
    getObserverTree: (thing: any, property?: string) => IObserverTree;
    trackTransitions: (extensive?: boolean, onReport?: (lines: ITransitionEvent) => void) => Lambda;
    SimpleEventEmitter: typeof SimpleEventEmitter;
    withStrict: (newStrict: boolean, func: Lambda) => void;
};
