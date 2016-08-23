import {ValueMode, asReference} from "../types/modifiers";
import {allowStateChangesStart, allowStateChangesEnd} from "../core/action";
import {asObservableObject, defineObservableProperty, setPropertyValue} from "../types/observableobject";
import {invariant, assertPropertyConfigurable} from "../utils/utils";
import {createClassPropertyDecorator} from "../utils/decorators";

const decoratorImpl = createClassPropertyDecorator(
	(target, name, baseValue) => {
		// might happen lazily (on first read), so temporarily allow state changes..
		const prevA = allowStateChangesStart(true);
		if (typeof baseValue === "function")
			baseValue = asReference(baseValue);
		const adm = asObservableObject(target, undefined, ValueMode.Recursive);
		defineObservableProperty(adm, name, baseValue, true);
		allowStateChangesEnd(prevA);
	},
	function (name) {
		const observable = this.$mobx.values[name];
		if (observable === undefined) // See #505
			return undefined;
		return observable.get();
	},
	function (name, value) {
		setPropertyValue(this, name, value);
	},
	true,
	false
);

/**
 * ESNext / Typescript decorator which can to make class properties and getter functions reactive.
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
	invariant(!baseDescriptor || !baseDescriptor.get, "@observable can not be used on getters, use @computed instead");
	return decoratorImpl.apply(null, arguments);
}
