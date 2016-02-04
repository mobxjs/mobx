import {Lambda, once} from "../utils/utils";
import {assertUnwrapped} from "../types/modifiers";
import Reaction from "../core/reaction";
import globalState, {isComputingDerivation} from "../core/globalstate";
import {observable} from "../api/observable";
import {IObservable, reportObserved} from "../core/observable";

/**
 * Creates a reactive view and keeps it alive, so that the view is always
 * updated if one of the dependencies changes, even when the view is not further used by something else.
 * @param view The reactive view
 * @param scope (optional)
 * @returns disposer function, which can be used to stop the view from being updated in the future.
 */
export function autorun(view:Lambda, scope?:any):Lambda {
	assertUnwrapped(view, "autorun methods cannot have modifiers");
	if (typeof view !== "function")
		throw new Error("[mobservable.autorun] expects a function");
	if (view.length !== 0)
		throw new Error("[mobservable.autorun] expects a function without arguments");
	if (scope)
		view = view.bind(scope);

	const reaction = new Reaction(view.name, function () {
		this.track(view);
	});
	if (isComputingDerivation() || globalState.inTransaction > 0)
		globalState.pendingReactions.push(reaction);
	else
		reaction.runReaction();
/*
	let disposedPrematurely = false;
	let started = false;

	runAfterTransaction(() => {
		if (!disposedPrematurely) {
			// TODO: restore observable.setRefCount(+1);
			started = true;
		}
	});

	const disposer = once(() => {
		if (started) {
			// TODO: restore  observable.setRefCount(-1);
		}else
			disposedPrematurely = true;
	});
	(<any>disposer).$mobservable = observable;
	return disposer;
*/
	const disposer = () => reaction.dispose();
	(<any>disposer).$mobservable = reaction;
	return disposer;
}

/**
 * Similar to 'observer', observes the given predicate until it returns true.
 * Once it returns true, the 'effect' function is invoked an the observation is cancelled.
 * @param predicate
 * @param effect
 * @param scope (optional)
 * @returns disposer function to prematurely end the observer.
 */
export function autorunUntil(predicate: ()=>boolean, effect: Lambda, scope?: any): Lambda {
	// TODO: rename to when
	// TODO: use Reaction class
	let disposeImmediately = false;
	const disposer = autorun(() => {
		if (predicate.call(scope)) {
			if (disposer)
				disposer();
			else
				disposeImmediately = true;
			effect.call(scope)
		}
	});
	if (disposeImmediately)
		disposer();
	return disposer;
}

/**
 * Once the view triggers, effect will be scheduled in the background.
 * If observer triggers multiple times, effect will still be triggered only once, so it achieves a similar effect as transaction.
 * This might be useful for stuff that is expensive and doesn't need to happen synchronously; such as server communication.
 * Afther the effect has been fired, it can be scheduled again if the view is triggered in the future.
 *
 * @param view to observe. If it returns a value, the latest returned value will be passed into the scheduled effect.
 * @param the effect that will be executed, a fixed amount of time after the first trigger of 'view'.
 * @param delay, optional. After how many milleseconds the effect should fire.
 * @param scope, optional, the 'this' value of 'view' and 'effect'.
 */
// TODO: remove this one
function autorunAsyncDeprecated<T>(view: () => T, effect: (latestValue : T ) => void, delay:number = 1, scope?: any): Lambda {
	let latestValue: T = undefined;
	let timeoutHandle;

	const disposer = autorun(() => {
		latestValue = view.call(scope);
		if (!timeoutHandle) {
			timeoutHandle = setTimeout(() => {
				effect.call(scope, latestValue);
				timeoutHandle = null;
			}, delay);
		}
	});

	return once(() => {
		disposer();
		if (timeoutHandle)
			clearTimeout(timeoutHandle);
	});
}

// Deprecate:
export function autorunAsync<T>(view: () => T, effect: (latestValue : T ) => void, delay?:number, scope?: any): Lambda;
export function autorunAsync(func: Lambda, delay?:number, scope?: any): Lambda;
// Deprecate weird overload:
export function autorunAsync<T>(func: Lambda | {():T}, delay:number | {(x:T):void} = 1, scope?: any): Lambda {
	if (typeof delay === "function") {
		console.warn("[mobservable] autorun(func, func) is deprecated and will removed in 2.0");
		return autorunAsyncDeprecated.apply(null, arguments);
	}
	let shouldRun = false;
	let tickScheduled = false;
	let tick = observable(0);
	let observedValues: IObservable[] = [];
	let disposer: Lambda;
	let isDisposed = false;

	function schedule(f: Lambda) {
		setTimeout(f, delay);
	}

	function doTick() {
		tickScheduled = false;
		shouldRun = true;
		tick(tick() + 1);
	}

	disposer = autorun(() => {
		if (isDisposed)
			return;
		tick(); // observe so that autorun fires on next tick
		if (shouldRun) {
			func.call(scope);
			observedValues = (<any>disposer).$mobservable.observing;
			shouldRun = false;
		} else {
			// keep observed values eager, probably cheaper then forgetting
			// about the value and later re-evaluating lazily,
			// probably cheaper when computations are expensive
			observedValues.forEach(o => reportObserved(o));
			if (!tickScheduled) {
				tickScheduled = true;
				schedule(doTick);
			}
		}
	});

	return once(() => {
		isDisposed = true; // short-circuit any pending calculation
		if (disposer)
			disposer();
	});
}
