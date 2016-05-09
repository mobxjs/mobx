import {transaction} from "../core/transaction";
import {isObservableObject} from "../types/observableobject";
import {invariant} from "../utils/utils";
import {untracked} from "../core/observable";
import {allowStateChanges} from "./extras";
import {isSpyEnabled, spyReportStart, spyReportEnd} from "../core/spy";

export function action<T extends Function>(fn: T): T;
export function action<T extends Function>(name: string, fn: T): T;
export function action(target: any, propertyKey: string, descriptor: PropertyDescriptor): void;
export function action(arg1, arg2?, arg3?): any {
	// TODO: introduce reaction as well?
	// TODO: empty derivation stack warning?
	switch (arguments.length) {
		case 1:
			return actionImplementation(arg1.name || "<unnamed action>", arg1);
		case 2:
			return actionImplementation(arg1, arg2);
		case 3:
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
