import {transaction} from "../core/transaction";
import {invariant} from "../utils/utils";
import {untracked} from "../core/derivation";
import {isSpyEnabled, spyReportStart, spyReportEnd} from "../core/spy";
import {ComputedValue} from "../core/computedvalue";
import {globalState} from "../core/globalstate";
import {decoratorFactory2} from "../utils/decorators";

const actionDecoratorImpl = decoratorFactory2(
	function (target, key, value, args) {
		const actionName = (args && args.length === 1) ? args[0] : (value.name || key || "<unnamed action>");
		addBoundAction(target, key, action(actionName, value));
	},
	false,
	function (key) {
		return this[key];
	},
	function () {
		invariant(false, "It is not allowed to assign new values to @action fields");
	},
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

	return actionDecoratorImpl.apply(null, arguments);
}

function actionDecorator(name: string, target: any, key: string, descriptor: PropertyDescriptor) {
	if (descriptor === undefined) {
		// typescript: @action f = () => { } 
		typescriptActionValueDecorator(name, target, key);
		return;
	}
	if (descriptor.value === undefined && typeof (descriptor as any).initializer === "function") {
		// babel: @action f = () => { } 
		return babelActionValueDecorator(name, target, key, descriptor);
	}
	const base = descriptor.value;
	descriptor.value = actionImplementation(name, base);
}

/**
 * Decorators the following pattern @action method = () => {} by desugaring it to method = action(() => {}) 
 */
function babelActionValueDecorator(name: string, target, prop, descriptor): PropertyDescriptor {
	return {
		configurable: true,
		enumerable: false,
		get: function() {
			const  v = descriptor.initializer.call(this);
			invariant(typeof v === "function", `Babel @action decorator expects the field '${prop} to be initialized with a function`);
			const implementation = action(name, v);
			addBoundAction(this, prop, implementation);
			return implementation;
		},
		set: function() {
			invariant(false, `Babel @action decorator: field '${prop}' not initialized`);
		}
	};
}

function typescriptActionValueDecorator(name: string, target, prop) {
	Object.defineProperty(target, prop, {
		configurable: true,
		enumerable: false,
		get: function() {
			invariant(false, `TypeScript @action decorator: field '${prop}' not initialized`);
		},
		set: function(v) {
			invariant(typeof v === "function", `TypeScript @action decorator expects the field '${prop} to be initialized with a function`);
			addBoundAction(this, prop, action(name, v));
		}
	});
}

function addBoundAction(target, prop, implementation) {
	Object.defineProperty(target, prop, {
		enumerable: false,
		writable: false,
		value: implementation
	});
}

export function actionImplementation(actionName: string, fn: Function): Function {
	invariant(typeof fn === "function", "`action` can only be invoked on functions");
	invariant(typeof actionName === "string" && actionName.length > 0, `actions should have valid names, got: '${actionName}'`);
	return function () {
		return executeWrapped(actionName, fn, this, arguments);
	};
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
