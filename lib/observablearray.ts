/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */

import {DataNode, checkIfStateIsBeingModifiedDuringView} from './dnode';
import SimpleEventEmitter from './simpleeventemitter';
import {ValueMode, assertUnwrapped, makeChildObservable} from './core';
import {IArrayChange, IArraySplice, IObservableArray, Lambda, IContextInfoStruct} from './interfaces';
import {deepEquals} from './utils';

// Workaround to make sure ObservableArray extends Array
export class StubArray {
}
StubArray.prototype = [];

export class ObservableArrayAdministration<T> extends DataNode {
    values: T[] = [];
    changeEvent: SimpleEventEmitter = new SimpleEventEmitter();

    constructor(private array: ObservableArray<T>, public mode:ValueMode, context: IContextInfoStruct) {
        super(context ? context : { name: undefined, object: undefined });
        if (!this.context.object)
            this.context.object = array;
    }
}

export class ObservableArray<T> extends StubArray implements IObservableArray<T> {
    [n: number]: T;
    $mobservable:ObservableArrayAdministration<T>;


    constructor(initialValues:T[], mode:ValueMode, context: IContextInfoStruct) {
        super();
        Object.defineProperty(this, "$mobservable", {
            enumerable: false,
            configurable: false,
            value : new ObservableArrayAdministration(this, mode, context)
        });

        if (initialValues && initialValues.length)
            this.replace(initialValues);
    }

    get length():number {
        this.$mobservable.notifyObserved();
        return this.$mobservable.values.length;
    }

    set length(newLength:number) {
        if (typeof newLength !== "number" || newLength < 0)
            throw new Error("[mobservable.array] Out of range: " + newLength);
        var currentLength = this.$mobservable.values.length;
        if (newLength === currentLength)
            return;
        else if (newLength > currentLength)
            this.spliceWithArray(currentLength, 0, new Array(newLength - currentLength));
        else
            this.spliceWithArray(newLength, currentLength - newLength);
    }

    // adds / removes the necessary numeric properties to this object
    private updateLength(oldLength:number, delta:number) {
        if (delta < 0) {
            checkIfStateIsBeingModifiedDuringView(this.$mobservable.context); 
            for(var i = oldLength + delta; i < oldLength; i++)
                delete this[i]; // bit faster but mem inefficient: Object.defineProperty(this, <string><any> i, notEnumerableProp);
        } else if (delta > 0) {
            checkIfStateIsBeingModifiedDuringView(this.$mobservable.context); 
            if (oldLength + delta > OBSERVABLE_ARRAY_BUFFER_SIZE)
                reserveArrayBuffer(oldLength + delta);
            // funny enough, this is faster than slicing ENUMERABLE_PROPS into defineProperties, and faster as a temporarily map
            for (var i = oldLength, end = oldLength + delta; i < end; i++)
                Object.defineProperty(this, "" + i, ENUMERABLE_PROPS[i])
        }
    }

    spliceWithArray(index:number, deleteCount?:number, newItems?:T[]):T[] {
        var length = this.$mobservable.values.length;
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
        var res:T[] = this.$mobservable.values.splice(index, deleteCount, ...newItems);

        this.notifySplice(index, res, newItems);
        return res;
    }

    makeReactiveArrayItem(value) {
        assertUnwrapped(value, "Array values cannot have modifiers");
        return makeChildObservable(value, this.$mobservable.mode, {
            object: this.$mobservable.context.object,
            name: this.$mobservable.context.name + "[x]"
        });
    }

    private notifyChildUpdate(index:number, oldValue:T) {
        this.notifyChanged();
        // conform: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe
        this.$mobservable.changeEvent.emit(<IArrayChange<T>>{ object: this, type: 'update', index: index, oldValue: oldValue});
    }

    private notifySplice(index:number, deleted:T[], added:T[]) {
        if (deleted.length === 0 && added.length === 0)
            return;
        this.notifyChanged();
        // conform: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe
        this.$mobservable.changeEvent.emit(<IArraySplice<T>>{ object: this, type: 'splice', index: index, addedCount: added.length, removed: deleted});
    }

    private notifyChanged() {
        this.$mobservable.markStale();
        this.$mobservable.markReady(true);
    }

    observe(listener:(changeData:IArrayChange<T>|IArraySplice<T>)=>void, fireImmediately=false):Lambda {
        if (fireImmediately)
            listener(<IArraySplice<T>>{ object: this, type: 'splice', index: 0, addedCount: this.$mobservable.values.length, removed: []});
        return this.$mobservable.changeEvent.on(listener);
    }

    clear(): T[] {
        return this.splice(0);
    }

    replace(newItems:T[]) {
        return this.spliceWithArray(0, this.$mobservable.values.length, newItems);
    }

    toJSON(): T[] {
        this.$mobservable.notifyObserved();
        return this.$mobservable.values.slice();
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
    find(predicate:(item:T,index:number,array:ObservableArray<T>)=>boolean, thisArg?, fromIndex=0):T {
        this.$mobservable.notifyObserved();
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
                return this.spliceWithArray(index);
            case 2:
                return this.spliceWithArray(index, deleteCount);
        }
        return this.spliceWithArray(index, deleteCount, newItems);
    }

    push(...items: T[]): number {
        this.spliceWithArray(this.$mobservable.values.length, 0, items);
        return this.$mobservable.values.length;
    }

    pop(): T {
        return this.splice(Math.max(this.$mobservable.values.length - 1, 0), 1)[0];
    }

    shift(): T {
        return this.splice(0, 1)[0]
    }

    unshift(...items: T[]): number {
        this.spliceWithArray(0, 0, items);
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

    /*
        functions that do not alter the array, from lib.es6.d.ts
    */
    concat<U extends T[]>(...items: U[]): T[];
    concat<U extends T[]>(): T[] { throw "Illegal state"; }
    join(separator?: string): string { throw "Illegal state"; }
    slice(start?: number, end?: number): T[] { throw "Illegal state"; }
    indexOf(searchElement: T, fromIndex?: number): number { throw "Illegal state"; }
    lastIndexOf(searchElement: T, fromIndex?: number): number { throw "Illegal state"; }
    every(callbackfn: (value: T, index: number, array: T[]) => boolean, thisArg?: any): boolean { throw "Illegal state"; }
    some(callbackfn: (value: T, index: number, array: T[]) => boolean, thisArg?: any): boolean { throw "Illegal state"; }
    forEach(callbackfn: (value: T, index: number, array: T[]) => void, thisArg?: any): void { throw "Illegal state"; }
    map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[] { throw "Illegal state"; }
    filter(callbackfn: (value: T, index: number, array: T[]) => boolean, thisArg?: any): T[] { throw "Illegal state"; }
    reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U { throw "Illegal state"; }
    reduceRight<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U { throw "Illegal state"; }

}

/**
    * Wrap function from prototype
    */
[
    "concat",
    "join",
    "slice",
    "indexOf",
    "lastIndexOf",
    "every",
    "some",
    "forEach",
    "map",
    "filter",
    "reduce",
    "reduceRight",
].forEach(funcName => {
    var baseFunc = Array.prototype[funcName];
    ObservableArray.prototype[funcName] = function() {
        this.$mobservable.notifyObserved();
        return baseFunc.apply(this.$mobservable.values, arguments);
    }
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
            assertUnwrapped(value, "Modifiers cannot be used on array values. For non-reactive array values use makeReactive(asFlat(array)).");
            if (index < this.$mobservable.values.length) {
                checkIfStateIsBeingModifiedDuringView(this.$mobservable.context); 
                var oldValue = this.$mobservable.values[index];
                var changed = this.$mobservable.mode === ValueMode.Structure ? !deepEquals(oldValue, value) : oldValue !== value; 
                if (changed) {
                    this.$mobservable.values[index] = this.makeReactiveArrayItem(value);
                    this.notifyChildUpdate(index, oldValue);
                }
            }
            else if (index === this.$mobservable.values.length)
                this.push(this.makeReactiveArrayItem(value));
            else
                throw new Error(`[mobservable.array] Index out of bounds, ${index} is larger than ${this.$mobservable.values.length}`);
        },
        get: function() {
            if (this.$mobservable && index < this.$mobservable.values.length) {
                this.$mobservable.notifyObserved();
                return this.$mobservable.values[index];
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