namespace mobservable {
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

    /**
     * given an expression, evaluate it once and track its dependencies.
     * Whenever the expression *should* re-evaluate, the onInvalidate event should fire
     */
    export class WatchedExpression<T> {
        private dependencyState = new DNode(this);
        private didEvaluate = false;
        public value:T;

        constructor(private expr:()=>T, private onInvalidate:()=>void){
            this.dependencyState.computeNextState();
        }

        compute() {
            if (!this.didEvaluate) {
                this.didEvaluate = true;
                this.value = this.expr();
            } else {
                this.dispose();
                this.onInvalidate();
            }
            return false;
        }

        dispose() {
            this.dependencyState.dispose();
        }
    }
}