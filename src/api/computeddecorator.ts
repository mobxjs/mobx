import {asObservableObject, defineComputedProperty} from "../types/observableobject";
import {invariant} from "../utils/utils";
import {createClassPropertyDecorator} from "../utils/decorators";
import {ComputedValue, IComputedValue} from "../core/computedvalue";

export interface IComputed {
	<T>(func: () => T, setter?: (value: T) => void, compareStructural?: boolean): IComputedValue<T>;
	<T>(func: () => T, context?: Object): IComputedValue<T>;
	(target: Object, key: string | symbol, baseDescriptor?: PropertyDescriptor): void;
	struct(target: Object, key: string | symbol, baseDescriptor?: PropertyDescriptor): void;
}


function createComputedDecorator(compareStructural) {
	return createClassPropertyDecorator(
		(target, name, _, __, originalDescriptor) => {
			invariant(typeof originalDescriptor !== "undefined", "@computed can only be used on getter functions, like: '@computed get myProps() { return ...; }'. It looks like it was used on a property.");
			invariant(typeof originalDescriptor.get === "function", "@computed can only be used on getter functions, like: '@computed get myProps() { return ...; }'");

			const adm = asObservableObject(target, "");
			defineComputedProperty(adm, name, originalDescriptor.get, originalDescriptor.set, compareStructural , false);
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
		false
	);
}

const computedDecorator = createComputedDecorator(false);
const computedStructDecorator = createComputedDecorator(true);


/**
 * Decorator for class properties: @computed get value() { return expr; }.
 * For legacy purposes also invokable as ES5 observable created: `computed(() => expr)`;
 */
export var computed: IComputed = (
	function computed(targetOrExpr: any, keyOrScopeOrSetter?: any, descOrStruct?: any) {
		// TODO: improve this api, computed.struct instead of third arg?
		if (typeof targetOrExpr === "function" && (arguments.length < 3 || typeof keyOrScopeOrSetter !== "string")) {
			invariant(typeof targetOrExpr === "function", "First argument to `computed` should be an expression. If using computed as decorator, don't pass it arguments");
			if (typeof keyOrScopeOrSetter === "function")
				return computedExpr(targetOrExpr, keyOrScopeOrSetter, undefined, descOrStruct === true);
			else
				return computedExpr(targetOrExpr, undefined, keyOrScopeOrSetter, descOrStruct === true);
		}
		return computedDecorator.apply(null, arguments);
	}
) as any;

computed.struct = computedStructDecorator;

// TODO: use options object?
function computedExpr<T>(expr: () => T, setter, scope: any, compareStructural: boolean) {
	return new ComputedValue(expr, scope, compareStructural, (expr as any).name, setter);
}
