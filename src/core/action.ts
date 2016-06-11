import {transaction} from "../core/transaction";
import {invariant} from "../utils/utils";
import {untracked} from "../core/derivation";
import {isSpyEnabled, spyReportStart, spyReportEnd} from "../core/spy";
import {ComputedValue} from "../core/computedvalue";
import {globalState} from "../core/globalstate";
import {createClassPropertyDecorator} from "../utils/decorators";

const actionDecorator = createClassPropertyDecorator(
	function (target, key, value, args, originalDescriptor) {
		const actionName = (args && args.length === 1) ? args[0] : (value.name || key || "<unnamed action>");
		const wrappedAction = action(actionName, value);
		if (originalDescriptor && originalDescriptor.value && target.constructor && target.constructor.prototype) {
			// shared method, replace this very property on the prototype with the right value
			Object.defineProperty(target.constructor.prototype, key, {
				configurable: true, enumerable: false, writable: false,
				value: wrappedAction
			});
		} else {
			// bound instance methods
			Object.defineProperty(target, key, {
				configurable: true, enumerable: false,	writable: false,
				value: wrappedAction
			});
		}
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

	return actionDecorator.apply(null, arguments);
}

export function isAction(thing: any) {
	return typeof thing === "function" && thing.isMobxAction === true;
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
		const flattendArgs = [];
		for (let i = 0, l = args.length; i < l; i++)
			flattendArgs.push(args[i]);
		spyReportStart({
			type: "action",
			name: actionName,
			fn,
			target: scope,
			arguments: flattendArgs
		});
	}
	const res = untracked(
		() => transaction(
			() => allowStateChanges(true, () => fn.apply(scope, args)),
			undefined,
			false
		)
	);
	if (notifySpy)
		spyReportEnd({ time: Date.now() - startTime });
	return res;
}

export function useStrict(strict: boolean) {
	invariant(globalState.derivationStack.length === 0, "It is not allowed to set `useStrict` when a derivation is running");
	globalState.strictMode = strict;
	globalState.allowStateChanges = !strict;
}

export function allowStateChanges<T>(allowStateChanges: boolean, func: () => T): T {
	const prev = globalState.allowStateChanges;
	globalState.allowStateChanges = allowStateChanges;
	const res = func();
	globalState.allowStateChanges = prev;
	return res;
}
