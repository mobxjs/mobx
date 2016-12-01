import {modifiers, isModifierDescriptor} from "../types/modifiers";
import {asObservableObject, defineObservableProperty} from "../types/observableobject";
import {invariant} from "../utils/utils";
import {createClassPropertyDecorator} from "../utils/decorators";
import {ComputedValue, IComputedValue} from "../core/computedvalue";

export interface IComputedValueOptions {
	asStructure: boolean;
}

const computedDecorator = createClassPropertyDecorator(
	(target, name, _, decoratorArgs, originalDescriptor) => {
		invariant(typeof originalDescriptor !== "undefined", "@computed can only be used on getter functions, like: '@computed get myProps() { return ...; }'. It looks like it was used on a property.");
		const baseValue = originalDescriptor.get;
		const setter = originalDescriptor.set;
		invariant(typeof baseValue === "function", "@computed can only be used on getter functions, like: '@computed get myProps() { return ...; }'");

		let compareStructural = false;
		if (decoratorArgs && decoratorArgs.length === 1 && decoratorArgs[0] === modifiers.structure)
			compareStructural = true;

		const adm = asObservableObject(target, "");
		defineObservableProperty(adm, name, true, baseValue, compareStructural ? modifiers.structure : modifiers.ref, false, setter);
	},
	function (name) {
		const observable = this.$mobx.values[name];
		if (observable === undefined) // See #505
			return undefined;
		return observable.get();
	},
	function (name, value) {
		this.$mobx.values[name].set(value);
	},
	false,
	true
);

/**
 * Decorator for class properties: @computed get value() { return expr; }.
 * For legacy purposes also invokable as ES5 observable created: `computed(() => expr)`;
 */
export function computed<T>(func: () => T, setter: (value: T) => void): IComputedValue<T>;
export function computed<T>(func: () => T, scope?: any): IComputedValue<T>;
export function computed(opts: IComputedValueOptions): (target: Object, key: string, baseDescriptor?: PropertyDescriptor) => void;
export function computed(target: Object, key: string | symbol, baseDescriptor?: PropertyDescriptor): void;
export function computed(targetOrExpr: any, keyOrScopeOrSetter?: any, baseDescriptor?: PropertyDescriptor, options?: IComputedValueOptions) {
	if (typeof targetOrExpr === "function" && arguments.length < 3) {
		if (typeof keyOrScopeOrSetter === "function")
			return computedExpr(targetOrExpr, keyOrScopeOrSetter, undefined, false);
		else
			return computedExpr(targetOrExpr, undefined, keyOrScopeOrSetter, false);
	} else if (isModifierDescriptor(targetOrExpr) && targetOrExpr.modifier === modifiers.structure) {
		return computedExpr(targetOrExpr.initialValue, keyOrScopeOrSetter, undefined, true);
	}
	return computedDecorator.apply(null, arguments);
}

function computedExpr<T>(expr: () => T, setter, scope: any, compareStructural: boolean) {
	return new ComputedValue(expr, scope, compareStructural, (expr as any).name, setter);
}
