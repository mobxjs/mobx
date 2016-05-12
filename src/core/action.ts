import {transaction} from "../core/transaction";
import {invariant} from "../utils/utils";
import {untracked} from "../core/derivation";
import {allowStateChanges} from "../api/extras";
import {isSpyEnabled, spyReportStart, spyReportEnd} from "../core/spy";
import {ComputedValue} from "../core/computedvalue";
import {globalState} from "../core/globalstate";

export function action<T extends Function>(fn: T): T;
export function action<T extends Function>(name: string, fn: T): T;
export function action(customName: string): (target: Object, key: string, baseDescriptor?: PropertyDescriptor) => void;
export function action(target: any, propertyKey: string, descriptor: PropertyDescriptor): void;
export function action(arg1, arg2?, arg3?, arg4?): any {
	switch (arguments.length) {
		case 1:
			// action(someFunction)
			if (typeof arg1 === "function")
				return actionImplementation(arg1.name || "<unnamed action>", arg1);
			// @action("custom name") someFunction
			else
				return (target, key, descriptor) => actionDecorator(arg1, descriptor);
		case 2:
			// action("custom name", someFunction)
			return actionImplementation(arg1, arg2);
		case 3:
			// @action someFunction
			return actionDecorator(arg2, arg3);
		default:
			invariant(false, "Invalid arguments for (@)action, please provide a function, name and function or use it as decorator on a class instance method");
	}
}

function actionDecorator(name: string, descriptor: PropertyDescriptor) {
	const base = descriptor.value;
	descriptor.value = actionImplementation(name, base);
}

export function actionImplementation(actionName: string, fn: Function): Function {
	return function () {
		return executeWrapped(actionName, fn, this, arguments);
	};
}

function executeWrapped(actionName: string, fn: Function, scope: any, args: IArguments) {
	// actions should not be called from computeds. check only works if the computed is actively observed, but that is fine enough as heuristic
	const ds = globalState.derivationStack;
	invariant(!(ds[ds.length - 1] instanceof ComputedValue), "Computed values should not invoke actions or trigger other side effects");

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
