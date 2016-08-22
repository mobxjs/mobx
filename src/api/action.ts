import {invariant, addHiddenProp} from "../utils/utils";
import {createClassPropertyDecorator} from "../utils/decorators";
import {createAction, executeAction} from "../core/action";

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
		return createAction(arg1.name || "<unnamed action>", arg1);
	if (arguments.length === 2  && typeof arg2 === "function")
		return createAction(arg1, arg2);

	if (arguments.length === 1 && typeof arg1 === "string")
		return namedActionDecorator(arg1);

	return namedActionDecorator(arg2).apply(null, arguments);
}

function namedActionDecorator(name: string) {
	return function (target, prop, descriptor) {
		if (descriptor && typeof descriptor.value === "function") {
			// TypeScript @action method() { }. Defined on proto before being decorated
			// Don't use the field decorator if we are just decorating a method
			descriptor.value = createAction(name, descriptor.value);
			descriptor.enumerable = false;
			descriptor.configurable = true;
			return descriptor;
		}
		// bound instance methods
		return actionFieldDecorator(name).apply(this, arguments);
	};
}

export function runInAction<T>(block: () => T, scope?: any): T;
export function runInAction<T>(name: string, block: () => T, scope?: any): T;
export function runInAction<T>(arg1, arg2?, arg3?) {
	const actionName = typeof arg1 === "string" ? arg1 : arg1.name || "<unnamed action>";
	const fn = typeof arg1 === "function" ? arg1 : arg2;
	const scope = typeof arg1 === "function" ? arg2 : arg3;

	invariant(typeof fn === "function", "`runInAction` expects a function");
	invariant(fn.length === 0, "`runInAction` expects a function without arguments");
	invariant(typeof actionName === "string" && actionName.length > 0, `actions should have valid names, got: '${actionName}'`);

	return executeAction(actionName, fn, scope, undefined);
}

export function isAction(thing: any) {
	return typeof thing === "function" && thing.isMobxAction === true;
}

