import ComputedValue from './core/computedvalue';
import {getDNode} from './extras';
import {once} from './utils/utils';
import {isObservable, autorun} from './core';

export type ITransformer<A, B> = (object: A) => B;

export function createTransformer<A, B>(transformer: ITransformer<A,B>, onCleanup?: (resultObject: B, sourceObject?: A) => void): ITransformer<A, B> {
	if (typeof transformer !== "function" || transformer.length !== 1)
		throw new Error("[mobservable] transformer parameter should be a function that accepts one argument");

	// Memoizes: object id -> reactive view that applies transformer to the object
	const objectCache : {[id:number]: ComputedValue<B>} = {};

	// Local transformer class specifically for this transformer
	class Transformer extends ComputedValue<B> {
		constructor(private sourceIdentifier: string, private sourceObject: A) {
			super(() => transformer(sourceObject), null, `transformer-${(<any>transformer).name}-${sourceIdentifier}`, false);
		}
		onBecomeUnobserved() {
			const lastValue = this.value;
			super.onBecomeUnobserved();
			delete objectCache[this.sourceIdentifier];
			if (onCleanup)
				onCleanup(lastValue, this.sourceObject);
		}
	}

	return (object: A) => {
		const identifier = getMemoizationId(object);
		let reactiveTransformer = objectCache[identifier];
		if (reactiveTransformer)
			return reactiveTransformer.get();
		// Not in cache; create a reactive view
		reactiveTransformer = objectCache[identifier] = new Transformer(identifier, object);
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