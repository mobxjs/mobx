import {ObservableView} from './observableview';
import {getDNode} from './extras';
import {once} from './utils';
import {isObservable, autorun} from './core';

export interface ITransformer<A, B> {
	(object: A): B;
	root(object: A): ITransformController<B>;
};

export interface ITransformController<B> {
	value: B;
	dispose();
}

export function createTransformer<A, B>(transformer: (object: A) => B, onCleanup?: (object: A, result?: B) => void): ITransformer<A, B> {
	if (typeof transformer !== "function" || transformer.length !== 1)
		throw new Error("[mobservable] transformer parameter should be a function that accepts one argument");

	// Memoizes: object id -> reactive view that applies transformer to the object
	const objectCache : {[id:number]: ObservableView<B>} = {};

	const result = (object: A) => {
		const identifier = getId(object);
		let reactiveTransformer = objectCache[identifier];
		if (reactiveTransformer)
			return reactiveTransformer.get();

		// Not in cache; create a reactive view
		reactiveTransformer = objectCache[identifier] = new ObservableView<any>(() => {
			return transformer(object);
		}, this, {
			object: object,
			name: `transformer-${(<any>transformer).name}-${identifier}`
		}, false);

		// remove the view from the cache as soon as the object isn't part of the graph anymore
		reactiveTransformer.onceSleep((lastValue) => {
			delete objectCache[identifier];
			if (onCleanup)
				onCleanup(object, lastValue);
		});
		
		return reactiveTransformer.get();
	};
	
	// transformer.root(object); transforms object and keeps it 'hot'.
	// will never fallback to lazy behavior when there are no observers
	(<any>result).root = (object: A) => new RootTransformer(object); 
	
	class RootTransformer {
		disposed = false;
		rootView: ObservableView<B>;
		
		constructor(private source:A) {
			const identifier = getId(source);
			// use autorun to keep the transformation alive until we found the view function
			const tempDisposer = autorun(() => {
				result(this.source);
			});
			this.rootView = objectCache[identifier];
			this.rootView.setRefCount(+1);
			tempDisposer();
		}
		
		get value():B {
			if (this.disposed)
				throw new Error("[mobservable] transformer.root: The root transformer is already disposed");
			return this.rootView.get();
		}
		
		dispose = once(() => {
			this.rootView.setRefCount(-1);
			this.disposed = true;
		});
	}
	
	return <ITransformer<A,B>> result;
}

let transformId = 0;

function getId(object) {
//	if (!isObservable(object))
//		throw new Error("[mobservable] transform expected some observable object, got: " + object);
	var tid = object.$transformId;
	if (tid === undefined)
		return object.$transformId = ++transformId;
	return tid;
}