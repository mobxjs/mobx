import { DataNode } from './dnode';
import SimpleEventEmitter from './simpleeventemitter';
import { ValueMode } from './core';
import { IArrayChange, IArraySplice, IObservableArray, Lambda, IContextInfoStruct } from './interfaces';
export declare class StubArray {
}
export declare class ObservableArrayAdministration<T> extends DataNode {
    private array;
    mode: ValueMode;
    values: T[];
    changeEvent: SimpleEventEmitter;
    constructor(array: ObservableArray<T>, mode: ValueMode, context: IContextInfoStruct);
    getLength(): number;
    setLength(newLength: any): number;
    private updateLength(oldLength, delta);
    spliceWithArray(index: number, deleteCount?: number, newItems?: T[]): T[];
    makeReactiveArrayItem(value: any): any;
    private notifyChildUpdate(index, oldValue);
    private notifySplice(index, deleted, added);
    private notifyChanged();
}
export declare function createObservableArray<T>(initialValues: T[], mode: ValueMode, context: IContextInfoStruct): IObservableArray<T>;
export declare class ObservableArray<T> extends StubArray {
    $mobservable: ObservableArrayAdministration<T>;
    constructor(initialValues: T[], mode: ValueMode, context: IContextInfoStruct);
    observe(listener: (changeData: IArrayChange<T> | IArraySplice<T>) => void, fireImmediately?: boolean): Lambda;
    clear(): T[];
    replace(newItems: T[]): T[];
    toJSON(): T[];
    find(predicate: (item: T, index: number, array: ObservableArray<T>) => boolean, thisArg?: any, fromIndex?: number): T;
    splice(index: number, deleteCount?: number, ...newItems: T[]): T[];
    push(...items: T[]): number;
    pop(): T;
    shift(): T;
    unshift(...items: T[]): number;
    reverse(): T[];
    sort(compareFn?: (a: T, b: T) => number): T[];
    remove(value: T): boolean;
    toString(): string;
    toLocaleString(): string;
}
