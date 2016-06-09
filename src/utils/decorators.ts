import {invariant} from "./utils";

/** Given a decorator, construcs a decorator, that normalizes the differences between 
 * TypeScript and Babel. Sigh
 */
export function decoratorFactory2(
	onInitialize: (target, property, initialValue, customArgs?: IArguments) => void,
	enumerable: boolean,
	get: (name) => any,
	set: (name, newValue) => void,
	allowCustomArguments: boolean
): any {
	function theDecorator(target: any, key: string, descriptor, customArgs?: IArguments) {
		// TODO: prebind get / set / onInitialize for faster results?
		if (!target.hasOwnProperty("__mobxLazyInitializers")) {
			Object.defineProperty(target, "__mobxLazyInitializers", {
				writable: false, configurable: false, enumerable: false,
				value: (target.__mobxDidRunLazyInitializers && target.__mobxLazyInitializers.slice()) || [] // support inheritance
			});
		}

		if (!descriptor) {
			// typescript
			return {
				enumerable,
				configurable: true,
				get: function() {
					if (this.__mobxDidRunLazyInitializers !== true)
						runLazyInitializers(this);
					return get.call(this, key);
				},
				set: function(v) {
				// 	if (this.__mobxDidRunLazyInitializers !== true) 
				// 		if (this.__initialValuesLength < lazyInitializersLength) {
				// 			push
				// 		else
				// 			run initailzers
				// 	}
					
					set.call(this, key, v);
				}
			}
		} else {
			// babel
			const {value, initializer} = descriptor;
			target.__mobxLazyInitializers.push(instance => {
				onInitialize(
					instance,
					key,
					initializer ? initializer.call(instance) : value,
					customArgs
				);
			});

			delete descriptor.value;
			delete descriptor.initializer;
			delete descriptor.writable;
			descriptor.enumerable = enumerable;
			descriptor.configurable = true;
			descriptor.get = function() {
				if (this.__mobxDidRunLazyInitializers !== true)
					runLazyInitializers(this);
				return get.call(this, key);
			};
			descriptor.set =  function(v) {
				if (this.__mobxDidRunLazyInitializers !== true)
					runLazyInitializers(this);
				set.call(this, key, v);
			};
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

function isPropInitialized(instance, prop) {
	if (instance["__initialized" + prop] !== true) {
		Object.defineProperty(instance, "__initialized" + prop, {
			configurable: false, enumerable: false, writable: false, value: true
		});
		return false;
	}
	return true;
}

export function runLazyInitializers(instance) {
	if (instance.__mobxDidRunLazyInitializers === true)
		return;
	if (instance.__mobxLazyInitializers) {
		Object.defineProperty(instance, "__mobxDidRunLazyInitializers", {
			enumerable: false,
			configurable: false,
			writable: false,
			value: true
		});
		instance.__mobxLazyInitializers.forEach(initializer => initializer(instance));
	}
}

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