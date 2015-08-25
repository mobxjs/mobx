namespace mobservable {
    export namespace _ {
        // Workaround to make sure ObservableArray extends Array
        class StubArray {
        }
        StubArray.prototype = [];

        export class ObservableArrayAdministration<T> extends RootDNode {
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
                if (typeof newLength !== "number" || newLength < 0)
                    throw new Error("Out of range: " + newLength);
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
                this.$mobservable.notifyObserved();
                return this.$mobservable.values.slice();
            }

            toJSON(): T[] {
                this.$mobservable.notifyObserved();
                return this.$mobservable.values.slice();
            }

            clone(): ObservableArray<T> {
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
                this.sideEffectWarning("splice");
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
                this.sideEffectWarning("push");
                this.spliceWithArray(this.$mobservable.values.length, 0, items);
                return this.$mobservable.values.length;
            }

            pop(): T {
                this.sideEffectWarning("pop");
                return this.splice(Math.max(this.$mobservable.values.length - 1, 0), 1)[0];
            }

            shift(): T {
                this.sideEffectWarning("shift");
                return this.splice(0, 1)[0]
            }

            unshift(...items: T[]): number {
                this.sideEffectWarning("unshift");
                this.spliceWithArray(0, 0, items);
                return this.$mobservable.values.length;
            }

            reverse():T[] {
                this.sideEffectWarning("reverse");
                return this.replace(this.$mobservable.values.reverse());
            }

            sort(compareFn?: (a: T, b: T) => number): T[] {
                this.sideEffectWarning("sort");
                return this.replace(this.$mobservable.values.sort.apply(this.$mobservable.values, arguments));
            }

            remove(value:T):boolean {
                this.sideEffectWarning("remove");
                var idx = this.$mobservable.values.indexOf(value);
                if (idx > -1) {
                    this.splice(idx, 1);
                    return true;
                }
                return false;
            }

            /*
                functions that do not alter the array, from lib.es6.d.ts
            */
            toString():string { return this.wrapReadFunction<string>("toString", arguments); }
            toLocaleString():string { return this.wrapReadFunction<string>("toLocaleString", arguments); }
            concat<U extends T[]>(...items: U[]): T[];
            concat<U extends T[]>(): T[] { return this.wrapReadFunction<T[]>("concat", arguments); }
            join(separator?: string): string { return this.wrapReadFunction<string>("join", arguments); }
            slice(start?: number, end?: number): T[] { return this.wrapReadFunction<T[]>("slice", arguments); }
            indexOf(searchElement: T, fromIndex?: number): number { return this.wrapReadFunction<number>("indexOf", arguments); }
            lastIndexOf(searchElement: T, fromIndex?: number): number { return this.wrapReadFunction<number>("lastIndexOf", arguments); }
            every(callbackfn: (value: T, index: number, array: T[]) => boolean, thisArg?: any): boolean { return this.wrapReadFunction<boolean>("every", arguments); }
            some(callbackfn: (value: T, index: number, array: T[]) => boolean, thisArg?: any): boolean { return this.wrapReadFunction<boolean>("some", arguments); }
            forEach(callbackfn: (value: T, index: number, array: T[]) => void, thisArg?: any): void { return this.wrapReadFunction<void>("forEach", arguments); }
            map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[] { return this.wrapReadFunction<U[]>("map", arguments); }
            filter(callbackfn: (value: T, index: number, array: T[]) => boolean, thisArg?: any): T[] { return this.wrapReadFunction<T[]>("filter", arguments); }
            reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U { return this.wrapReadFunction<U>("reduce", arguments); }
            reduceRight<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U { return this.wrapReadFunction<U>("reduceRight", arguments); }

            private wrapReadFunction<U>(funcName:string, initialArgs:IArguments):U {
                var baseFunc = Array.prototype[funcName];
                // generate a new function that wraps arround the Array.prototype, and replace our own definition
                return (ObservableArray.prototype[funcName] = function() {
                    this.$mobservable.notifyObserved();
                    return baseFunc.apply(this.$mobservable.values, arguments);
                }).apply(this, initialArgs);
            }

            private sideEffectWarning(funcName:string) {
                if (debugLevel > 0 && RootDNode.trackingStack.length > 0)
                    warn(`[Mobservable.Array] The method array.${funcName} should probably not be used inside observable functions since it has side-effects`);
            }
        }

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
                        throw new Error(`ObservableArray: Index out of bounds, ${index} is larger than ${this.values.length}`);
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