/// <reference path="./observablevalue" />

namespace mobservable {

    export function computed<T>(func:()=>void, scope?) {
        return new _.ComputedObservable(func, scope).createGetterSetter();
    }

    export function expr<T>(expr:()=>void, scope?) {
        if (_.DNode.trackingStack.length === 0)
            throw new Error("mobservable.expr can only be used inside a computed observable. Probably mobservable.computed should be used instead of .expr");
        return new _.ComputedObservable(expr, scope).get();
    }

    export function sideEffect(func:Lambda, scope?):Lambda {
        return computed(func, scope).observe(_.noop);
    }

    export namespace _ {
        export class ComputedObservable<U> extends ObservableValue<U> {
            private isComputing = false;
            private hasError = false;
    
            constructor(protected func:()=>U, private scope?:Object) {
                super(undefined);
                if (typeof func !== "function")
                    throw new Error("ComputedObservable requires a function");
            }
    
            get():U {
                if (this.isComputing)
                    throw new Error("Cycle detected");
                var state = this.dependencyState;
                if (state.isSleeping) {
                    if (DNode.trackingStack.length > 0) {
                        // somebody depends on the outcome of this computation
                        state.wakeUp(); // note: wakeup triggers a compute
                        state.notifyObserved();
                    } else {
                        // nobody depends on this computable; so compute a fresh value but do not wake up
                        this.compute();
                    }
                } else {
                    // we are already up to date, somebody is just inspecting our current value
                    state.notifyObserved();
                }
    
                if (state.hasCycle)
                    throw new Error("Cycle detected");
                if (this.hasError) {
                    if (debugLevel) {
                        console.trace();
                        warn(`${this}: rethrowing caught exception to observer: ${this._value}${(<any>this._value).cause||''}`);
                    }
                    throw this._value;
                }
                return this._value;
            }
    
            set(_:U) {
                throw new Error(this.toString() + ": A computed observable does not accept new values!");
            }
    
            compute() {
                var newValue:U;
                try {
                    // this cycle detection mechanism is primarily for lazy computed values; other cycles are already detected in the dependency tree
                    if (this.isComputing)
                        throw new Error("Cycle detected");
                    this.isComputing = true;
                    newValue = this.func.call(this.scope);
                    this.hasError = false;
                } catch (e) {
                    this.hasError = true;
                    console.error(this + "Caught error during computation: ", e);
                    if (e instanceof Error)
                        newValue = e;
                    else {
                        newValue = <U><any> new Error("MobservableComputationError");
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
    
            toString() {
                return `ComputedObservable[${this.func.toString()}]`;
            }
        }
    }
}