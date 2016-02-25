import {ValueMode} from "../types/modifiers";
import {observable} from "./observable";
import {asObservableObject, setObservableObjectProperty} from "../types/observableobject";
import {invariant, assertPropertyConfigurable} from "../utils/utils";

/**
 * Decorator for class properties: @computed get value() { return expr; }.
 * For legacy purposes also invokable as ES5 observable created: `computed(() => expr)`; 
 */
export function computed(target: Object, key: string, baseDescriptor: PropertyDescriptor) {
	// invoked as `computed(() => value, scope?)`
	if (arguments.length < 3 && typeof target === "function") {
		return observable(target, <any>key);
	}
	invariant(arguments.length >= 2 && arguments.length <= 3, "Illegal decorator config", key);
	invariant(baseDescriptor && baseDescriptor.hasOwnProperty("get"), "@computed can only be used on getter functions, like: '@computed get myProps() { return ...; }'");
	assertPropertyConfigurable(target, key);

	const descriptor: PropertyDescriptor = {};
	const getter = baseDescriptor.get;

	invariant(typeof target === "object", `The @observable decorator can only be used on objects`, key);
	invariant(typeof getter === "function", `@observable expects a getter function if used on a property.`, key);
	invariant(!baseDescriptor.set, `@observable properties cannot have a setter.`, key);
	invariant(getter.length === 0, `@observable getter functions should not take arguments.`, key);

	descriptor.configurable = true;
	descriptor.enumerable = true; // TODO: should be false?
	descriptor.get = function() {
		// TODO: support Structure mode
		setObservableObjectProperty(asObservableObject(this, undefined, ValueMode.Recursive), key, getter);
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