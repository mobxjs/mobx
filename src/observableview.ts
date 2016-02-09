/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */

import {ViewNode, isComputingView, NodeState, isInTransaction} from './dnode';
import SimpleEventEmitter from './simpleeventemitter';
import {IContextInfoStruct, Lambda} from './interfaces';
import {deepEquals, once} from './utils';

export function throwingViewSetter(name):Lambda {
    return () => {
        throw new Error(`[mobservable.view '${name}'] View functions do not accept new values`);
    }
}

export class ObservableView<T> extends ViewNode {
    private isComputing = false;
    protected _value: T;
    protected changeEvent = new SimpleEventEmitter();

    constructor(protected func:()=>T, private scope: Object, context:IContextInfoStruct, private compareStructural: boolean) {
        super(context);
    }

    get():T {
        if (this.isComputing)
            throw new Error(`[mobservable.view '${this.context.name}'] Cycle detected`);
        if (this.state === NodeState.STALE && isInTransaction()) {
            return this.func.call(this.scope);
        }
        if (this.isSleeping) {
            if (isComputingView()) {
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
        return this._value;
    }

    set(x) {
        throwingViewSetter(this.context.name)();
    }

    compute() {
        // this cycle detection mechanism is primarily for lazy computed values; other cycles are already detected in the dependency tree
        if (this.isComputing)
            throw new Error(`[mobservable.view '${this.context.name}'] Cycle detected`);
        this.isComputing = true;
        const newValue = this.func.call(this.scope);
        this.isComputing = false;
        const changed = this.compareStructural ? !deepEquals(newValue, this._value) : newValue !== this._value;
        if (changed) {
            const oldValue = this._value;
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

    toString() {
        return `ComputedObservable[${this.context.name} (current value:'${this._value}')] ${this.func.toString()}`;
    }
}