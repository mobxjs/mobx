declare module "mobservable" {
    interface Lambda {
        (): void;
    }
    interface IObservableValue<T, S> {
        (): T;
        (value: T): S;
        observe(callback: (newValue: T, oldValue: T) => void, fireImmediately:boolean): Lambda;
    }

    export function array<T>(values?:T[]): IObservableArray<T>;
    export function value<T,S>(value?:T|{():T}, scope?:S):IObservableValue<T,S>;
    export function watch<T>(func:()=>T, onInvalidate:Lambda):[T,Lambda];
    export function observeProperty(object:Object, key:string, listener:Function, invokeImmediately?:boolean):Lambda;

	export function toJSON<T>(any:T):T;
	
    // annotation
    export function observable(target:Object, key:string);

	export function batch<T>(action:()=>T):T;
    export function onReady(listener:Lambda):Lambda;
    export function onceReady(listener:Lambda);
    export function defineObservableProperty<T>(object:Object, name:string, initialValue?:T);
    export function initializeObservableProperties(object:Object);

    export var SimpleEventEmitter: new() => ISimpleEventEmitter;

    interface IObservableArray<T> extends Array<T> {
        [n: number]: T;
        length: number;

        spliceWithArray(index:number, deleteCount?:number, newItems?:T[]):T[];
        observe(listener:(changeData:IArrayChange<T>|IArraySplice<T>)=>void, fireImmediately?:boolean):Lambda;
        clear(): T[];
        replace(newItems:T[]);
        values(): T[];
        clone(): IObservableArray<T>;
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
