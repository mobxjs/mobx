declare module "mobservable" {
	interface Lambda {
		(): void;
	}
	interface IObservableValue<T, S> {
		(): T;
		(value: T): S;
		subscribe(callback: (newValue: T, oldValue: T) => void): Lambda;
	}

	export function value<T,S>(value?:T|{():T}, scope?:S):IObservableValue<T,S>;
	export function watch<T>(func:()=>T, onInvalidate:Lambda):[T,Lambda];
	export function array<T>(values?:T[]): IObservableArray<T>;
	export function batch(action:Lambda);
	export function onReady(listener:Lambda):Lambda;
	export function onceReady(listener:Lambda);
	export function defineProperty<T>(object:Object, name:string, initialValue?:T);

	interface IObservableArray<T> extends Array<T> {
		[n: number]: T;
		length: number;

		spliceWithArray(index:number, deleteCount?:number, newItems?:T[]):T[];
		observe(listener:()=>void, fireImmediately:boolean):Lambda;
		clear(): T[];
		replace(newItems:T[]);
		values(): T[];
	}
}
