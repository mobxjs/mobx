/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */

import {deepEquals, makeNonEnumerable} from './utils';
import {IAtom, reportAtomChanged} from "./core/atom";
import {reportObserved} from "./core/observable";
import SimpleEventEmitter from './simpleeventemitter';
import {ValueMode, assertUnwrapped, makeChildObservable} from './core';
import {IArrayChange, IArraySplice, IObservableArray, Lambda} from './interfaces';
import ObservableValue from "./types/observablevalue";
import {getNextId, checkIfStateIsBeingModifiedDuringDerivation} from "./core/global";
import {IDerivation} from "./core/derivation";


// Workaround to make sure ObservableArray extends Array
export class StubArray {
}
StubArray.prototype = [];

export class ObservableArrayAdministration<T> implements IAtom {
    values: T[];
    changeEvent: SimpleEventEmitter;
    lastKnownLength = 0;
    id = getNextId();
    isDirty = false;
    observers:IDerivation[] = []; // TODO: initialize lazy
    
    // TODO: remove supportEnumerable
    constructor(private array: ObservableArray<T>, public mode:ValueMode, public supportEnumerable:boolean, public name: string) {
    }
    
    onBecomeUnobserved() {
        // noop
    }
    
    getLength(): number {
        reportObserved(this);
        return this.values.length;
    }
    
    setLength(newLength): number {
        if (typeof newLength !== "number" || newLength < 0)
            throw new Error("[mobservable.array] Out of range: " + newLength);
        var currentLength = this.values.length;
        if (newLength === currentLength)
            return;
        else if (newLength > currentLength)
            this.spliceWithArray(currentLength, 0, new Array(newLength - currentLength));
        else
            this.spliceWithArray(newLength, currentLength - newLength);
    }
    
    
    // adds / removes the necessary numeric properties to this object
    updateLength(oldLength:number, delta:number) {
        if (oldLength !== this.lastKnownLength)
            throw new Error("[mobservable] Modification exception: the internal structure of an observable array was changed. Did you use peek() to change it?");
        this.lastKnownLength += delta;
        if (delta < 0) {
            checkIfStateIsBeingModifiedDuringDerivation(this.name);
            if (this.supportEnumerable)
                for(var i = oldLength + delta; i < oldLength; i++)
                    delete this.array[i]; // bit faster but mem inefficient: 
        } else if (delta > 0) {
            checkIfStateIsBeingModifiedDuringDerivation(this.name);
            if (oldLength + delta > OBSERVABLE_ARRAY_BUFFER_SIZE)
                reserveArrayBuffer(oldLength + delta);
            // funny enough, this is faster than slicing ENUMERABLE_PROPS into defineProperties, and faster as a temporarily map
            if (this.supportEnumerable)
                for (var i = oldLength, end = oldLength + delta; i < end; i++)
                    Object.defineProperty(this.array, <string><any> i, ENUMERABLE_PROPS[i])
        }
    }

    spliceWithArray(index:number, deleteCount?:number, newItems?:T[]):T[] {
        var length = this.values.length;
        if  ((newItems === undefined || newItems.length === 0) && (deleteCount === 0 || length === 0))
            return [];

        if (index === undefined)
            index = 0;
        else if (index > length)
            index = length;
        else if (index < 0)
            index = Math.max(0, length + index);

        if (arguments.length === 1)
            deleteCount = length - index;
        else if (deleteCount === undefined || deleteCount === null)
            deleteCount = 0;
        else
            deleteCount = Math.max(0, Math.min(deleteCount, length - index));

        if (newItems === undefined)
            newItems = [];
        else
            newItems = <T[]> newItems.map((value) => this.makeReactiveArrayItem(value));

        var lengthDelta = newItems.length - deleteCount;
        this.updateLength(length, lengthDelta); // create or remove new entries
        var res:T[] = this.values.splice(index, deleteCount, ...newItems);

        this.notifySplice(index, res, newItems);
        return res;
    }

    makeReactiveArrayItem(value) {
        assertUnwrapped(value, "Array values cannot have modifiers");
        return makeChildObservable(value, this.mode, this.name + "[x]");
    }

    private notifyChildUpdate(index:number, oldValue:T) {
        reportAtomChanged(this);
        // conform: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe
        if (this.changeEvent)
            this.changeEvent.emit(<IArrayChange<T>>{ object: <IObservableArray<T>><any> this.array, type: 'update', index: index, oldValue: oldValue});
    }

    private notifySplice(index:number, deleted:T[], added:T[]) {
        if (deleted.length === 0 && added.length === 0)
            return;
        reportAtomChanged(this);
        // conform: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe
        if (this.changeEvent)
            this.changeEvent.emit(<IArraySplice<T>>{ object: <IObservableArray<T>><any> this.array, type: 'splice', index: index, addedCount: added.length, removed: deleted});
    }
}

export function createObservableArray<T>(initialValues:T[], mode:ValueMode, supportEnumerable:boolean, name:string): IObservableArray<T> {
    return <IObservableArray<T>><any> new ObservableArray(initialValues, mode, supportEnumerable, name);
}

export class ObservableArray<T> extends StubArray {
    $mobservable:ObservableArrayAdministration<T>;

    constructor(initialValues:T[], mode:ValueMode, supportEnumerable:boolean, name: string) {
        super();
        let adm = new ObservableArrayAdministration(this, mode, supportEnumerable, name);
        Object.defineProperty(this, "$mobservable", {
            enumerable: false,
            configurable: false,
            value : adm
        });

        if (initialValues && initialValues.length) {
            adm.updateLength(0, initialValues.length);
            adm.values = initialValues.map(v => adm.makeReactiveArrayItem(v));
        } else
            adm.values = [];
    }

    observe(listener:(changeData:IArrayChange<T>|IArraySplice<T>)=>void, fireImmediately=false):Lambda {
        if (this.$mobservable.changeEvent === undefined)
            this.$mobservable.changeEvent = new SimpleEventEmitter();
        if (fireImmediately)
            listener(<IArraySplice<T>>{ object: <IObservableArray<T>><any> this, type: 'splice', index: 0, addedCount: this.$mobservable.values.length, removed: []});
        return this.$mobservable.changeEvent.on(listener);
    }

    clear(): T[] {
        return this.splice(0);
    }

    replace(newItems:T[]) {
        return this.$mobservable.spliceWithArray(0, this.$mobservable.values.length, newItems);
    }

    toJSON(): T[] {
        reportObserved(this.$mobservable);
        return this.$mobservable.values.slice();
    }

    peek(): T[] {
        reportObserved(this.$mobservable);
        return this.$mobservable.values;
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
    find(predicate:(item:T,index:number,array:ObservableArray<T>)=>boolean, thisArg?, fromIndex=0):T {
        reportObserved(this.$mobservable);
        var items = this.$mobservable.values, l = items.length;
        for(var i = fromIndex; i < l; i++)
            if(predicate.call(thisArg, items[i], i, this))
                return items[i];
        return null;
    }

    /*
        functions that do alter the internal structure of the array, (based on lib.es6.d.ts)
        since these functions alter the inner structure of the array, the have side effects.
        Because the have side effects, they should not be used in computed function,
        and for that reason the do not call dependencyState.notifyObserved
        */
    splice(index:number, deleteCount?:number, ...newItems:T[]):T[] {
        switch(arguments.length) {
            case 0:
                return [];
            case 1:
                return this.$mobservable.spliceWithArray(index);
            case 2:
                return this.$mobservable.spliceWithArray(index, deleteCount);
        }
        return this.$mobservable.spliceWithArray(index, deleteCount, newItems);
    }

    push(...items: T[]): number {
        this.$mobservable.spliceWithArray(this.$mobservable.values.length, 0, items);
        return this.$mobservable.values.length;
    }

    pop(): T {
        return this.splice(Math.max(this.$mobservable.values.length - 1, 0), 1)[0];
    }

    shift(): T {
        return this.splice(0, 1)[0]
    }

    unshift(...items: T[]): number {
        this.$mobservable.spliceWithArray(0, 0, items);
        return this.$mobservable.values.length;
    }

    reverse():T[] {
        return this.replace(this.$mobservable.values.reverse());
    }

    sort(compareFn?: (a: T, b: T) => number): T[] {
        return this.replace(this.$mobservable.values.sort.apply(this.$mobservable.values, arguments));
    }

    remove(value:T):boolean {
        var idx = this.$mobservable.values.indexOf(value);
        if (idx > -1) {
            this.splice(idx, 1);
            return true;
        }
        return false;
    }

    toString():string { 
        return "[mobservable.array] " + Array.prototype.toString.apply(this.$mobservable.values, arguments);
    }

    toLocaleString():string { 
        return "[mobservable.array] " + Array.prototype.toLocaleString.apply(this.$mobservable.values, arguments);
    }
}

/**
 * We don't want those to show up in `for (var key in ar)` ...
 */
makeNonEnumerable(ObservableArray.prototype, [
    "constructor",
    "clear",
    "find",
    "observe",
    "pop",
    "peek",
    "push",
    "remove",
    "replace",
    "reverse",
    "shift",
    "sort",
    "splice",
    "split",
    "toJSON",
    "toLocaleString",
    "toString",
    "unshift"
]);
Object.defineProperty(ObservableArray.prototype, "length", {
    enumerable: false,
    configurable: true,
    get: function ():number {
        return this.$mobservable.getLength();
    },
    set: function (newLength:number) {
        this.$mobservable.setLength(newLength);
    }
});


/**
 * Wrap function from prototype
 */
[
    "concat",
    "every",
    "filter",
    "forEach",
    "indexOf",
    "join",
    "lastIndexOf",
    "map",
    "reduce",
    "reduceRight",
    "slice",
    "some",
].forEach(funcName => {
    var baseFunc = Array.prototype[funcName];
    Object.defineProperty(ObservableArray.prototype, funcName, {
        configurable: false,
        writable: true,
        enumerable: false,
        value: function() {
            reportObserved(this.$mobservable);
            return baseFunc.apply(this.$mobservable.values, arguments);
        }
    });
});

/**
    * This array buffer contains two lists of properties, so that all arrays
    * can recycle their property definitions, which significantly improves performance of creating
    * properties on the fly.
    */
var OBSERVABLE_ARRAY_BUFFER_SIZE = 0;
var ENUMERABLE_PROPS : PropertyDescriptor[] = [];

function createArrayBufferItem(index:number) {
    var prop = ENUMERABLE_PROPS[index] = {
        enumerable: true,
        configurable: true,
        set: function(value) {
            const impl = this.$mobservable;
            const values = impl.values;
            assertUnwrapped(value, "Modifiers cannot be used on array values. For non-reactive array values use makeReactive(asFlat(array)).");
            if (index < values.length) {
                checkIfStateIsBeingModifiedDuringDerivation(impl.context); 
                var oldValue = values[index];
                var changed = impl.mode === ValueMode.Structure ? !deepEquals(oldValue, value) : oldValue !== value; 
                if (changed) {
                    values[index] = impl.makeReactiveArrayItem(value);
                    impl.notifyChildUpdate(index, oldValue);
                }
            }
            else if (index === values.length)
                this.push(impl.makeReactiveArrayItem(value));
            else
                throw new Error(`[mobservable.array] Index out of bounds, ${index} is larger than ${values.length}`);
        },
        get: function() {
            const impl = this.$mobservable;
            if (impl && index < impl.values.length) {
                reportObserved(impl);
                return impl.values[index];
            }
            return undefined;
        }
    };
    Object.defineProperty(ObservableArray.prototype, "" + index, {
        enumerable: false,
        configurable: true,
        get: prop.get,
        set: prop.set
    });
}

function reserveArrayBuffer(max:number) {
    for (var index = OBSERVABLE_ARRAY_BUFFER_SIZE; index < max; index++)
        createArrayBufferItem(index);
    OBSERVABLE_ARRAY_BUFFER_SIZE = max;
}

reserveArrayBuffer(1000);