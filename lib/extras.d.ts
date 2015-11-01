/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
import { DataNode } from './dnode';
import SimpleEventEmitter from './simpleeventemitter';
import { IDependencyTree, ITransitionEvent, IObserverTree, Lambda } from './interfaces';
export declare function getDNode(thing: any, property?: string): DataNode;
export declare function reportTransition(node: DataNode, state: string, changed?: boolean, newValue?: any): void;
export declare var transitionTracker: SimpleEventEmitter;
export declare function getDependencyTree(thing: any, property?: string): IDependencyTree;
export declare function getObserverTree(thing: any, property?: string): IObserverTree;
export declare function trackTransitions(extensive?: boolean, onReport?: (lines: ITransitionEvent) => void): Lambda;
