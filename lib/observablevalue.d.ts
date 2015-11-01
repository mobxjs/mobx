/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
import { DataNode } from './dnode';
import SimpleEventEmitter from './simpleeventemitter';
import { ValueMode } from './core';
import { IContextInfoStruct, Lambda } from './interfaces';
export declare class ObservableValue<T> extends DataNode {
    protected value: T;
    protected mode: ValueMode;
    protected changeEvent: SimpleEventEmitter;
    protected _value: T;
    constructor(value: T, mode: ValueMode, context: IContextInfoStruct);
    private makeReferenceValueReactive(value);
    set(newValue: T): boolean;
    get(): T;
    observe(listener: (newValue: T, oldValue: T) => void, fireImmediately?: boolean): Lambda;
    toString(): string;
}
