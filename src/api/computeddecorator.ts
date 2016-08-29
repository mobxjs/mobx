import {ValueMode, getValueModeFromValue, asStructure} from "../types/modifiers";
import {IObservableValue} from "../types/observablevalue";
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
		invariant(typeof baseValue === "function", "@computed can only be used on getter functions, like: '@computed get myProps() { return ...; }'");

		let compareStructural = false;
		if (decoratorArgs && decoratorArgs.length === 1 && decoratorArgs[0].asStructure === true)
			compareStructural = true;

		const adm = asObservableObject(target, undefined, ValueMode.Recursive);
		defineObservableProperty(adm, name, compareStructural ? asStructure(baseValue) : baseValue, false);
	},
	function (name) {
		const observable = this.$mobx.values[name];
		if (observable === undefined) // See #505
			return undefined;
		return observable.get();
	},
	throwingComputedValueSetter,
	false,
	true
);

/**
 * Decorator for class properties: @computed get value() { return expr; }.
 * For legacy purposes also invokable as ES5 observable created: `computed(() => expr)`;
 */
export function computed<T>(func: () => T, scope?: any): IComputedValue<T>;
export function computed(opts: IComputedValueOptions): (target: Object, key: string, baseDescriptor?: PropertyDescriptor) => void;
export function computed(target: Object, key: string | symbol, baseDescriptor?: PropertyDescriptor): void;
export function computed(targetOrExpr: any, keyOrScope?: any, baseDescriptor?: PropertyDescriptor, options?: IComputedValueOptions) {
	if (arguments.length < 3 && typeof targetOrExpr === "function")
		return computedExpr(targetOrExpr, keyOrScope);
	invariant(!baseDescriptor || !baseDescriptor.set, `@observable properties cannot have a setter: ${keyOrScope}`);
	return computedDecorator.apply(null, arguments);
}

function computedExpr<T>(expr: () => T, scope?: any) {
	const [mode, value] = getValueModeFromValue(expr, ValueMode.Recursive);
	return new ComputedValue(value, scope, mode === ValueMode.Structure, value.name);
}

export function throwingComputedValueSetter() {
	throw new Error(`[ComputedValue] It is not allowed to assign new values to computed properties.`);
}
