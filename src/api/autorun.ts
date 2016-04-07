import {Lambda, deprecated, invariant} from "../utils/utils";
import {assertUnwrapped} from "../types/modifiers";
import {Reaction} from "../core/reaction";

/**
 * Creates a reactive view and keeps it alive, so that the view is always
 * updated if one of the dependencies changes, even when the view is not further used by something else.
 * @param view The reactive view
 * @param scope (optional)
 * @returns disposer function, which can be used to stop the view from being updated in the future.
 */
export function autorun(view: Lambda, scope?: any) {
	assertUnwrapped(view, "autorun methods cannot have modifiers");
	invariant(typeof view === "function", "autorun expects a function");
	invariant(view.length === 0, "autorun expects a function without arguments");
	if (scope)
		view = view.bind(scope);

	const reaction = new Reaction(view.name || "Autorun", function () {
		this.track(view);
	});
	reaction.schedule();

	return reaction.getDisposer();
}

/**
 * Similar to 'observer', observes the given predicate until it returns true.
 * Once it returns true, the 'effect' function is invoked an the observation is cancelled.
 * @param predicate
 * @param effect
 * @param scope (optional)
 * @returns disposer function to prematurely end the observer.
 */
export function when(predicate: () => boolean, effect: Lambda, scope?: any) {
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

export function autorunUntil(predicate: () => boolean, effect: Lambda, scope?: any) {
	deprecated("`autorunUntil` is deprecated, please use `when`.");
	return when.apply(null, arguments);
}

export function autorunAsync(func: Lambda, delay: number = 1, scope?: any) {
	if (scope)
		func = func.bind(scope);
	let isScheduled = false;

	const r = new Reaction(func.name || "AutorunAsync", () => {
		if (!isScheduled) {
			isScheduled = true;
			setTimeout(() => {
				isScheduled = false;
				if (!r.isDisposed)
					r.track(func);
			}, delay);
		}
	});

	r.runReaction();
	return r.getDisposer();
}