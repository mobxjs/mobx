import {ValueMode, getValueModeFromValue, asStructure} from "../types/modifiers";
import {IObservableValue} from "./observable";
import {asObservableObject, setObservableObjectInstanceProperty, defineObservableProperty} from "../types/observableobject";
import {invariant, assertPropertyConfigurable} from "../utils/utils";
import {createClassPropertyDecorator} from "../utils/decorators";
import {ComputedValue} from "../core/computedvalue";
import {getDebugName} from "../types/type-utils";

export interface IComputedValueOptions {
	asStructure: boolean;
}

/**
 * Decorator for class properties: @computed get value() { return expr; }.
 * For legacy purposes also invokable as ES5 observable created: `computed(() => expr)`;
 */
export function computed<T>(func: () => T, scope?: any): IObservableValue<T>;
export function computed(opts: IComputedValueOptions): (target: Object, key: string, baseDescriptor?: PropertyDescriptor) => void;
export function computed(target: Object, key: string | symbol, baseDescriptor?: PropertyDescriptor): void;
export function computed(targetOrExpr: any, keyOrScope?: any, baseDescriptor?: PropertyDescriptor, options?: IComputedValueOptions) {
	if (arguments.length < 3 && typeof targetOrExpr === "function")
		return computedExpr(targetOrExpr, keyOrScope);
	invariant(!baseDescriptor || !baseDescriptor.set, `@observable properties cannot have a setter: ${keyOrScope}`);
	return computedDecoratorImpl.apply(null, arguments);
//	return computedDecorator.apply(null, arguments);
}

function computedExpr<T>(expr: () => T, scope?: any) {
	const [mode, value] = getValueModeFromValue(expr, ValueMode.Recursive);
	return new ComputedValue(value, scope, mode === ValueMode.Structure, value.name);
}

const computedDecoratorImpl = createClassPropertyDecorator(
	(target, name, _, decoratorArgs, originalDescriptor) => {
		const baseValue = originalDescriptor.get;
		invariant(typeof baseValue === "function", "@computed can only be used on getter functions, like: '@computed get myProps() { return ...; }'");

		let compareStructural = false;
		if (decoratorArgs && decoratorArgs.length === 1 && decoratorArgs[0].asStructure === true)
			compareStructural = true;

		const adm = asObservableObject(target, undefined, ValueMode.Recursive);
		defineObservableProperty(adm, name, compareStructural ? asStructure(baseValue) : baseValue, false);
	},
	function (name) {
		return this.$mobx.values[name].get();
	},
	function (name) {
		invariant(false, `It is not allowed to assign new values to @computed properties: ${getDebugName(this)}.${name}`);
	},
	false,
	true,
	true
);


function computedDecorator(target: any, key?: any, baseDescriptor?: PropertyDescriptor, options?: IComputedValueOptions): any {
	// invoked as decorator factory with options
	if (arguments.length === 1) {
		const options = target;
		return (target, key, baseDescriptor) => computedDecorator.call(null, target, key, baseDescriptor, options);
	}
	invariant(baseDescriptor && baseDescriptor.hasOwnProperty("get"), "@computed can only be used on getter functions, like: '@computed get myProps() { return ...; }'");
	assertPropertyConfigurable(target, key);

	const descriptor: PropertyDescriptor = {};
	const getter = baseDescriptor.get;

	invariant(typeof target === "object", `The @observable decorator can only be used on objects`, key);
	invariant(typeof getter === "function", `@observable expects a getter function if used on a property.`, key);
	invariant(!baseDescriptor.set, `@observable properties cannot have a setter.`, key);
	invariant(getter.length === 0, `@observable getter functions should not take arguments.`, key);

	descriptor.configurable = true;
	descriptor.enumerable = false;
	descriptor.get = function() {
		setObservableObjectInstanceProperty(
			asObservableObject(this, undefined, ValueMode.Recursive),
			key,
			options && options.asStructure === true ? asStructure(getter) : getter
		);
		return this[key];
	};

	// by default, assignments to properties without setter are ignored. Let's fail fast instead.
	descriptor.set = throwingComputedValueSetter;
	if (!baseDescriptor) {
		Object.defineProperty(target, key, descriptor); // For typescript
	} else {
		return descriptor;
	}
}

export function throwingComputedValueSetter() {
	throw new Error(`[ComputedValue] It is not allowed to assign new values to computed properties.`);
}