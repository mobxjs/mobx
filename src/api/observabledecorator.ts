import {allowStateChangesStart, allowStateChangesEnd} from "../core/action";
import {asObservableObject, defineObservableProperty, setPropertyValue} from "../types/observableobject";
import {invariant, assertPropertyConfigurable} from "../utils/utils";
import {createClassPropertyDecorator} from "../utils/decorators";
import {modifiers, IModifier} from "../types/modifiers";

const decoratorImpl = createClassPropertyDecorator(
	(target, name, baseValue, mods) => {
		// might happen lazily (on first read), so temporarily allow state changes..
		const prevA = allowStateChangesStart(true);
		const modifier: IModifier<any, any> = mods && mods.length === 1
			? mods[0]
			: modifiers.recursive
		;
		const adm = asObservableObject(target, undefined);
		defineObservableProperty(adm, name, false, baseValue, modifier, true, undefined);
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
