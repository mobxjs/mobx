export interface Lambda {
    (): void;
    name?: string;
}

// TODO: clean up
export interface IObservable {
}

// TODO: clean up
export interface IObservableValue<T> extends IObservable {
    (): T;
    (value: T):void;
}

export interface IObservableArray<T> extends IObservable, Array<T> {
    spliceWithArray(index: number, deleteCount?: number, newItems?: T[]): T[];
    observe(listener: (changeData: IArrayChange<T>|IArraySplice<T>)=>void, fireImmediately?: boolean): Lambda;
    clear(): T[];
    peek(): T[];
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

export interface IObjectChange<T, R> {
    name: string;
    object: R;
    type: string;
    oldValue?: T;
}

export interface IDependencyTree {
    id: number;
    name: string;
    dependencies?: IDependencyTree[];
}

export interface IObserverTree {
    id: number;
    name: string;
    observers?: IObserverTree[];
    listeners?: number; // amount of functions manually attached using an .observe method
}

export interface ITransitionEvent {
    id: number;
    name: string;
    state: string;
    changed: boolean;
    newValue: string;
}