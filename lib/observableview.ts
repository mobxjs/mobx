/// <reference path="./observablevalue" />

namespace mobservable {
    export namespace _ {
        export function throwingViewSetter() {
            throw new Error(`[mobservable.view '${this.context.name}'] View functions do not accept new values`);
        }

        export class ObservableView<T> extends ViewNode {
            private isComputing = false;
            private hasError = false;
            protected _value: T;
            protected changeEvent = new SimpleEventEmitter();

            constructor(protected func:()=>T, private scope: Object, context:Mobservable.IContextInfoStruct) {
                super(context);
            }

            get():T {
                if (this.isComputing)
                    throw new Error(`[mobservable.view '${this.context.name}'] Cycle detected`);
                if (this.isSleeping) {
                    if (_.isComputingView()) {
                        // somebody depends on the outcome of this computation
                        this.wakeUp(); // note: wakeup triggers a compute
                        this.notifyObserved();
                    } else {
                        // nobody depends on this computable;
                        // so just compute fresh value and continue to sleep
                        this.wakeUp();
                        this.tryToSleep();
                    }
                } else {
                    // we are already up to date, somebody is just inspecting our current value
                    this.notifyObserved();
                }

                if (this.hasCycle)
                    throw new Error(`[mobservable.view '${this.context.name}'] Cycle detected`);
                if (this.hasError) {
                    if (logLevel > 0)
                        console.error(`[mobservable.view '${this.context.name}'] Rethrowing caught exception to observer: ${this._value}${(<any>this._value).cause||''}`);
                    throw this._value;
                }
                return this._value;
            }

            set() {
                throwingViewSetter.call(this);
            }

            compute() {
                var newValue:T;
                try {
                    // this cycle detection mechanism is primarily for lazy computed values; other cycles are already detected in the dependency tree
                    if (this.isComputing)
                        throw new Error(`[mobservable.view '${this.context.name}'] Cycle detected`);
                    this.isComputing = true;
                    newValue = this.func.call(this.scope);
                    this.hasError = false;
                } catch (e) {
                    this.hasError = true;
                    console.error(`[mobservable.view '${this.context.name}'] Caught error during computation: `, e, "View function:", this.func.toString());
                    console.trace();
                    
                    if (e instanceof Error)
                        newValue = e;
                    else {
                        newValue = <T><any> new Error(`[mobservable.view '${this.context.name}'] Error during computation (see error.cause) in ` + this.func.toString());
                        (<any>newValue).cause = e;
                    }
                }
                this.isComputing = false;
                if (newValue !== this._value) {
                    var oldValue = this._value;
                    this._value = newValue;
                    this.changeEvent.emit(newValue, oldValue);
                    return true;
                }
                return false;
            }

            observe(listener:(newValue:T, oldValue:T)=>void, fireImmediately=false):Lambda {
                this.setRefCount(+1); // awake
                if (fireImmediately)
                    listener(this.get(), undefined);
                var disposer = this.changeEvent.on(listener);
                return once(() => {
                    this.setRefCount(-1);
                    disposer();
                });
            }

            asPropertyDescriptor(): PropertyDescriptor {
                return {
                    configurable: false,
                    enumerable: false,
                    get: () => this.get(),
                    set: throwingViewSetter
                }
            }

            toString() {
                return `ComputedObservable[${this.context.name}:${this._value}] ${this.func.toString()}`;
            }
        }
    }
}