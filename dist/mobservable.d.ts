/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https: //mweststrate.github.io/mobservable
 */

interface _IMobservableStatic {
    makeReactive : IMakeReactive;

    extendReactive(target: Object, properties: Object);

    isReactive(value: any): boolean;

    asReference(value);

    observable(target: Object, key: string); // decorator / annotation

    sideEffect(func: Mobservable.Lambda, options?: Mobservable.IMakeReactiveOptions): Mobservable.Lambda;

    observeUntilInvalid<T>(func: ()=>T, onInvalidate: Mobservable.Lambda, context?: Mobservable.IContextInfo): [T,Mobservable.Lambda];

    transaction<T>(action: ()=>T): T;

    toJson<T>(value: T): T;

    // decorator
    reactiveComponent<T>(componentClass: T): T;

    reactiveMixin: Object;

    debugLevel:  number;

    extras: {
        getDependencyTree(thing:any, property?:string): Mobservable.IDependencyTree;

        getObserverTree(thing:any, property?:string): Mobservable.IObserverTree;

        trackTransitions(extensive?:boolean, onReport?:(lines:Mobservable.ITransitionEvent) => void) : Mobservable.Lambda;
    }
}

interface IMakeReactive {
    <T>(value: T[], opts?: Mobservable.IMakeReactiveOptions): Mobservable.IObservableArray<T>;
    <T>(value: ()=>T, opts?: Mobservable.IMakeReactiveOptions): Mobservable.IObservableValue<T>;
    <T extends string|number|boolean|Date|RegExp|Function|void>(value: T, opts?: Mobservable.IMakeReactiveOptions): Mobservable.IObservableValue<T>;
    <T extends Object>(value: Object, opts?: Mobservable.IMakeReactiveOptions): T;
}

interface IMobservableStatic extends _IMobservableStatic, IMakeReactive {
}

declare module Mobservable {
    interface IMakeReactiveOptions {
        as?:  string /* "auto" | "reference" | TODO:  see #8 "structure" */
        scope?:  Object,
        context?: Object,
        recurse?:  boolean;
        name?: string;
        // protected:  boolean TODO:  see #9
    }

    export interface IContextInfoStruct {
        object: Object;
        name: string;
    }

    export type IContextInfo = IContextInfoStruct | string;

    interface Lambda {
        (): void;
        name?: string;
    }

    interface IObservable {
        observe(callback: (...args: any[])=>void, fireImmediately?: boolean): Lambda;
    }

    interface IObservableValue<T> extends IObservable {
        (): T;
        (value: T);
        observe(callback: (newValue: T, oldValue: T)=>void, fireImmediately?: boolean): Lambda;
    }

    interface IObservableArray<T> extends IObservable, Array<T> {
        spliceWithArray(index: number, deleteCount?: number, newItems?: T[]): T[];
        observe(listener: (changeData: IArrayChange<T>|IArraySplice<T>)=>void, fireImmediately?: boolean): Lambda;
        clear():  T[];
        replace(newItems: T[]);
        values():  T[];
        clone():  IObservableArray<T>;
        find(predicate: (item: T,index: number,array: IObservableArray<T>)=>boolean,thisArg?,fromIndex?: number): T;
        remove(value: T): boolean;
    }

    interface IArrayChange<T> {
        type:  string; // Always:  'update'
        object:  IObservableArray<T>;
        index:  number;
        oldValue:  T;
    }

    interface IArraySplice<T> {
        type:  string; // Always:  'splice'
        object:  IObservableArray<T>;
        index:  number;
        removed:  T[];
        addedCount:  number;
    }

    interface IDependencyTree {
        id: number;
        name: string;
        context: any;
        dependencies?: IDependencyTree[];
    }

    interface IObserverTree {
        id: number;
        name: string;
        context: any;
        observers?: IObserverTree[];
        listeners?: number; // amount of functions manually attached using an .observe method
    }

    interface ITransitionEvent {
        id: number;
        name: string;
        context: Object;
        state: string;
        changed: boolean;
        newValue: string;
    }
}

declare module "mobservable" {
	var m : IMobservableStatic;
	export = m;
}