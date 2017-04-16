import {Lambda, getNextId, invariant, fail} from "../utils/utils";
import {isModifierDescriptor} from "../types/modifiers";
import {Reaction, IReactionPublic, IReactionDisposer} from "../core/reaction";
import {untrackedStart, untrackedEnd} from "../core/derivation";
import {action, isAction} from "../api/action";
import {IEqualsComparer, defaultComparer, structuralComparer} from "../types/comparer";
import {getMessage} from "../utils/messages";

/**
 * Creates a reactive view and keeps it alive, so that the view is always
 * updated if one of the dependencies changes, even when the view is not further used by something else.
 * @param view The reactive view
 * @param scope (optional)
 * @returns disposer function, which can be used to stop the view from being updated in the future.
 */
export function autorun(view: (r: IReactionPublic) => void, scope?: any): IReactionDisposer;

/**
 * Creates a named reactive view and keeps it alive, so that the view is always
 * updated if one of the dependencies changes, even when the view is not further used by something else.
 * @param name The view name
 * @param view The reactive view
 * @param scope (optional)
 * @returns disposer function, which can be used to stop the view from being updated in the future.
 */
export function autorun(name: string, view: (r: IReactionPublic) => void, scope?: any): IReactionDisposer;
export function autorun(arg1: any, arg2: any, arg3?: any) {
	let name: string,
		view: (r: IReactionPublic) => void,
		scope: any;

	if (typeof arg1 === "string") {
		name = arg1;
		view = arg2;
		scope = arg3;
	} else {
		name = arg1.name || ("Autorun@" + getNextId());
		view = arg1;
		scope = arg2;
	}

	invariant(typeof view === "function", getMessage("m004"));
	invariant(
		isAction(view) === false,
		getMessage("m005")
	);
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
export function when(name: string, predicate: () => boolean, effect: Lambda, scope?: any): IReactionDisposer;

/**
 * Similar to 'observer', observes the given predicate until it returns true.
 * Once it returns true, the 'effect' function is invoked an the observation is cancelled.
 * @param predicate
 * @param effect
 * @param scope (optional)
 * @returns disposer function to prematurely end the observer.
 */
export function when(predicate: () => boolean, effect: Lambda, scope?: any): Lambda;

export function when(arg1: any, arg2: any, arg3?: any, arg4?: any) {
	let name: string, predicate: () => boolean, effect: Lambda, scope: any;
	if (typeof arg1 === "string") {
		name = arg1;
		predicate = arg2;
		effect = arg3;
		scope = arg4;
	} else {
		name = ("When@" + getNextId());
		predicate = arg1;
		effect = arg2;
		scope = arg3;
	}

	const disposer = autorun(name, r => {
		if (predicate.call(scope)) {
			r.dispose();
			const prevUntracked = untrackedStart();
			(effect as any).call(scope);
			untrackedEnd(prevUntracked);
		}
	});
	return disposer;
}

export function autorunAsync(name: string, func: (r: IReactionPublic) => void, delay?: number, scope?: any): IReactionDisposer;
export function autorunAsync(func: (r: IReactionPublic) => void, delay?: number, scope?: any): IReactionDisposer;
export function autorunAsync(arg1: any, arg2: any, arg3?: any, arg4?: any) {
	let name: string, func: (r: IReactionPublic) => void, delay: number, scope: any;
	if (typeof arg1 === "string") {
		name = arg1;
		func = arg2;
		delay = arg3;
		scope = arg4;
	} else {
		name = arg1.name || ("AutorunAsync@" + getNextId());
		func = arg1;
		delay = arg2;
		scope = arg3;
	}
	invariant(
		isAction(func) === false,
		getMessage("m006")
	);
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

export interface IReactionOptions {
	context?: any;
	fireImmediately?: boolean;
	delay?: number;
	compareStructural?: boolean;
	/** alias for compareStructural */
	struct?: boolean;
	equals?: IEqualsComparer<any>;
	name?: string;
}


/**
 *
 * Basically sugar for computed(expr).observe(action(effect))
 * or
 * autorun(() => action(effect)(expr));
 */
export function reaction<T>(expression: (r: IReactionPublic) => T, effect: (arg: T, r: IReactionPublic) => void, opts?: IReactionOptions): IReactionDisposer;
export function reaction<T>(expression: (r: IReactionPublic) => T, effect: (arg: T, r: IReactionPublic) => void, fireImmediately?: boolean): IReactionDisposer;
export function reaction<T>(expression: (r: IReactionPublic) => T, effect: (arg: T, r: IReactionPublic) => void, arg3: any) {
	if (arguments.length > 3) {
		fail(getMessage("m007"));
	}
	if (isModifierDescriptor(expression)) {
		fail(getMessage("m008"));
	}

	let opts: IReactionOptions;
	if (typeof arg3 === "object") {
		opts = arg3;
	} else {
		opts = {};
	}

	opts.name = opts.name || (expression as any).name || (effect as any).name || ("Reaction@" + getNextId());
	opts.fireImmediately = arg3 === true || opts.fireImmediately === true;
	opts.delay = opts.delay || 0;
	opts.compareStructural = opts.compareStructural || opts.struct || false;
	effect = action(opts.name!, opts.context ? effect.bind(opts.context) : effect);
	if (opts.context) {
		expression = expression.bind(opts.context);
	}

	let firstTime = true;
	let isScheduled = false;
	let value: T;

	const equals = opts.equals ? opts.equals : (opts.compareStructural || opts.struct) ? structuralComparer : defaultComparer;
	const r = new Reaction(opts.name, () => {
		if (firstTime || (opts.delay as any) < 1) {
			reactionRunner();
		} else if (!isScheduled) {
			isScheduled = true;
			setTimeout(() => {
				isScheduled = false;
				reactionRunner();
			}, opts.delay);
		}
	});

	function reactionRunner () {
		if (r.isDisposed)
			return;
		let changed = false;
		r.track(() => {
			const nextValue = expression(r);
			changed = firstTime || !equals(value, nextValue);
			value = nextValue;
		});
		if (firstTime && opts.fireImmediately!)
			effect(value, r);
		if (!firstTime && (changed as boolean) === true)
			effect(value, r);
		if (firstTime)
			firstTime = false;
	}


	r.schedule();
	return r.getDisposer();
}
