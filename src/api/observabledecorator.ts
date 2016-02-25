import {ValueMode, asReference} from "../types/modifiers";
import {allowStateChanges} from "../api/extras";
import {asObservableObject, setObservableObjectProperty} from "../types/observableobject";
import {invariant, assertPropertyConfigurable} from "../utils/utils";

/**
 * ES6 / Typescript decorator which can to make class properties and getter functions reactive.
 * Use this annotation to wrap properties of an object in an observable, for example:
 * class OrderLine {
 *   @observable amount = 3;
 *   @observable price = 2;
 *   @observable total() {
 *      return this.amount * this.price;
 *   }
 * }
 */
export function observableDecorator(target: Object, key: string, baseDescriptor: PropertyDescriptor) {
	invariant(arguments.length >= 2 && arguments.length <= 3, "Illegal decorator config", key);
	assertPropertyConfigurable(target, key);

	// - In typescript, observable annotations are invoked on the prototype, not on actual instances,
	// so upon invocation, determine the 'this' instance, and define a property on the
	// instance as well (that hides the propotype property)
	// - In typescript, the baseDescriptor is empty for attributes without initial value
	// - In babel, the initial value is passed as the closure baseDiscriptor.initializer'

	const isDecoratingGetter = baseDescriptor && baseDescriptor.hasOwnProperty("get");
	const descriptor: PropertyDescriptor = {};
	let baseValue = undefined;
	if (baseDescriptor) {
		if (baseDescriptor.hasOwnProperty("get"))
			baseValue = baseDescriptor.get;
		else if (baseDescriptor.hasOwnProperty("value"))
			baseValue = baseDescriptor.value;
		else if ((<any>baseDescriptor).initializer) { // For babel
			baseValue = (<any>baseDescriptor).initializer();
			if (typeof baseValue === "function")
				baseValue = asReference(baseValue);
		}
	}

	invariant(typeof target === "object", `The @observable decorator can only be used on objects`, key);
	if (isDecoratingGetter) {
		invariant(typeof baseValue === "function", `@observable expects a getter function if used on a property.`, key);
		invariant(!baseDescriptor.set, `@observable properties cannot have a setter.`, key);
		invariant(baseValue.length === 0, `@observable getter functions should not take arguments.`, key);
	}

	descriptor.configurable = true;
	descriptor.enumerable = true;
	descriptor.get = function() {
		// the getter might create a reactive property lazily, so this might even happen during a view.
		allowStateChanges(true, () => {
			setObservableObjectProperty(asObservableObject(this, undefined, ValueMode.Recursive), key, baseValue);
		});
		return this[key];
	};
	descriptor.set = isDecoratingGetter
		? () => { throw new Error(`[ComputedValue '${key}'] New values cannot be assigned to computed properties.`); }
		: function(value) {
			setObservableObjectProperty(asObservableObject(this, undefined, ValueMode.Recursive), key, typeof value === "function" ? asReference(value) : value);
		}
	;
	if (!baseDescriptor) {
		Object.defineProperty(target, key, descriptor); // For typescript
	} else {
		return descriptor;
	}
}
