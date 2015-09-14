/// <reference path="./observablearray.ts" />
/// <reference path="./observableview.ts" />
/// <reference path="./index.ts" />
/// <reference path="./api.ts" />
/// <reference path="./utils.ts" />

namespace mobservable {
	export namespace _ {
		// responsible for the administration of objects that have become reactive
		export class ObservableObject {
			values:{[key:string]:DataNode} = {};

			constructor(private target, private context:Mobservable.IContextInfoStruct) {
				if (target.$mobservable)
					throw new Error("Illegal state: already an reactive object");
				if (!context) {
					this.context = {
						object: target,
						name: ""
					};
				} else if (!context.object) {
					context.object = target;
				}

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
				if (this.values[propName])
					this.target[propName] = value; // the property setter will make 'value' reactive if needed.
				else
					this.defineReactiveProperty(propName, value, recurse);
			}

			private defineReactiveProperty(propName, value, recurse) {
				if (value instanceof AsReference) {
					value = value.value;
					recurse = false;
				}

				let observable: ObservableView<any>|ObservableValue<any>;
				let context = {
					object: this.context.object,
					name: `${this.context.name || ""}.${propName}`
				};

				if (typeof value === "function" && value.length === 0 && recurse)
					observable = new ObservableView(value, this.target, context);
				else
					observable = new ObservableValue(value, recurse, context);

				this.values[propName] = observable;
				Object.defineProperty(this.target, propName, observable.asPropertyDescriptor());
			}
		}
	}
}