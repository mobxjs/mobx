import {Lambda, getNextId, deprecated, invariant, valueDidChange} from "../utils/utils";
import {assertUnwrapped, ValueMode, getValueModeFromValue} from "../types/modifiers";
import {Reaction, IReactionPublic} from "../core/reaction";
import {untrackedStart, untrackedEnd} from "../core/derivation";
import {action} from "../api/action";

/**
 * Creates a reactive view and keeps it alive, so that the view is always
 * updated if one of the dependencies changes, even when the view is not further used by something else.
 * @param view The reactive view
 * @param scope (optional)
 * @returns disposer function, which can be used to stop the view from being updated in the future.
 */
export function autorun(view: (r: IReactionPublic) => void, scope?: any);

/**
 * Creates a named reactive view and keeps it alive, so that the view is always
 * updated if one of the dependencies changes, even when the view is not further used by something else.
 * @param name The view name
 * @param view The reactive view
 * @param scope (optional)
 * @returns disposer function, which can be used to stop the view from being updated in the future.
 */
export function autorun(name: string, view: (r: IReactionPublic) => void, scope?: any);

export function autorun(arg1: any, arg2: any, arg3?: any) {
	let name: string, view: (r: IReactionPublic) => void, scope: any;
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
	if (scope)
		view = view.bind(scope);

	const reaction = new Reaction(name, function () {
		this.track(reactionRunner);
	});

	function reactionRunner() {
		view(reaction);
	}

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
		name = ("When@" + getNextId());
		predicate = arg1;
		effect = arg2;
		scope = arg3;
	}

	const disposer = autorun(name, r => {
		if (predicate.call(scope)) {
			r.dispose();
			const prevUntracked = untrackedStart();
			effect.call(scope);
			untrackedEnd(prevUntracked);
		}
	});
	return disposer;
}

export function autorunUntil(predicate: () => boolean, effect: (r: IReactionPublic) => void, scope?: any) {
	deprecated("`autorunUntil` is deprecated, please use `when`.");
	return when.apply(null, arguments);
}

export function autorunAsync(name: string, func: (r: IReactionPublic) => void, delay?: number, scope?: any);

export function autorunAsync(func: (r: IReactionPublic) => void, delay?: number, scope?: any);

export function autorunAsync(arg1: any, arg2: any, arg3?: any, arg4?: any) {
	let name: string, func: (r: IReactionPublic) => void, delay: number, scope: any;
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
					r.track(reactionRunner);
			}, delay);
		}
	});

	function reactionRunner() { func(r); }

	r.schedule();
	return r.getDisposer();
}

/**
 *
 * Basically sugar for computed(expr).observe(action(effect))
 * or
 * autorun(() => action(effect)(expr));
 */
export function reaction<T>(name: string, expression: () => T, effect: (arg: T, r: IReactionPublic) => void, fireImmediately?: boolean, delay?: number, scope?: any);

/**
 *
 * Basically sugar for computed(expr).observe(action(effect))
 * or
 * autorun(() => action(effect)(expr));
 */
export function reaction<T>(expression: () => T, effect: (arg: T, r: IReactionPublic) => void, fireImmediately?: boolean, delay?: number, scope?: any);

export function reaction<T>(arg1: any, arg2: any, arg3: any, arg4?: any, arg5?: any, arg6?: any) {
	let name: string, expression: () => T, effect: (arg: T, r: IReactionPublic) => void, fireImmediately: boolean, delay: number, scope: any;
	if (typeof arg1 === "string") {
		name = arg1;
		expression = arg2;
		effect = arg3;
		fireImmediately = arg4;
		delay = arg5;
		scope = arg6;
	} else {
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

	let [valueMode, unwrappedExpression] = getValueModeFromValue(expression, ValueMode.Reference);
	const compareStructural = valueMode === ValueMode.Structure;

	if (scope) {
		unwrappedExpression = unwrappedExpression.bind(scope);
		effect = action(name, effect.bind(scope));
	}

	let firstTime = true;
	let isScheduled = false;
	let nextValue = undefined;

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

	function reactionRunner () {
		if (r.isDisposed)
			return;
		let changed = false;
		r.track(() => {
			const v = unwrappedExpression(r);
			changed = valueDidChange(compareStructural, nextValue, v);
			nextValue = v;
		});
		if (firstTime && fireImmediately)
			effect(nextValue, r);
		if (!firstTime && changed === true)
			effect(nextValue, r);
		if (firstTime)
			firstTime = false;
	}


	r.schedule();
	return r.getDisposer();
}