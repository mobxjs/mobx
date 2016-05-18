import {ValueMode, asReference} from "../types/modifiers";
import {allowStateChanges} from "../core/action";
import {computed} from "../api/computeddecorator";
import {asObservableObject, setObservableObjectProperty} from "../types/observableobject";
import {invariant, assertPropertyConfigurable, deprecated} from "../utils/utils";
import {checkIfStateModificationsAreAllowed} from "../core/derivation";

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
	checkIfStateModificationsAreAllowed();

	// - In typescript, observable annotations are invoked on the prototype, not on actual instances,
	// so upon invocation, determine the 'this' instance, and define a property on the
	// instance as well (that hides the propotype property)
	// - In babel, the initial value is passed as the closure baseDiscriptor.initializer'

	if (baseDescriptor && baseDescriptor.hasOwnProperty("get")) {
		deprecated("Using @observable on computed values is deprecated. Use @computed instead.");
		return computed.apply(null, arguments);
	}
	const descriptor: PropertyDescriptor = {};

	invariant(typeof target === "object", `The @observable decorator can only be used on objects`, key);
	descriptor.configurable = true;
	descriptor.enumerable = true;
	descriptor.get = function() {
		let baseValue = undefined;
		if (baseDescriptor && (<any>baseDescriptor).initializer) { // For babel
			baseValue = (<any>baseDescriptor).initializer();
			if (typeof baseValue === "function")
				baseValue = asReference(baseValue);
		}
		// the getter might create a reactive property lazily, so this might even happen during a view.
		allowStateChanges(true, () => {
			setObservableObjectProperty(asObservableObject(this, undefined, ValueMode.Recursive), key, baseValue);
		});
		return this[key];
	};
	descriptor.set = function(value) {
		setObservableObjectProperty(asObservableObject(this, undefined, ValueMode.Recursive), key, typeof value === "function" ? asReference(value) : value);
	};
	if (!baseDescriptor) {
		Object.defineProperty(target, key, descriptor); // For typescript
	} else {
		return descriptor;
	}
}
