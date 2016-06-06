import {invariant} from "./utils";

/** Given a decorator, construcs a decorator, that normalizes the differences between 
 * TypeScript and Babel. Sigh
 */

// values on prototype: @action
// fields on object: @observable
// getters on object: @computed
// enumerable (on protot and self!)
// custom args

export function decoratorFactory(
	allowCustomArguments: boolean,
	allowValuesOnPrototype: boolean,
	getDescriptor: (target, propName, initialValue: any, customArgs: IArguments) => PropertyDescriptor
): (target, prop: string, descriptor?) => PropertyDescriptor {
	function theDecorator(target: Object, key: string, baseDescriptor, customArgs?: IArguments): any {
		invariant(allowCustomArguments || quacksLikeADecorator(arguments), "This function is a decorator, but it wasn't invoked like a decorator");
		const intermediateDescriptor = {
			configurable: true,
			enumerable: false,
			get: illegalState,
			set: illegalState
		};
		if (baseDescriptor === undefined) {
			/* typescript */
			// TODO: or return?
			Object.defineProperty(baseDescriptor, key, intermediateDescriptor);
		} else {
			/* babel */
			if (typeof baseDescriptor.initializer === "function") {
				/* initializers are used for instance properties*/
				(intermediateDescriptor as any).initializer = function () {
					Object.defineProperty(this, key, getDescriptor(this, key, baseDescriptor.initializer(), customArgs));
				};
				return intermediateDescriptor;
			} else if (baseDescriptor.hasOwnProperty("value")) {
				/* values are used for values that can be defined on the prototype, e.g. methos */
				invariant(allowValuesOnPrototype, "This decorator can only be used on field assignments");
				/* prototype props cannot be reconfigured, so just set  a new value */
				const _temp = getDescriptor(target, key, baseDescriptor.value, customArgs);
				baseDescriptor.value = _temp.value;
				// TODO: mweh? just return _temp?
				return baseDescriptor;
			} else {
				invariant(false, "Illegal state while applying decorator");
			}
		}
	}

	if (allowCustomArguments) {
		/** If custom arguments are allowed, we should return a function that returns a decorator */
		return function() {
			/** Direct invocation: @decorator bla */
			if (quacksLikeADecorator(arguments))
				return theDecorator.apply(null, arguments);
			/** Indirect invocation: @decorator(args) bla */
			const outerArgs = arguments;
			return (target, key, descriptor) => theDecorator(target, key, descriptor, outerArgs);
		};
	}
	return theDecorator;
}

function illegalState() {
	invariant(false, "Illegal state while trying to apply decorator");
}

function quacksLikeADecorator(args: IArguments): boolean {
	return (args.length === 2 || args.length === 3) && typeof args[1] === "string";
}