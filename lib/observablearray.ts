/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */

namespace mobservable {
    export namespace _ {
        // Workaround to make sure ObservableArray extends Array
        class StubArray {
        }
        StubArray.prototype = [];        
        
        export class ObservableArrayAdministration<T> extends DataNode {
            values: T[] = [];
            changeEvent: SimpleEventEmitter = new SimpleEventEmitter();

            constructor(private array: ObservableArray<T>, public recurse:boolean, context:Mobservable.IContextInfoStruct) {
                super(context);
                if (!context.object)
                    context.object = array;
            }
        }

        export class ObservableArray<T> extends StubArray implements Mobservable.IObservableArray<T> {
            [n: number]: T;
            $mobservable:ObservableArrayAdministration<T>;


            constructor(initialValues:T[], recurse: boolean, context:Mobservable.IContextInfoStruct) {
                super();
                Object.defineProperty(this, "$mobservable", {
                    enumerable: false,
                    configurable: false,
                    value : new ObservableArrayAdministration(this, recurse, context)
                });

                if (initialValues && initialValues.length)
                    this.replace(initialValues);
            }

            get length():number {
                this.$mobservable.notifyObserved();
                return this.$mobservable.values.length;
            }

            set length(newLength:number) {
                this.assertNotComputing("spliceWithArray");
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
                if (delta < 0)
                    for(var i = oldLength + delta; i < oldLength; i++)
                        delete this[i]; // bit faster but mem inefficient: Object.defineProperty(this, <string><any> i, notEnumerableProp);
                else if (delta > 0) {
                    if (oldLength + delta > OBSERVABLE_ARRAY_BUFFER_SIZE)
                        reserveArrayBuffer(oldLength + delta);
                    // funny enough, this is faster than slicing ENUMERABLE_PROPS into defineProperties, and faster as a temporarily map
                    for (var i = oldLength, end = oldLength + delta; i < end; i++)
                        Object.defineProperty(this, "" + i, ENUMERABLE_PROPS[i])
                }
            }

            spliceWithArray(index:number, deleteCount?:number, newItems?:T[]):T[] {
                this.assertNotComputing("spliceWithArray");
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
                else if (this.$mobservable.recurse)
                    newItems = <T[]> newItems.map((value) => this.makeReactiveArrayItem(value));

                var lengthDelta = newItems.length - deleteCount;
                var res:T[] = this.$mobservable.values.splice(index, deleteCount, ...newItems);
                this.updateLength(length, lengthDelta); // create or remove new entries

                this.notifySplice(index, res, newItems);
                return res;
            }

            makeReactiveArrayItem(value) {
                if (isReactive(value))
                    return value;
                if (value instanceof AsReference)
                    return value = value.value;
                const context = {
                    object: this.$mobservable.context.object,
                    name: this.$mobservable.context.name + "[x]"
                }

                if (Array.isArray(value))
                    return new _.ObservableArray(<[]>value, true, context);
                if (isPlainObject(value))
                    return _.extendReactive({}, value, true, context)
                return value;
            }

            private notifyChildUpdate(index:number, oldValue:T) {
                this.notifyChanged();
                // conform: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe
                this.$mobservable.changeEvent.emit(<Mobservable.IArrayChange<T>>{ object: this, type: 'update', index: index, oldValue: oldValue});
            }

            private notifySplice(index:number, deleted:T[], added:T[]) {
                if (deleted.length === 0 && added.length === 0)
                    return;
                this.notifyChanged();
                // conform: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe
                this.$mobservable.changeEvent.emit(<Mobservable.IArraySplice<T>>{ object: this, type: 'splice', index: index, addedCount: added.length, removed: deleted});
            }

            private notifyChanged() {
                this.$mobservable.markStale();
                this.$mobservable.markReady(true);
            }

            observe(listener:(changeData:Mobservable.IArrayChange<T>|Mobservable.IArraySplice<T>)=>void, fireImmediately=false):Lambda {
                if (fireImmediately)
                    listener(<Mobservable.IArraySplice<T>>{ object: this, type: 'splice', index: 0, addedCount: this.$mobservable.values.length, removed: []});
                return this.$mobservable.changeEvent.on(listener);
            }

            clear(): T[] {
                return this.splice(0);
            }

            replace(newItems:T[]) {
                return this.spliceWithArray(0, this.$mobservable.values.length, newItems);
            }

            values(): T[] {
                console.warn("mobservable.array.values is deprecated and will be removed in 0.7, use slice() instead");
                this.$mobservable.notifyObserved();
                return this.$mobservable.values.slice();
            }

            toJSON(): T[] {
                this.$mobservable.notifyObserved();
                return this.$mobservable.values.slice();
            }

            clone(): ObservableArray<T> {
                console.warn("mobservable.array.clone is deprecated and will be removed in 0.7");
                this.$mobservable.notifyObserved();
                return new ObservableArray<T>(this.$mobservable.values, this.$mobservable.recurse, {
                    object: null,
                    name: this.$mobservable.context.name + "[clone]"
                });
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
                this.assertNotComputing("splice");
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
                this.assertNotComputing("push");
                this.spliceWithArray(this.$mobservable.values.length, 0, items);
                return this.$mobservable.values.length;
            }

            pop(): T {
                this.assertNotComputing("pop");
                return this.splice(Math.max(this.$mobservable.values.length - 1, 0), 1)[0];
            }

            shift(): T {
                this.assertNotComputing("shift");
                return this.splice(0, 1)[0]
            }

            unshift(...items: T[]): number {
                this.assertNotComputing("unshift");
                this.spliceWithArray(0, 0, items);
                return this.$mobservable.values.length;
            }

            reverse():T[] {
                this.assertNotComputing("reverse");
                return this.replace(this.$mobservable.values.reverse());
            }

            sort(compareFn?: (a: T, b: T) => number): T[] {
                this.assertNotComputing("sort");
                return this.replace(this.$mobservable.values.sort.apply(this.$mobservable.values, arguments));
            }

            remove(value:T):boolean {
                this.assertNotComputing("remove");
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

            private assertNotComputing(funcName:string) {
                if (_.isComputingView()) {
                    console.error(`[mobservable.array] The method array.${funcName} is not allowed to be used inside reactive views since it alters the state.`);
                }
            }
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
        var ENUMERABLE_PROPS = [];

        function createArrayBufferItem(index:number) {
            var prop = {
                enumerable: false,
                configurable: false,
                set: function(value) {
                    if (index < this.$mobservable.values.length) {
                        var oldValue = this.$mobservable.values[index];
                        if (oldValue !== value) {
                            this.$mobservable.values[index] = value;
                            this.notifyChildUpdate(index, oldValue);
                        }
                    }
                    else if (index === this.$mobservable.values.length)
                        this.push(value);
                    else
                        throw new Error(`[mobservable.array] Index out of bounds, ${index} is larger than ${this.values.length}`);
                },
                get: function() {
                    if (index < this.$mobservable.values.length) {
                        this.$mobservable.notifyObserved();
                        return this.$mobservable.values[index];
                    }
                    return undefined;
                }
            };
            Object.defineProperty(ObservableArray.prototype, "" + index, prop);
            prop.enumerable = true;
            prop.configurable = true;
            ENUMERABLE_PROPS[index] = prop;
        }

        function reserveArrayBuffer(max:number) {
            for (var index = OBSERVABLE_ARRAY_BUFFER_SIZE; index < max; index++)
                createArrayBufferItem(index);
            OBSERVABLE_ARRAY_BUFFER_SIZE = max;
        }

        reserveArrayBuffer(1000);
    }
}