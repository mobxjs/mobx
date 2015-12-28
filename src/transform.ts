import {DerivedValue} from './dnode';
import {getDNode} from './extras';
import {once} from './utils';
import {isObservable, autorun} from './core';

export type ITransformer<A, B> = (object: A) => B;

export function createTransformer<A, B>(transformer: ITransformer<A,B>, onCleanup?: (resultObject: B, sourceObject?: A) => void): ITransformer<A, B> {
	if (typeof transformer !== "function" || transformer.length !== 1)
		throw new Error("[mobservable] transformer parameter should be a function that accepts one argument");

	// Memoizes: object id -> reactive view that applies transformer to the object
	const objectCache : {[id:number]: DerivedValue<B>} = {};

	return (object: A) => {
		const identifier = getMemoizationId(object);
		let reactiveTransformer = objectCache[identifier];
		if (reactiveTransformer)
			return reactiveTransformer.get();

		// Not in cache; create a reactive view
		reactiveTransformer = objectCache[identifier] = new DerivedValue<any>(() => {
			return transformer(object);
		}, this, `transformer-${(<any>transformer).name}-${identifier}`, false);

		// remove the view from the cache as soon as the object isn't part of the graph anymore
		reactiveTransformer.onceSleep((lastValue) => {
			delete objectCache[identifier];
			if (onCleanup)
				onCleanup(lastValue, object);
		});

		return reactiveTransformer.get();
	};
}

let transformId = 0;

function getMemoizationId(object) {
	if (object === null  || typeof object !== "object")
		throw new Error("[mobservable] transform expected some kind of object, got: " + object);
	var tid = object.$transformId;
	if (tid === undefined)
		return object.$transformId = ++transformId;
	return tid;
}