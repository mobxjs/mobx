/**
 * MOBservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
interface Lambda {
    ():void;
}

interface IObservableValue<T,S> {
    ():T;
    (value:T):S;
    observe(callback:(newValue:T, oldValue:T)=>void, fireImmediately?:boolean):Lambda;
}

interface IObservableArray<T> extends Array<T> {
    [n: number]: T;
    length: number;

    spliceWithArray(index:number, deleteCount?:number, newItems?:T[]):T[];
    observe(listener:()=>void, fireImmediately?:boolean):Lambda;
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
    <T,S>(value?:T|{():T}, scope?:S):IObservableValue<T,S>;

    array<T>(values?:T[]): IObservableArray<T>;
    value<T,S>(value?:T|{():T}, scope?:S):IObservableValue<T,S>;
    
    watch<T>(func:()=>T, onInvalidate:Lambda):[T,Lambda];
    observeProperty(object:Object, key:string, listener:Function, invokeImmediately?:boolean):Lambda;
    batch(action:Lambda);
    
    // property definition
    observable(target:Object, key:string); // annotation
    
    props(object:Object, name:string, initalValue: any);
    props(object:Object, props:Object);
    props(object:Object);
    turnObservablesIntoProperties(object:Object);

    // Utils
    SimpleEventEmitter: new()=> ISimpleEventEmitter;
    debugLevel: number;
}



declare module "mobservable" {
	var m : IMObservableStatic;
	export = m;
}