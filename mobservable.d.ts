/** GENERATED FILE */
/**
 * MOBservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
interface Lambda {
    ():void;
}

interface IObservable {
    observe(callback:(...args:any[])=>void, fireImmediately?:boolean):Lambda;
}

interface IObservableValue<T> extends IObservable {
    ():T;
    (value:T);
    observe(callback:(newValue:T, oldValue:T)=>void, fireImmediately?:boolean):Lambda;
}

interface IArrayChange<T> {
    type: string; // Always: 'update'
    object: IObservableArray<T>;
    index: number;
    oldValue: T;
}

interface IArraySplice<T> {
    type: string; // Always: 'splice'
    object: IObservableArray<T>;
    index: number;
    removed: T[];
    addedCount: number;
}

interface IObservableArray<T> extends Array<T>, IObservable {
    spliceWithArray(index:number, deleteCount?:number, newItems?:T[]):T[];
    observe(listener:(changeData:IArrayChange<T>|IArraySplice<T>)=>void, fireImmediately?:boolean):Lambda;
    clear(): T[];
    replace(newItems:T[]);
    values(): T[];
    clone(): IObservableArray<T>;
    find(predicate:(item:T,index:number,array:IObservableArray<T>)=>boolean,thisArg?,fromIndex?:number):T;
    remove(value:T):boolean;
}

interface ISimpleEventEmitter {
    emit(...data:any[]):void;
    on(listener:(...data:any[])=>void):Lambda;
    once(listener:(...data:any[])=>void):Lambda;
}

interface IMObservableStatic {
    // shorthand for .value()
    <T>(value?:T|{():T}, scope?:Object):IObservableValue<T>;

    array<T>(values?:T[]): IObservableArray<T>;
    value<T>(value?:T|{():T}, scope?:Object):IObservableValue<T>;

    toPlainValue<T>(any:T):T;

    watch<T>(func:()=>T, onInvalidate:Lambda):[T,Lambda];
    observeProperty(object:Object, key:string, listener:Function, invokeImmediately?:boolean):Lambda;
    batch<T>(action:()=>T):T;

    // property definition
    observable(target:Object, key:string); // annotation

    props(object:Object, name:string, initalValue: any);
    props(object:Object, props:Object);
    props(object:Object);
    turnObservablesIntoProperties(object:Object);

    // Utils
    debugLevel: number;
    SimpleEventEmitter: new()=> ISimpleEventEmitter;
}



declare module "mobservable" {
	var m : IMObservableStatic;
	export = m;
}