import {transactionStart, transactionEnd} from "../core/transaction";
import {invariant, addHiddenProp} from "../utils/utils";
import {untrackedStart, untrackedEnd} from "../core/derivation";
import {isSpyEnabled, spyReportStart, spyReportEnd} from "../core/spy";
import {ComputedValue} from "../core/computedvalue";
import {globalState} from "../core/globalstate";
import {createClassPropertyDecorator} from "../utils/decorators";

const actionFieldDecorator = createClassPropertyDecorator(
	function (target, key, value, args, originalDescriptor) {
		const actionName = (args && args.length === 1) ? args[0] : (value.name || key || "<unnamed action>");
		const wrappedAction = action(actionName, value);
		addHiddenProp(target, key, wrappedAction);
	},
	function (key) {
		return this[key];
	},
	function () {
		invariant(false, "It is not allowed to assign new values to @action fields");
	},
	false,
	true
);

export function action<T extends Function>(fn: T): T;
export function action<T extends Function>(name: string, fn: T): T;
export function action(customName: string): (target: Object, key: string, baseDescriptor?: PropertyDescriptor) => void;
export function action(target: Object, propertyKey: string, descriptor?: PropertyDescriptor): void;
export function action(arg1, arg2?, arg3?, arg4?): any {
	if (arguments.length === 1 && typeof arg1 === "function")
		return actionImplementation(arg1.name || "<unnamed action>", arg1);
	if (arguments.length === 2  && typeof arg2 === "function")
		return actionImplementation(arg1, arg2);

	if (arguments.length === 1 && typeof arg1 === "string")
		return namedActionDecorator(arg1);

	return namedActionDecorator(arg2).apply(null, arguments);
}

function namedActionDecorator(name: string) {
	return function (target, prop, descriptor) {
		if (descriptor && typeof descriptor.value === "function") {
			// TypeScript @action method() { }. Defined on proto before being decorated
			// Don't use the field decorator if we are just decorating a method
			descriptor.value = actionImplementation(name, descriptor.value);
			descriptor.enumerable = false;
			return descriptor;
		}
		// bound instance methods
		return actionFieldDecorator(name).apply(this, arguments);
	}
}

export function isAction(thing: any) {
	return typeof thing === "function" && thing.isMobxAction === true;
}

export function runInAction<T>(block: () => T, scope?: any);
export function runInAction<T>(name: string, block: () => T, scope?: any);
export function runInAction<T>(arg1, arg2?, arg3?) {
	const actionName = typeof arg1 === "string" ? arg1 : arg1.name || "<unnamed action>";
	const fn = typeof arg1 === "function" ? arg1 : arg2;
	const scope = typeof arg1 === "function" ? arg2 : arg3;

	invariant(typeof fn === "function", "`runInAction` expects a function");
	invariant(fn.length === 0, "`runInAction` expects a function without arguments");
	invariant(typeof actionName === "string" && actionName.length > 0, `actions should have valid names, got: '${actionName}'`);

	return executeWrapped(actionName, fn, scope, undefined);
}

export function actionImplementation(actionName: string, fn: Function): Function {
	invariant(typeof fn === "function", "`action` can only be invoked on functions");
	invariant(typeof actionName === "string" && actionName.length > 0, `actions should have valid names, got: '${actionName}'`);
	const res = function () {
		return executeWrapped(actionName, fn, this, arguments);
	};
	(res as any).isMobxAction = true;
	return res;
}

function executeWrapped(actionName: string, fn: Function, scope: any, args: IArguments) {
	// actions should not be called from computeds. check only works if the computed is actively observed, but that is fine enough as heuristic
	const ds = globalState.derivationStack;
	invariant(!(ds[ds.length - 1] instanceof ComputedValue), "Computed values or transformers should not invoke actions or trigger other side effects");

	const notifySpy = isSpyEnabled();
	let startTime: number;
	if (notifySpy) {
		startTime = Date.now();
		const l = (args && args.length) || 0;
		const flattendArgs = new Array(l);
		if (l > 0) for (let i = 0; i < l; i++)
			flattendArgs[i] = args[i];
		spyReportStart({
			type: "action",
			name: actionName,
			fn,
			target: scope,
			arguments: flattendArgs
		});
	}
	const prevUntracked = untrackedStart();
	transactionStart(actionName, scope, false);
	const prevAllowStateChanges = allowStateChangesStart(true);

	try {
		return fn.apply(scope, args);
	}
	finally {
		allowStateChangesEnd(prevAllowStateChanges);
		transactionEnd(false);
		untrackedEnd(prevUntracked);
		if (notifySpy)
			spyReportEnd({ time: Date.now() - startTime });
	}
}

export function useStrict(strict: boolean) {
	invariant(globalState.derivationStack.length === 0, "It is not allowed to set `useStrict` when a derivation is running");
	globalState.strictMode = strict;
	globalState.allowStateChanges = !strict;
}

export function allowStateChanges<T>(allowStateChanges: boolean, func: () => T): T {
	const prev = allowStateChangesStart(allowStateChanges);
	const res = func();
	allowStateChangesEnd(prev);
	return res;
}

export function allowStateChangesStart(allowStateChanges: boolean) {
	const prev = globalState.allowStateChanges;
	globalState.allowStateChanges = allowStateChanges;
	return prev;
}

export function allowStateChangesEnd(prev: boolean) {
	globalState.allowStateChanges = prev;
}