declare module "mobservable" {
	interface Lambda {
	    (): void;
	}
	interface IProperty<T, S> {
	    (): T;
	    (value: T): S;
	    subscribe(callback: (newValue: T, oldValue: T) => void): Lambda;
	}
	function property<T, S>(value?: T | {(): T;}, scope?: S): IProperty<T, S>;
	function guard<T>(func: () => T, onInvalidate: Lambda): [T, Lambda];
	function batch(action: Lambda): void;
	function onReady(listener: Lambda): Lambda;
	function onceReady(listener: Lambda): void;
	function defineProperty<T>(object: Object, name: string, initialValue?: T): void;
}