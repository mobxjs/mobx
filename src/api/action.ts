import {transaction} from "../core/transaction";
import {isObservableObject} from "../types/observableobject";
import {invariant} from "../utils/utils";

export function reportStateChange(propertyName, object, property, newValue, oldValue, changed) {
	
}

export function action<T extends Function>(fn: T): T;
export function action<T extends Function>(name: string, fn: T): T;
export function action(target: any, propertyKey: string, descriptor: PropertyDescriptor): void;
export function action(arg1, arg2?, arg3?): any {
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
	descriptor.value = actionImplementation(base);
}

export function actionImplementation(actionName: string, fn?: Function): Function {
	return function () {
		const logName = actionName + getNameForThis(this);
		//console.log("Starting action", logName);
		const args = arguments;
		return transaction(() => fn.apply(this, args));
	};
}

function getNameForThis(who) {
	if (isObservableObject(who)) {
		return ` (${who.$mobx.name}#${who.$mobx.id})`;
	}
	return "";
}