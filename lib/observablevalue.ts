/// <reference path="./dnode.ts" />
namespace mobservable {
    export namespace _ {
        export var NON_PURE_VIEW_ERROR = `[Mobservable] It is not allowed to change the state during the computation of a reactive view.`;

        export class ObservableValue<T> extends RootDNode {
            protected changeEvent = new SimpleEventEmitter();
            protected _value: T;

            constructor(protected value:T, protected recurse:boolean, context:Mobservable.IContextInfoStruct){
                super(context);
                this._value = this.makeReferenceValueReactive(value);
            }

            private makeReferenceValueReactive(value) {
                if (this.recurse && (Array.isArray(value) || isPlainObject(value)))
                    return makeReactive(value, {
                        context: this.context.object,
                        name: this.context.name
                    });
                return value;
            }

            set(value:T) {
                if (_.isComputingView()) {
                    console.error(NON_PURE_VIEW_ERROR);
                    console.trace();
                    throw new Error(NON_PURE_VIEW_ERROR);
                }
                if (value !== this._value) {
                    var oldValue = this._value;
                    this.markStale();
                    this._value = this.makeReferenceValueReactive(value);
                    this.markReady(true);
                    this.changeEvent.emit(this._value, oldValue);
                }
            }

            get():T {
                this.notifyObserved();
                return this._value;
            }

            observe(listener:(newValue:T, oldValue:T)=>void, fireImmediately=false):Lambda {
                if (fireImmediately)
                    listener(this.get(), undefined);
                return this.changeEvent.on(listener);
            }

            asPropertyDescriptor(): PropertyDescriptor {
                return {
                    configurable: false,
                    enumerable: true,
                    get: () => this.get(),
                    set: (value) => this.set(value)
                }
            }

            toString() {
                return `Observable[${this.context.name}:${this._value}]`;
            }
        }
    }
}
