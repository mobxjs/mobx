/** GENERATED FILE */
/**
 * MOBservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */

interface IMObservableStatic {
    // ways of creating observables. 
    <T>(value?:T[]):Mobservable.IObservableArray<T>;
    <T>(value?:T|{():T}, scope?:Object):Mobservable.IObservableValue<T>;
    
    value<T>(value?:T[]):Mobservable.IObservableArray<T>;
    value<T>(value?:T|{():T}, scope?:Object):Mobservable.IObservableValue<T>;
    
    array<T>(values?:T[]):Mobservable.IObservableArray<T>;
    primitive<T>(value?:T):Mobservable.IObservableValue<T>;
    reference<T>(value?:T):Mobservable.IObservableValue<T>;
    computed<T>(func:()=>T,scope?):Mobservable.IObservableValue<T>;
    expr<T>(expr:()=>T,scope?):T;
    sideEffect(func:Mobservable.Lambda,scope?):Mobservable.Lambda;

    // create observable properties
    props(object:Object, name:string, initalValue: any);
    props(object:Object, props:Object);
    props(object:Object);
    fromJson<T>(value:T):T;
    observable(target:Object, key:string); // annotation

    // convert observables to not observables
    toJson<T>(value:T):T;
    toPlainValue<T>(any:T):T;
    
    

    // observe observables
    observeProperty(object:Object, key:string, listener:Function, invokeImmediately?:boolean):Mobservable.Lambda;
    watch<T>(func:()=>T, onInvalidate:Mobservable.Lambda):[T,Mobservable.Lambda];
    
    // change a lot of observables at once
    batch<T>(action:()=>T):T;

    // Utils
    debugLevel: number;
    SimpleEventEmitter: new()=> Mobservable.ISimpleEventEmitter;
    
    ObserverMixin: {
        componentWillMount();
        componentWillUnmount();
        shouldComponentUpdate(nextProps, nextState);
    };
    ObservingComponent<T>(componentClass:T):T;
}

declare module Mobservable {
    
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
    
    interface IObservableArray<T> extends IObservable, Array<T> {
        spliceWithArray(index:number, deleteCount?:number, newItems?:T[]):T[];
        observe(listener:(changeData:IArrayChange<T>|IArraySplice<T>)=>void, fireImmediately?:boolean):Lambda;
        clear(): T[];
        replace(newItems:T[]);
        values(): T[];
        clone(): IObservableArray<T>;
        find(predicate:(item:T,index:number,array:IObservableArray<T>)=>boolean,thisArg?,fromIndex?:number):T;
        remove(value:T):boolean;
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
    
    interface ISimpleEventEmitter {
        emit(...data:any[]):void;
        on(listener:(...data:any[])=>void):Lambda;
        once(listener:(...data:any[])=>void):Lambda;
    }
}



declare module "mobservable" {
	var m : IMObservableStatic;
	export = m;
}