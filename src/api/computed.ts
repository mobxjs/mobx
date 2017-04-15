import {IEqualsComparer, defaultComparer, structuralComparer} from "../types/comparer";
import {asObservableObject, defineComputedProperty} from "../types/observableobject";
import {invariant} from "../utils/utils";
import {createClassPropertyDecorator} from "../utils/decorators";
import {ComputedValue, IComputedValue} from "../core/computedvalue";
import {getMessage} from "../utils/messages";

export interface IComputedValueOptions<T> {
	compareStructural?: boolean;
	struct?: boolean;
	equals?: IEqualsComparer<T>;
	name?: string;
	setter?: (value: T) => void;
	context?: any;
}

export interface IComputed {
	<T>(func: () => T, setter?: (value: T) => void): IComputedValue<T>;
	<T>(func: () => T, options: IComputedValueOptions<T>): IComputedValue<T>;
	(target: Object, key: string | symbol, baseDescriptor?: PropertyDescriptor): void;
	struct(target: Object, key: string | symbol, baseDescriptor?: PropertyDescriptor): void;
}

function createComputedDecorator(struct: boolean) {
	return createClassPropertyDecorator(
		(target, name, _, __, originalDescriptor) => {
			invariant(typeof originalDescriptor !== "undefined", getMessage("m009"));
			invariant(typeof originalDescriptor.get === "function", getMessage("m010"));

			const equals = struct ? structuralComparer : defaultComparer;

			const adm = asObservableObject(target, "");
			defineComputedProperty(adm, name, originalDescriptor.get, originalDescriptor.set, equals, false);
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
	function computed(arg1, arg2, arg3) {
		if (typeof arg2 === "string") {
			return computedDecorator.apply(null, arguments);
		}
		invariant(typeof arg1 === "function", getMessage("m011"));
		invariant(arguments.length < 3, getMessage("m012"));
		const opts: IComputedValueOptions<any> = typeof arg2 === "object" ? arg2 : {};
		opts.setter = typeof arg2 === "function" ? arg2 : opts.setter;

		const equals = opts.equals || (opts.compareStructural || opts.struct) ? structuralComparer : defaultComparer;
		return new ComputedValue(arg1, opts.context, equals, opts.name || arg1.name || "", opts.setter);
	}
) as any;

computed.struct = computedStructDecorator;
