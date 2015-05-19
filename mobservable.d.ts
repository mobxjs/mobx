declare module "mobservable" {
    export function value<T,S>(value?:T|{():T}, scope?:S):IObservableValue<T,S>;
    export function array<T>(values?:T[]): IObservableArray<T>;

    export function watch<T>(func:()=>T, onInvalidate:Lambda):[T,Lambda];
    export function observeProperty(object:Object, key:string, listener:Function, invokeImmediately?:boolean):Lambda;
    export function batch(action:Lambda);

    // annotation
    export function observable(target:Object, key:string);

    // property definition
    export function props(object:Object, name:string, initalValue: any);
    export function props(object:Object, props:Object);
    export function props(object:Object);
    export function turnObservablesIntoProperties(object:Object);
    
    // Utils
    export var SimpleEventEmitter: new() => ISimpleEventEmitter;
    export var debugLevel: number;
    
    interface IObservableValue<T, S> {
        (): T;
        (value: T): S;
        observe(callback: (newValue: T, oldValue: T) => void, fireImmediately:boolean): Lambda;
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

    interface Lambda {
        (): void;
    }
}
