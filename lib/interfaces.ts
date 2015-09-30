export interface IContextInfoStruct {
    object: Object;
    name: string;
}

export type IContextInfo = IContextInfoStruct | string;

export interface Lambda {
    (): void;
    name?: string;
}

export interface IObservable {
    observe(callback: (...args: any[])=>void, fireImmediately?: boolean): Lambda;
}

export interface IObservableValue<T> extends IObservable {
    (): T;
    (value: T):void;
    observe(callback: (newValue: T, oldValue: T)=>void, fireImmediately?: boolean): Lambda;
}

export interface IObservableArray<T> extends IObservable, Array<T> {
    spliceWithArray(index: number, deleteCount?: number, newItems?: T[]): T[];
    observe(listener: (changeData: IArrayChange<T>|IArraySplice<T>)=>void, fireImmediately?: boolean): Lambda;
    clear(): T[];
    replace(newItems: T[]): T[];
    find(predicate: (item: T,index: number,array: IObservableArray<T>)=>boolean,thisArg?: any,fromIndex?: number): T;
    remove(value: T): boolean;
}

export interface IArrayChange<T> {
    type:  string; // Always:  'update'
    object:  IObservableArray<T>;
    index:  number;
    oldValue:  T;
}

export interface IArraySplice<T> {
    type:  string; // Always:  'splice'
    object:  IObservableArray<T>;
    index:  number;
    removed:  T[];
    addedCount:  number;
}

export interface IDependencyTree {
    id: number;
    name: string;
    context: any;
    dependencies?: IDependencyTree[];
}

export interface IObserverTree {
    id: number;
    name: string;
    context: any;
    observers?: IObserverTree[];
    listeners?: number; // amount of functions manually attached using an .observe method
}

export interface ITransitionEvent {
    id: number;
    name: string;
    context: Object;
    state: string;
    changed: boolean;
    newValue: string;
}