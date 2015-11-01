/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
import { ViewNode } from './dnode';
import SimpleEventEmitter from './simpleeventemitter';
import { IContextInfoStruct, Lambda } from './interfaces';
export declare function throwingViewSetter(name: any): Lambda;
export declare class ObservableView<T> extends ViewNode {
    protected func: () => T;
    private scope;
    private compareStructural;
    private isComputing;
    protected _value: T;
    protected changeEvent: SimpleEventEmitter;
    constructor(func: () => T, scope: Object, context: IContextInfoStruct, compareStructural: any);
    get(): T;
    set(x: any): void;
    compute(): boolean;
    observe(listener: (newValue: T, oldValue: T) => void, fireImmediately?: boolean): Lambda;
    toString(): string;
}
