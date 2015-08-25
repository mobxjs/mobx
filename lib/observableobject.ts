/// <reference path="./observablearray.ts" />
/// <reference path="./observableview.ts" />
/// <reference path="./index.ts" />
/// <reference path="./api.ts" />
/// <reference path="./utils.ts" />

namespace mobservable {
	export namespace _ {
		// responsible for the administration of objects that have become reactive
		export class ObservableObject {
			private keys:_.ObservableArray<string>;

			constructor(private target, private context:Mobservable.IContextInfoStruct) {
				if (target.$mobservable)
					throw new Error("Illegal state: already an reactive object");
				if (!context) {
					this.context = {
						object: target,
						name: ""
					}
				} else if  (!context.object) {
					context.object = target;
				}

				this.keys = new ObservableArray([], false, {
					object: target,
					name: this.context.name + "[keys]"
				});
				Object.defineProperty(target, "$mobservable", {
					enumerable: false,
					configurable: false,
					value: this
				});
			}

			static asReactive(target, context:Mobservable.IContextInfoStruct):ObservableObject {
				if (target.$mobservable)
					return target.$mobservable;
				return new ObservableObject(target, context);
			}

			set(propName, value, recurse) {
				if (this.keys.indexOf(propName) === -1)
					this.defineReactiveProperty(propName, value, recurse);
				else
					this.target[propName] = value; // the property setter will make 'value' reactive if needed.
			}

			private defineReactiveProperty(propName, value, recurse) {
				if (value instanceof AsReference) {
					value = value.value;
					recurse = false;
				}

				let context = {
					object: this.context.object,
					name: `${this.context.name || ""}.${propName}`
				};
				let descriptor: PropertyDescriptor;

				if (typeof value === "function" && value.length === 0 && recurse)
					descriptor = new ObservableView(value, this.target, context).asPropertyDescriptor();
				else
					descriptor = new ObservableValue(value, recurse, context).asPropertyDescriptor();

				Object.defineProperty(this.target, propName, descriptor);
			}
		}
	}
}