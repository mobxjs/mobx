import {ValueMode, asReference} from "../types/modifiers";
import {allowStateChanges} from "../api/extras";
import {ObservableObject} from "../types/observableobject";

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
	if (arguments.length < 2 || arguments.length > 3)
		throw new Error("[mobservable.@observable] A decorator expects 2 or 3 arguments, got: " + arguments.length);
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

	if (!target || typeof target !== "object")
		throw new Error(`The @observable decorator can only be used on objects`);
	if (isDecoratingGetter) {
		if (typeof baseValue !== "function")
			throw new Error(`@observable expects a getter function if used on a property (in member: '${key}').`);
		if (descriptor.set)
			throw new Error(`@observable properties cannot have a setter (in member: '${key}').`);
		if (baseValue.length !== 0)
			throw new Error(`@observable getter functions should not take arguments (in member: '${key}').`);
	}

	descriptor.configurable = true;
	descriptor.enumerable = true;
	descriptor.get = function() {
		// the getter might create a reactive property lazily, so this might even happen during a view.
		// TODO: eliminate non-strict; creating observables during views is allowed, just don't use set.
		allowStateChanges(true, () => {
			ObservableObject.asReactive(this, null, ValueMode.Recursive).set(key, baseValue);
		});
		return this[key];
	};
	descriptor.set = isDecoratingGetter
		? () => {throw new Error(`[DerivedValue '${key}'] View functions do not accept new values`); }
		: function(value) {
			ObservableObject.asReactive(this, null, ValueMode.Recursive).set(key, typeof value === "function" ? asReference(value) : value);
		}
	;
	if (!baseDescriptor) {
		Object.defineProperty(target, key, descriptor); // For typescript
	} else {
		return descriptor;
	}
}
