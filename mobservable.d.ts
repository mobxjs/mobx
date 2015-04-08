interface Lambda {
	(): void;
}
interface IObservableValue<T, S> {
	(): T;
	(value: T): S;
	subscribe(callback: (newValue: T, oldValue: T) => void): Lambda;
}

interface MobservableStatic {
	<T,S>(value?:T|{():T}, scope?:S):IObservableValue<T,S>;

	value<T,S>(value?:T|{():T}, scope?:S):IObservableValue<T,S>;
	watch<T>(func:()=>T, onInvalidate:Lambda):[T,Lambda];
	array<T>(values?:T[]): IObservableArray<T>;
	batch(action:Lambda);
	onReady(listener:Lambda):Lambda;
	onceReady(listener:Lambda);
	defineProperty<T>(object:Object, name:string, initialValue?:T);
}

 interface IObservableArray<T> extends Array<T> {
	[n: number]: T;
	length: number;

	spliceWithArray(index:number, deleteCount?:number, newItems?:T[]):T[];
	observe(listener:()=>void, fireImmediately:boolean):Lambda;
	clear(): T[];
	replace(newItems:T[]);
	values(): T[];
}

declare module "mobservable" {
	export = MobservableStatic;
}
