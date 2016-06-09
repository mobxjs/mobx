import {invariant} from "./utils";

/** 
 * Construcs a decorator, that normalizes the differences between 
 * TypeScript and Babel. Mainly caused by the fact that legacy-decorator cannot assign 
 * values during instance creation to properties that have a getter setter. 
 * 
 * - Sigh -
 * 
 * Also takes care of the difference between @decorator field and @decorator(args) field, and different forms of values.
 * For performance (cpu and mem) reasons the properties are always defined on the prototype (at least initially). 
 * This means that these properties despite being enumerable might not show up in Object.keys() (but they will show up in for...in loops).
 */
export function createClassPropertyDecorator(
	/**
	 * This function is invoked once, when the property is added to a new instance.
	 * When this happens is not strictly determined due to differences in TS and Babel:
	 * Typescript: Usually when constructing the new instance
	 * Babel, sometimes Typescript: during the first get / set
	 * Both: when calling `runLazyInitializers(instance)`
	 */
	onInitialize: (target, property, initialValue, customArgs?: IArguments) => void,
	get: (name) => any,
	set: (name, newValue) => void,
	enumerable: boolean,
	/**
	 * Can this decorator invoked with arguments? e.g. @decorator(args)
	 */
	allowCustomArguments: boolean,
	/**
	 * Usually the initial value will be based on either the .value or .initializer or initial assignment to the property.
	 * If this flag is set, the initial value will be the original defined get value. This is used by @computed.
	 */
	useGetterAsInitialValue: boolean = false
): any {
	function classPropertyDecorator(target: any, key: string, descriptor, customArgs?: IArguments) {
		invariant(allowCustomArguments || quacksLikeADecorator(arguments), "This function is a decorator, but it wasn't invoked like a decorator");
		if (!descriptor) {
			// typescript (except for getter / setters)
			return {
				enumerable,
				configurable: true,
				get: function() {
					if (!this.__mobxInitializedProps || this.__mobxInitializedProps[key] !== true)
						typescriptInitializeProperty(this, key, undefined, onInitialize, customArgs);
					return get.call(this, key);
				},
				set: function(v) {
					if (!this.__mobxInitializedProps || this.__mobxInitializedProps[key] !== true) {
						typescriptInitializeProperty(this, key, v, onInitialize, customArgs);
					} else {
						set.call(this, key, v);
					}
				}
			};
		} else {
			// babel and typescript getter / setter props
			if (!target.hasOwnProperty("__mobxLazyInitializers")) {
				Object.defineProperty(target, "__mobxLazyInitializers", {
					writable: false, configurable: false, enumerable: false,
					value: (target.__mobxDidRunLazyInitializers && target.__mobxLazyInitializers.slice()) || [] // support inheritance
				});
			}

			const {value, initializer} = descriptor;
			const getter = descriptor.get;
			target.__mobxLazyInitializers.push(instance => {
				onInitialize(
					instance,
					key,
					useGetterAsInitialValue ? getter : (initializer ? initializer.call(instance) : value),
					customArgs
				);
			});

			return {
				enumerable, configurable: true,
				get : function() {
					if (this.__mobxDidRunLazyInitializers !== true)
						runLazyInitializers(this);
					return get.call(this, key);
				},
				set : function(v) {
					if (this.__mobxDidRunLazyInitializers !== true)
						runLazyInitializers(this);
					set.call(this, key, v);
				}
			};
		}
	}

	if (allowCustomArguments) {
		/** If custom arguments are allowed, we should return a function that returns a decorator */
		return function() {
			/** Direct invocation: @decorator bla */
			if (quacksLikeADecorator(arguments))
				return classPropertyDecorator.apply(null, arguments);
			/** Indirect invocation: @decorator(args) bla */
			const outerArgs = arguments;
			return (target, key, descriptor) => classPropertyDecorator(target, key, descriptor, outerArgs);
		};
	}
	return classPropertyDecorator;
}

function typescriptInitializeProperty(instance, key, v, onInitialize, customArgs) {
	if (!instance.hasOwnProperty("__mobxInitializedProps")) {
		Object.defineProperty(instance, "__mobxInitializedProps", {
			enumerable: false, configurable: false, writable: true,
			value: {}
		});
	}
	instance.__mobxInitializedProps[key] = true;
	onInitialize(instance, key, v, customArgs);
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
		instance.__mobxDidRunLazyInitializers && instance.__mobxLazyInitializers.forEach(initializer => initializer(instance));
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