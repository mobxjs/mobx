import {Lambda, once, deprecated} from "../utils/utils";
import {assertUnwrapped} from "../types/modifiers";
import {Reaction} from "../core/reaction";
import {globalState, isComputingDerivation} from "../core/globalstate";
import {observable} from "../api/observable";
import {IObservable, reportObserved} from "../core/observable";

/**
 * Creates a reactive view and keeps it alive, so that the view is always
 * updated if one of the dependencies changes, even when the view is not further used by something else.
 * @param view The reactive view
 * @param scope (optional)
 * @returns disposer function, which can be used to stop the view from being updated in the future.
 */
export function autorun(view: Lambda, scope?: any): Lambda {
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

	// Start or schedule the just created reaction
	if (isComputingDerivation() || globalState.inTransaction > 0)
		globalState.pendingReactions.push(reaction);
	else
		reaction.runReaction();

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
export function when(predicate: () => boolean, effect: Lambda, scope?: any): Lambda {
	let disposeImmediately = false;
	const disposer = autorun(() => {
		if (predicate.call(scope)) {
			if (disposer)
				disposer();
			else
				disposeImmediately = true;
			effect.call(scope);
		}
	});
	if (disposeImmediately)
		disposer();
	return disposer;
}

export function autorunUntil(predicate: () => boolean, effect: Lambda, scope?: any): Lambda {
	deprecated("`autorunUntil` is deprecated, please use `when`.");
	return when.apply(null, arguments);
}

export function autorunAsync(func: Lambda, delay: number = 1, scope?: any): Lambda {
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
