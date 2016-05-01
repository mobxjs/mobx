import {transaction} from "../core/transaction";
import {isObservableObject} from "../types/observableobject";
import {invariant} from "../utils/utils";
import {globalState} from "../core/globalstate";
import {untracked} from "../core/observable";
import {allowStateChanges} from "./extras";
import {hasListeners, notifyListeners} from "../types/listen-utils";

const tracing = true;
// TODO: remove stuff
function reportStateChange(observableName, object, propertyName, newValue, oldValue, changed) {
	if (tracing) {
		console.groupCollapsed([
			"changed '",
			observableName,
			propertyName === null ? "" : ("." + propertyName),
			"'",
			isPrimitive(newValue) ? " to '" + newValue + "'" : "",
			changed ? "" : " (unchanged)"
		].join(""));
		console.dir({
			observable: observableName,
			propertyName: propertyName,
			newValue: newValue,
			oldValue: oldValue,
			target: object
		});
		console.trace();
		console.groupEnd();
	}
}

export function action<T extends Function>(fn: T): T;
export function action<T extends Function>(name: string, fn: T): T;
export function action(target: any, propertyKey: string, descriptor: PropertyDescriptor): void;
export function action(arg1, arg2?, arg3?): any {
	// TODO: introduce reaction as well?
	// TODO: untracked?
	// TODO: empty derivation stack warning?
	// TODO: introduce transiationTracker event
	switch (arguments.length) {
		case 1:
			return actionImplementation(arg1.name || "<unnamed action>", arg1);
		case 2:
			return actionImplementation(arg1, arg2);
		case 3:
			return actionDecorator(arg3);
		default:
			invariant(false, "Invalid arguments for (@)action, please provide a function, name and function or use it as decorator on a class instance method");
	}
}

function actionDecorator(descriptor: PropertyDescriptor) {
	const base = descriptor.value;
	descriptor.value = actionImplementation(base.name, base);
}

export function actionImplementation(actionName: string, fn?: Function): Function {
	return function () {
		executeWrapped(actionName, fn, this, arguments);
	};
}

function executeWrapped(actionName: string, fn: Function, scope: any, args: IArguments) {
	if (hasListeners(globalState))
		notifyListeners(globalState, {
			type: "action",
			fn, scope, args
		});
	// TODO: unfold this to avoid 5 closures
	const res = untracked(() => transaction(() => allowStateChanges(true, () => fn.apply(scope, args))));
	if (hasListeners(globalState))
		notifyListeners(globalState, {
			type: "end"
		});
	return res;
	// if (tracing) {
	// 	actionName = actionName + getNameForThis(this);
	// 	(console as any).groupCollapsed("%c" + actionName, "color: blue");
	// }
	// const res = transaction(() => fn.apply(scope, args));
	// if (tracing) {
	// 	console.groupEnd();
	// }
	// return res;
}

function getNameForThis(who) {
	if (isObservableObject(who)) {
		return ` (${who.$mobx.name}#${who.$mobx.id})`;
	}
	return "";
}

function isPrimitive(value) {
	return value === null || value === undefined || typeof value === "string" || typeof value === "number";
}