/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
import {DataNode, checkIfStateIsBeingModifiedDuringView} from './dnode';
import SimpleEventEmitter from './simpleeventemitter';
import {ValueMode, getValueModeFromValue, makeChildObservable, assertUnwrapped} from './core';
import {deepEquals} from './utils';
import {IContextInfoStruct, Lambda} from './interfaces';

let inTransaction = 0;
const changedValues : ObservableValue<any>[] = [];

export class ObservableValue<T> extends DataNode {
    protected changeEvent = new SimpleEventEmitter();
    protected _value: T;

    constructor(protected value:T, protected mode:ValueMode, context: IContextInfoStruct){
        super(context);
        const [childmode, unwrappedValue] = getValueModeFromValue(value, ValueMode.Recursive);
        // If the value mode is recursive, modifiers like 'structure', 'reference', or 'flat' could apply
        if (this.mode === ValueMode.Recursive)
            this.mode = childmode;
        this._value = this.makeReferenceValueReactive(unwrappedValue);
    }

    private makeReferenceValueReactive(value) {
        return makeChildObservable(value, this.mode, this.context);
    }

    set(newValue:T) {
        assertUnwrapped(newValue, "Modifiers cannot be used on non-initial values.");
        checkIfStateIsBeingModifiedDuringView(this.context);
        const changed = this.mode === ValueMode.Structure ? !deepEquals(newValue, this._value) : newValue !== this._value;
        // Possible improvement; even if changed and structural, apply the minium amount of updates to alter the object,
        // To minimize the amount of observers triggered.
        // Complex. Is that a useful case?
        if (changed) {
            var oldValue = this._value;
            this.markStale();
            this._value = this.makeReferenceValueReactive(newValue);
            this.changeEvent.emit(this._value, oldValue);
            if (inTransaction === 0)
                this.markReady(true);
            else
                changedValues[changedValues.length] = this;
        }
        return changed;
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

    toString() {
        return `Observable[${this.context.name}:${this._value}]`;
    }
}



export function transaction<T>(action:()=>T):T {
    inTransaction += 1;
    try {
        return action();
    } finally {
        if (--inTransaction === 0) {
            for (var i = 0, l = changedValues.length; i < l; i++)
                changedValues[i].markReady(true);
            changedValues.splice(0, l);
            if (changedValues.length)
                throw new Error("Illegal State");
        }
    }
}