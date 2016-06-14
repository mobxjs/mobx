import {Lambda, getNextId, deprecated, invariant} from "../utils/utils";
import {assertUnwrapped} from "../types/modifiers";
import {Reaction} from "../core/reaction";
import {untrackedStart, untrackedEnd} from "../core/derivation";
import {action} from "../core/action";

/**
 * Creates a reactive view and keeps it alive, so that the view is always
 * updated if one of the dependencies changes, even when the view is not further used by something else.
 * @param view The reactive view
 * @param scope (optional)
 * @returns disposer function, which can be used to stop the view from being updated in the future.
 */
export function autorun(view: Lambda, scope?: any);

/**
 * Creates a named reactive view and keeps it alive, so that the view is always
 * updated if one of the dependencies changes, even when the view is not further used by something else.
 * @param name The view name
 * @param view The reactive view
 * @param scope (optional)
 * @returns disposer function, which can be used to stop the view from being updated in the future.
 */
export function autorun(name: string, view: Lambda, scope?: any);

export function autorun(arg1: any, arg2: any, arg3?: any) {
	let name: string, view: Lambda, scope: any;
	if (typeof arg1 === "string") {
		name = arg1;
		view = arg2;
		scope = arg3;
	} else if (typeof arg1 === "function") {
		name = arg1.name || ("Autorun@" + getNextId());
		view = arg1;
		scope = arg2;
	}

	assertUnwrapped(view, "autorun methods cannot have modifiers");
	invariant(typeof view === "function", "autorun expects a function");
	invariant(view.length === 0, "autorun expects a function without arguments");
	if (scope)
		view = view.bind(scope);

	const reaction = new Reaction(name, function () {
		this.track(view);
	});
	reaction.schedule();

	return reaction.getDisposer();
}

/**
 * Similar to 'observer', observes the given predicate until it returns true.
 * Once it returns true, the 'effect' function is invoked an the observation is cancelled.
 * @param name
 * @param predicate
 * @param effect
 * @param scope (optional)
 * @returns disposer function to prematurely end the observer.
 */
export function when(name: string, predicate: () => boolean, effect: Lambda, scope?: any);

/**
 * Similar to 'observer', observes the given predicate until it returns true.
 * Once it returns true, the 'effect' function is invoked an the observation is cancelled.
 * @param predicate
 * @param effect
 * @param scope (optional)
 * @returns disposer function to prematurely end the observer.
 */
export function when(predicate: () => boolean, effect: Lambda, scope?: any);

export function when(arg1: any, arg2: any, arg3?: any, arg4?: any) {
	let name: string, predicate: () => boolean, effect: Lambda, scope: any;
	if (typeof arg1 === "string") {
		name = arg1;
		predicate = arg2;
		effect = arg3;
		scope = arg4;
	} else if (typeof arg1 === "function") {
		name = ("Autorun@" + getNextId());
		predicate = arg1;
		effect = arg2;
		scope = arg3;
	}

	let disposeImmediately = false;
	const disposer = autorun(name, () => {
		if (predicate.call(scope)) {
			if (disposer)
				disposer();
			else
				disposeImmediately = true;
			const prevUntracked = untrackedStart();
			effect.call(scope);
			untrackedEnd(prevUntracked);
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

export function autorunAsync(name: string, func: Lambda, delay?: number, scope?: any);

export function autorunAsync(func: Lambda, delay?: number, scope?: any);

export function autorunAsync(arg1: any, arg2: any, arg3?: any, arg4?: any) {
	let name: string, func: Lambda, delay: number, scope: any;
	if (typeof arg1 === "string") {
		name = arg1;
		func = arg2;
		delay = arg3;
		scope = arg4;
	} else if (typeof arg1 === "function") {
		name = arg1.name || ("AutorunAsync@" + getNextId());
		func = arg1;
		delay = arg2;
		scope = arg3;
	}

	if (delay === void 0)
		delay = 1;

	if (scope)
		func = func.bind(scope);

	let isScheduled = false;

	const r = new Reaction(name, () => {
		if (!isScheduled) {
			isScheduled = true;
			setTimeout(() => {
				isScheduled = false;
				if (!r.isDisposed)
					r.track(func);
			}, delay);
		}
	});

	r.schedule();
	return r.getDisposer();
}

/**
 *
 * Basically sugar for computed(expr).observe(action(effect))
 * or
 * autorun(() => action(effect)(expr));
 */
export function reaction<T>(name: string, expression: () => T, effect: (arg: T) => void, fireImmediately?: boolean, delay?: number, scope?: any);

/**
 *
 * Basically sugar for computed(expr).observe(action(effect))
 * or
 * autorun(() => action(effect)(expr));
 */
export function reaction<T>(expression: () => T, effect: (arg: T) => void, fireImmediately?: boolean, delay?: number, scope?: any);

export function reaction<T>(arg1: any, arg2: any, arg3: any, arg4?: any, arg5?: any, arg6?: any) {
	let name: string, expression: () => T, effect: (arg: T) => void, fireImmediately: boolean, delay: number, scope: any;
	if (typeof arg1 === "string") {
		name = arg1;
		expression = arg2;
		effect = arg3;
		fireImmediately = arg4;
		delay = arg5;
		scope = arg6;
	} else if (typeof arg1 === "function") {
		name = arg1.name || arg2.name || ("Reaction@" + getNextId());
		expression = arg1;
		effect = arg2;
		fireImmediately = arg3;
		delay = arg4;
		scope = arg5;
	}

	if (fireImmediately === void 0)
		fireImmediately = false;

	if (delay === void 0)
		delay = 0;

	if (scope) {
		expression = expression.bind(scope);
		effect = action(name, effect.bind(scope));
	}

	let firstTime = true;
	let isScheduled = false;

	function reactionRunner () {
		if (r.isDisposed)
			return;
		let nextValue;
		r.track(() => nextValue = expression());
		if (!firstTime || fireImmediately)
			effect(nextValue);
		if (firstTime)
			firstTime = false;
	}

	const r = new Reaction(name, () => {
		if (delay < 1) {
			reactionRunner();
		} else if (!isScheduled) {
			isScheduled = true;
			setTimeout(() => {
				isScheduled = false;
				reactionRunner();
			}, delay);
		}
	});

	r.schedule();
	return r.getDisposer();
}