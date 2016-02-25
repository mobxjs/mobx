import {ValueMode, asStructure} from "../types/modifiers";
import {observable, IObservableValue} from "./observable";
import {asObservableObject, setObservableObjectProperty} from "../types/observableobject";
import {invariant, assertPropertyConfigurable} from "../utils/utils";

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
export function computed(target: any, key?: any, baseDescriptor?: PropertyDescriptor, options?: IComputedValueOptions) {
	// invoked as `computed(() => value, scope?)`
	if (arguments.length < 3 && typeof target === "function") {
		return observable(target, <any>key);
	}
	// invoked as decorator factory with options
	if (arguments.length === 1) {
		const options = target;
		return (target, key, baseDescriptor) => computed.call(null, target, key, baseDescriptor, options);
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
		setObservableObjectProperty(
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

function throwingComputedValueSetter() {
	throw new Error(`[ComputedValue] It is not allowed to assign new values to computed properties.`);
}