import {ComputedValue} from "../core/computedvalue";
import {invariant, getNextId, addHiddenProp} from "../utils/utils";
import {globalState} from "../core/globalstate";

export type ITransformer<A, B> = (object: A) => B;

// Doesn't currently support the onCleanup for multiple arguments because I don't know how to type it
export function createTransformer<F extends (...args: any[]) => R, R>(transformer: F): F
export function createTransformer<T, R>(transformer: ITransformer<T, R>, onCleanup: (resultObject: R | undefined, sourceObject?: T) => void): ITransformer<T, R>
export function createTransformer<F extends (...args: any[]) => R, R>(transformer: F, onCleanup?: (resultObject: R, ...sourceObjects: any[]) => void): F {
	invariant(typeof transformer === "function", "createTransformer expects a function");

	// Memoizes: object id -> reactive view that applies transformer to the object
	let objectCache: {[key: string]: ComputedValue<R>} = {};
	// Caches symbol -> string key
	let symbolCache: {} = {};

	// If the resetId changes, we will clear the object cache, see #163
	// This construction is used to avoid leaking refs to the objectCache directly
	let resetId = globalState.resetId;

	return (function (...objects: any[]) {
		// Limit the length to that of the transformer
		// Without this, use in functions like .map() break because of extra unwanted arguments
		objects = objects.slice(0, transformer.length);

		if (resetId !== globalState.resetId) {
			objectCache = {};
			symbolCache = {};
			resetId = globalState.resetId;
		}

		const identifier = getMemoizationId(symbolCache, objects);
		let reactiveTransformer = objectCache[identifier];
		if (reactiveTransformer)
			return reactiveTransformer.get();

		// Not in cache; create a reactive view
		objectCache[identifier] = new cleanupValue(() => transformer.apply(this, objects), lastValue => {
			delete objectCache[identifier];
			if (onCleanup) onCleanup(lastValue, ...objects);
		});
		reactiveTransformer = objectCache[identifier];

		return reactiveTransformer.get();
	}) as F;
}

// Calls onCleanup from onBecomeUnobserved
// Used to power the main transform cache and the symbol id cache 
class cleanupValue<T> extends ComputedValue<T> {
	constructor(
		private f: () => T,
		private onCleanup?: (lastValue: T) => void
	) {
		super(f, undefined, false, "");
	}

	onBecomeUnobserved() {
		const lastValue = this.value;
		super.onBecomeUnobserved();
		if (this.onCleanup)
			this.onCleanup(lastValue as T);
	}
}

function getMemoizationId(symbolCache: {}, objects: any[]): string {
	// The key lengths are added to the front so that f("a", "b") !== f("ab")
	const keys = objects.map(obj => getObjectMemoizationId(symbolCache, obj));
    const keyLengths = keys.map(key => key.length);
    return `${keyLengths.join(",")}:${keys.join("")}`;
}

function getObjectMemoizationId(symbolCache: {}, object): string {
	switch (typeof object) {
		case "symbol": return getSymbolId(object, symbolCache);
		case "undefined": return "undefined";

        case "string":
        case "number":
        case "boolean":
		{
            // The type is added such that f("1") !== f(1)
            return `${typeof object}:${object.toString()}`;
		}

        default: {
            if (object === null) return "null";

			let tid = object.$transformId as number;
			if (tid === undefined) {
				if (!Object.isExtensible(object)) throw new Error("Transformed objects must be extensible.");

				tid = getNextId();
				addHiddenProp(object, "$transformId", tid);
			}

            return tid.toString();
        }
    }
}

// The libs don't contain Symbol, so we're stuck using any here
function getSymbolId(symbol: any, symbolCache: {}) {
	let cachedSymbolValue = symbolCache[symbol] as cleanupValue<string>;

	if (!cachedSymbolValue) {
		const key = getNextId().toString();
		cachedSymbolValue = symbolCache[symbol] = new cleanupValue(() => key, () => {
			delete symbolCache[symbol];
		});
	}

	return cachedSymbolValue.get();
}