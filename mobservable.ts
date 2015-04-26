/**
 * MOBservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */

interface Lambda {
    ():void;
}

interface IObservableValue<T,S> {
    ():T;
    (value:T):S;
    observe(callback:(newValue:T, oldValue:T)=>void, fireImmediately?:boolean):Lambda;
}

interface MobservableStatic {
    // shorthand for .value()
    <T,S>(value?:T|{():T}, scope?:S):IObservableValue<T,S>;

    // core functinos
    array<T>(values?:T[]): ObservableArray<T>;
    value<T,S>(value?:T|{():T}, scope?:S):IObservableValue<T,S>;
    watch<T>(func:()=>T, onInvalidate:Lambda):[T,Lambda];

    // property definition
    observable(target:Object, key:string); // annotation
    defineObservableProperty<T>(object:Object, name:string, initialValue?:T);
    initializeObservableProperties(object:Object);
    observeProperty(object:Object, key:string, listener:Function, invokeImmediately?:boolean):Lambda;

    // batching
    batch(action:Lambda);
    onReady(listener:Lambda):Lambda;
    onceReady(listener:Lambda);

    // Utils
    SimpleEventEmitter: new()=> SimpleEventEmitter;

    debugLevel: number;
}

/**
    Creates an observable from either a value or a function.
    If a scope is provided, the function will be always executed usign the provided scope.
    Returns a new IObservable, that is, a functon that can be used to set a new value or get the current values
    (the latter if no arguments are provided)
*/
function createObservable<T,S>(value?:T|{():T}, scope?:S):IObservableValue<T,S> {
    var prop:ObservableValue<T,S> = null;

    if (Array.isArray && Array.isArray(value) && mobservableStatic.debugLevel)
        warn("mobservable.value() was invoked with an array. Probably you want to create an mobservable.array() instead of observing a reference to an array?");

    if (typeof value === "function")
        prop = new ComputedObservable(<()=>T>value, scope);
    else
        prop = new ObservableValue(<T>value, scope);

    var propFunc = function(value?:T):T|S {
        if (arguments.length > 0)
            return <S> prop.set(value);
        else
            return <T> prop.get();
    };
    (<any>propFunc).observe = prop.observe.bind(prop);
    (<any>propFunc).prop = prop;
    (<any>propFunc).toString = function() { return prop.toString(); };

    return <IObservableValue<T,S>> propFunc;
}

/**
    @see mobservableStatic.value
*/
var mobservableStatic:MobservableStatic = <MobservableStatic> function<T,S>(value?:T|{():T}, scope?:S):IObservableValue<T,S> {
    return createObservable(value,scope);
};

/**
    @see createObservable
*/
mobservableStatic.value = createObservable;

/**
    DebugLevel: level 0: warnings only, level 1 or higher, prints a lot of messages.
*/
mobservableStatic.debugLevel = 0;

/**
    Evaluates func and return its results. Watch tracks all observables that are used by 'func'
    and invokes 'onValidate' whenever func *should* update.
    Returns  a tuplde [return value of func, disposer]. The disposer can be used to abort the watch early.
*/
mobservableStatic.watch = function watch<T>(func:()=>T, onInvalidate:Lambda):[T,Lambda] {
    var dnode = new DNode(true);
    var retVal:T;
    dnode.compute = function() {
        retVal = func();
        dnode.compute = function() {
            dnode.dispose();
            onInvalidate();
            return false;
        }
        return false;
    }
    dnode.computeNextValue();
    return [retVal, () => dnode.dispose()];
}

/**
    Can be used to observe observable properties that are created using the `observable` annotation,
    `defineObservableProperty` or `initializeObservableProperties`.
    (Since properties do not expose an .observe method themselves).
*/
mobservableStatic.observeProperty = function observeProperty(object:Object, key:string, listener:(...args:any[])=>void, invokeImmediately = false):Lambda {
    if (!object || !key || object[key] === undefined)
        throw new Error(`Object '${object}' has no key '${key}'.`);
    if (!listener || typeof listener !== "function")
        throw new Error("Third argument to mobservable.observeProperty should be a function");

    var currentValue = object[key];

    // ObservableValue, ComputedObservable or ObservableArray? -> attach observer
    if (currentValue instanceof ObservableValue || currentValue instanceof ObservableArray)
        return currentValue.observe(listener, invokeImmediately);
    // IObservable? -> attach observer
    else if (currentValue.prop && currentValue.prop instanceof ObservableValue)
        return currentValue.prop.observe(listener, invokeImmediately);

    // wrap with observable function
    var observer = new ComputedObservable((() => object[key]), object);
    var disposer = observer.observe(listener, invokeImmediately);

    if (mobservableStatic.debugLevel && (<any>observer).dependencyState.observing.length === 0)
        warn(`mobservable.observeProperty: property '${key}' of '${object} doesn't seem to be observable. Did you define it as observable?`);

    return once(() => {
        disposer();
        (<any>observer).dependencyState.dispose(); // clean up
    });
}

mobservableStatic.array = function array<T>(values?:T[]): ObservableArray<T> {
    return new ObservableArray(values);
}

mobservableStatic.batch = function batch(action:Lambda) {
    Scheduler.batch(action);
}

mobservableStatic.onReady = function onReady(listener:Lambda):Lambda {
    return Scheduler.onReady(listener);
}

mobservableStatic.onceReady = function onceReady(listener:Lambda) {
    Scheduler.onceReady(listener);
}

mobservableStatic.observable = function observable(target:Object, key:string, descriptor?) {
    var baseValue = descriptor ? descriptor.value : null;

    // observable annotations are invoked on the prototype, not on actual instances,
    // so upon invocation, determine the 'this' instance, and define a property on the
    // instance as well (that hides the propotype property)

    if (typeof baseValue === "function") {
        delete descriptor.value;
        delete descriptor.writable;
        descriptor.get = function() {
            mobservableStatic.defineObservableProperty(this, key, baseValue);
            return this[key];
        }
        descriptor.set = function () {
            console.trace();
            throw new Error("It is not allowed to reassign observable functions");
        }
    } else {
        Object.defineProperty(target, key, {
            configurable: true, enumberable:true,
            get: function() {
                mobservableStatic.defineObservableProperty(this, key, undefined);
                return this[key];
            },
            set: function(value) {
                if (Array.isArray(value)) {
                    var ar = new ObservableArray(value);
                    Object.defineProperty(this, key, {
                        value: ar,
                        writeable: false,
                        configurable: false,
                        enumberable: true
                    });
                }
                else
                    mobservableStatic.defineObservableProperty(this, key, value);
            }
        });
    }
}

mobservableStatic.defineObservableProperty = function defineObservableProperty<T>(object:Object, name:string, initialValue?:T) {
    var _property = mobservableStatic.value(initialValue, object);
    definePropertyForObservable(object, name, _property);
}

mobservableStatic.initializeObservableProperties = function initializeObservableProperties(object:Object) {
    for(var key in object) if (object.hasOwnProperty(key)) {
        if (object[key] && object[key].prop && object[key].prop instanceof ObservableValue)
            definePropertyForObservable(object, key, <IObservableValue<any,any>> object[key])
    }
}

function definePropertyForObservable(object:Object, name:string, observable:IObservableValue<any,any>) {
    Object.defineProperty(object, name, {
        get: function() {
            return observable();
        },
        set: function(value) {
            observable(value);
        },
        enumerable: true,
        configurable: true
    });
}

class ObservableValue<T,S> {
    protected changeEvent = new SimpleEventEmitter();
    protected dependencyState:DNode = new DNode(false);

    constructor(protected _value?:T, protected scope?:S){
    }

    set(value:T):S {
        if (value !== this._value) {
            var oldValue = this._value;
            this.dependencyState.markStale();
            this._value = value;
            this.dependencyState.markReady(true);
            this.changeEvent.emit(value, oldValue);
        }
        return this.scope;
    }

    get():T {
        this.dependencyState.notifyObserved();
        return this._value;
    }

    observe(listener:(newValue:T, oldValue:T)=>void, fireImmediately=false):Lambda {
        this.dependencyState.setRefCount(+1); // awake
        if (fireImmediately)
            listener(this.get(), undefined);
        var disposer = this.changeEvent.on(listener);
        return once(() => {
            this.dependencyState.setRefCount(-1);
            disposer();
        });
    }

    toString() {
        return `Observable[${this._value}]`;
    }
}

class ComputedObservable<U,S> extends ObservableValue<U,S> {
    private isComputing = false;
    private hasError = false;

    constructor(protected func:()=>U, scope:S) {
        super(undefined, scope);
        if (!func)
            throw new Error("ComputedObservable requires a function");
        this.dependencyState.isComputed = true;
        this.dependencyState.compute = this.compute.bind(this);
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
            if (mobservableStatic.debugLevel) {
                console.trace();
                warn(`${this}: rethrowing caught exception to observer: ${this._value}${(<any>this._value).cause||''}`);
            }
            throw this._value;
        }
        return this._value;
    }

    set(_:U):S {
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

enum DNodeState {
    STALE, // One or more depencies have changed, current value is stale
    PENDING, // All dependencies are up to date again, a recalculation of this node is pending, current value is stale
    READY, // Everything is bright and shiny
};

class DNode {
    state: DNodeState = DNodeState.READY;
    isSleeping = true;
    hasCycle = false;

    private observing: DNode[] = [];
    private prevObserving: DNode[] = null;
    private observers: DNode[] = [];
    private dependencyChangeCount = 0;
    private isDisposed = false;
    private externalRefenceCount = 0;

    constructor(public isComputed:boolean) {
    }

    getRefCount():number {
        return this.observers.length + this.externalRefenceCount;
    }

    setRefCount(delta:number) {
        this.externalRefenceCount += delta;
        if (delta > 0 && this.externalRefenceCount === delta)
            this.wakeUp();
        else if (this.externalRefenceCount === 0)
            this.tryToSleep();
    }

    // TODO: remove?
    getObserversCount() {
        return this.observers.length;
    }

    addObserver(node:DNode) {
        this.observers[this.observers.length] = node;
    }

    removeObserver(node:DNode) {
        var idx = this.observers.indexOf(node);
        if (idx !== -1) {
            this.observers.splice(idx, 1);
            this.tryToSleep();
        }
    }

    hasObservingChanged() {
        if (this.observing.length !== this.prevObserving.length)
            return true;
        // Optimization; use cached length
        var l = this.observing.length;
        for(var i = 0; i < l; i++)
            if (this.observing[i] !== this.prevObserving[i])
                return true;
        return false;
    }

    markStale() {
        if (this.state === DNodeState.PENDING)
            return; // recalculation already scheduled, we're fine..
        if (this.state === DNodeState.STALE)
            return;

        this.state = DNodeState.STALE;
        /*
            Mark stale recursively marks all observers stale as well, this is nice since it
            makes all computations consistent, e.g.:
            a = property(3)
            b = property(() => a() * 2)
            c = property(() => b() + a())
            a(4)
            // -> c will directly yield 12, and no intermediate 4 or 11 where either 'a' or 'b' wasn't updated in c

            However, if performance becomes an issue, it might be nice to introduce a global 'consistent' flag,
            that drops de recursive markStale / markReady in favor of a direct set and an (async?) scheduled recomputation
            of computed properties
         */
        this.notifyObservers();
    }

    markReady(didTheValueActuallyChange:boolean) {
        if (this.state === DNodeState.READY)
            return;
        this.state = DNodeState.READY;
        this.notifyObservers(didTheValueActuallyChange);
        Scheduler.scheduleReady();
    }

    notifyObservers(didTheValueActuallyChange:boolean=false) {
        var os = this.observers;
        // change to 'for loop, reverse, pre-decrement', https://jsperf.com/for-vs-foreach/32
        for(var i = os.length -1; i >= 0; i--) {
            var o = os[i];
            if (o)
                o.notifyStateChange(this, didTheValueActuallyChange);
        }
    }

    // optimization: replace this check with an 'unstableDependenciesCounter'.
    areAllDependenciesAreStable() {
        var obs = this.observing, l = obs.length;
        for(var i = 0; i < l; i++)
            if (obs[i].state !== DNodeState.READY)
                return false;
        return true;
    }

    tryToSleep() {
        if (this.isComputed && this.getRefCount() === 0 && !this.isSleeping) {
            for (var i = 0, l = this.observing.length; i < l; i++)
                this.observing[i].removeObserver(this);
            this.observing = [];
            this.isSleeping = true;
        }
    }

    wakeUp() {
        if (this.isSleeping && this.isComputed) {
            this.isSleeping = false;
            this.state = DNodeState.PENDING;
            this.computeNextValue();
        }
    }

    notifyStateChange(observable:DNode, didTheValueActuallyChange:boolean) {
        switch(this.state) {
            case DNodeState.STALE:
                if (observable.state === DNodeState.READY && didTheValueActuallyChange)
                    this.dependencyChangeCount += 1;
                // The observable has become stable, and all others are stable as well, we can compute now!
                if (observable.state === DNodeState.READY && this.areAllDependenciesAreStable()) {
                    // did any of the observables really change?
                    this.state = DNodeState.PENDING;
                    Scheduler.schedule(() => {
                        if (this.dependencyChangeCount > 0)
                            this.computeNextValue();
                        else
                            // we're done, but didn't change, lets make sure verybody knows..
                            this.markReady(false);
                        this.dependencyChangeCount = 0;
                    });
                }
                break;
            case DNodeState.PENDING:
                // If computations are asynchronous, new updates might come in during processing,
                // and it is impossible to determine whether these new values will be taken into consideration
                // during the async process or not. So to ensure everything is concistent, probably a new computation
                // should be scheduled immediately after the current one is done..

                // However, for now the model is that all computations are synchronous, so if computing, a calc is already
                // scheduled but not running yet, so we're fine here
                break;
            case DNodeState.READY:
                if (observable.state === DNodeState.STALE)
                    this.markStale();
                break;
        }
    }

    // TODO: rename to computeNextState
    computeNextValue() {
        // possible optimization: compute is only needed if there are subscribers or observers (that have subscribers)
        // otherwise, computation and further (recursive markStale / markReady) could be delayed
        this.trackDependencies();
        var valueDidChange = this.compute();
        this.bindDependencies();
        this.markReady(valueDidChange);
    }

    // TODO: rename to onDependenciesStable
    compute():boolean {
        return false; // false == unchanged
    }

    /*
        Dependency detection
    */
    static trackingStack:DNode[][] = []

    private trackDependencies() {
        this.prevObserving = this.observing;
        DNode.trackingStack[DNode.trackingStack.length] = [];
    }

    private bindDependencies() {
        this.observing = DNode.trackingStack.pop();

        /* TODO:
        if (this.isComputed && this.observing.length === 0 && !this.isDisposed)
            this.log("You have created a function that doesn't observe any values, did you forget to make its dependencies observable?");
        */

        var changes = quickDiff(this.observing, this.prevObserving);
        var added = changes[0];
        var removed = changes[1];
        this.prevObserving = null;

        for(var i = 0, l = removed.length; i < l; i++)
            removed[i].removeObserver(this);

        this.hasCycle = false;
        for(var i = 0, l = added.length; i < l; i++) {
            if (this.isComputed && added[i].findCycle(this)) {
                this.hasCycle = true;
                this.observing.splice(this.observing.indexOf(added[i]), 1); // don't observe anything that caused a cycle!
                // TODO:somehow, we would like to signal 'added[i]' that it is part of a cycle as well?
            }
            else
                added[i].addObserver(this);
        }

    }

    public notifyObserved() {
        var ts = DNode.trackingStack, l = ts.length;
        if (l) {
            var cs = ts[l -1], csl = cs.length;
            // this last item added check is an optimization especially for array loops,
            // because an array.length read with subsequent reads from the array
            // might trigger many observed events, while just checking the last added item is cheap
            if (cs[csl -1] !== this && cs[csl -2] !== this)
                cs[csl] = this;
        }
    }

    private findCycle(node:DNode) {
        if (this.observing.indexOf(node) !== -1)
            return true;
        for(var l = this.observing.length, i=0; i<l; i++)
            if (this.observing[i].findCycle(node))
                return true;
        return false;
    }

    public dispose() {
        for(var l=this.observing.length, i=0; i<l; i++)
            this.observing[i].removeObserver(this);
        this.observing = [];
        this.observers = [];
        this.isDisposed = true;
        // TODO: if there are observers, throw warning!
    }
}

//TODO: trick type system
//ObservableArray.prototype = []; // makes, observableArray instanceof Array === true, but not typeof or Array.isArray..
//y.__proto__ = Array.prototype
//x.prototype.toString = function(){ return "[object Array]" }
//even monky patch Array.isArray?


class ObservableArray<T> implements Array<T> {
    [n: number]: T;
    length: number;

    private _values: T[];
    private dependencyState:DNode;
    private changeEvent: SimpleEventEmitter;

    constructor(initialValues?:T[]) {
        // make for .. in / Object.keys behave like an array:
        Object.defineProperty(this, "length", {
            enumerable: false,
            get: function() {
                this.dependencyState.notifyObserved();
                return this._values.length;
            },
            set: function(newLength:number) {
                // TODO: type & range check
                var currentLength = this._values.length;
                if (newLength === currentLength)
                    return;

                // grow
                if (newLength > currentLength)
                    this.spliceWithArray(currentLength, 0, new Array<T>(newLength - currentLength));

                // shrink
                else if (newLength < currentLength)
                    this.splice(newLength, currentLength - newLength);
            }
        });
        Object.defineProperty(this, "dependencyState", { enumerable: false, value: new DNode(false) });
        Object.defineProperty(this, "_values", { enumerable: false, value: [] });
        Object.defineProperty(this, "changeEvent", { enumerable: false, value: new SimpleEventEmitter() });

        if (initialValues && initialValues.length)
            this.spliceWithArray(0, 0, initialValues);
        else
            this.createNewStubEntry(0);
    }

    // and adds / removes the necessary numeric properties to this object
    // does not alter this._values itself
    private updateLength(oldLength:number, delta:number) {
        if (delta < 0) {
            for(var i = oldLength + delta + 1; i < oldLength; i++)
                delete this[i];
        }
        else if (delta > 0) {
            for (var i = 0; i < delta; i++)
                this.createNewEntry(oldLength + i);
        }
        else
            return;
        this.createNewStubEntry(oldLength + delta);
    }

    private createNewEntry(index: number) {
        Object.defineProperty(this, "" + index, {
            enumerable: true,
            configurable: true,
            set: (value) => {
                var oldValue = this._values[index];
                if (oldValue !== value) {
                    this._values[index] = value;
                    this.notifyChildUpdate(index, oldValue);
                }
            },
            get: () => {
                this.dependencyState.notifyObserved();
                return this._values[index];
            }
        })
    }

    private createNewStubEntry(index: number) {
        Object.defineProperty(this, "" + index, {
            enumerable: false,
            configurable: true,
            set: (value) => this.push(value),
            get: () => undefined
        });
    }

    spliceWithArray(index:number, deleteCount?:number, newItems?:T[]):T[] {
        var length = this._values.length;
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

        var lengthDelta = newItems.length - deleteCount;
        var res:T[] = Array.prototype.splice.apply(this._values, [<any>index, deleteCount].concat(newItems));
        this.updateLength(length, lengthDelta); // create or remove new entries

        this.notifySplice(index, res, newItems);
        return res;
    }

    private notifyChildUpdate(index:number, oldValue:T) {
        this.notifyChanged();
        // conform: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe
        this.changeEvent.emit({ object: this, type: 'update', index: index, oldValue: oldValue});
    }

    private notifySplice(index:number, deleted:T[], added:T[]) {
        if (deleted.length === 0 && added.length === 0)
            return;
        this.notifyChanged();
        // conform: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe
        this.changeEvent.emit({ object: this, type: 'splice', index: index, addedCount: added.length, removed: deleted});
    }

    private notifyChanged() {
        this.dependencyState.markStale();
        this.dependencyState.markReady(true);
    }

    observe(listener:(data)=>void, fireImmediately=false):Lambda {
        if (fireImmediately)
            listener({ object: this, type: 'splice', index: 0, addedCount: this._values.length, removed: []});

        return this.changeEvent.on(listener);
    }

    clear(): T[] {
        return this.splice(0);
    }

    replace(newItems:T[]) {
        return this.spliceWithArray(0, this._values.length, newItems);
    }

    values(): T[] {
        return this._values.slice();
    }

    toJSON(): T[] {
        return this._values.slice();
    }

    /*
        ES7 goodies
     */
    // observe(callaback) https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe
    // https://github.com/arv/ecmascript-object-observe

    /*
        functions that do alter the internal structure of the array, from lib.es6.d.ts
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
        // don't use the property internally
        this.spliceWithArray(this._values.length, 0, items);
        return this._values.length;
    }
    pop(): T {
        return this.splice(Math.max(this._values.length - 1, 0), 1)[0];
    }
    shift(): T {
        return this.splice(0, 1)[0]
    }
    unshift(...items: T[]): number {
        this.spliceWithArray(0, 0, items);
        return this._values.length;
    }

    /*
        functions that do not alter the array, from lib.es6.d.ts
    */
    toString():string { return this.wrapReadFunction<string>("toString", arguments); }
    toLocaleString():string { return this.wrapReadFunction<string>("toLocaleString", arguments); }
    concat<U extends T[]>(...items: U[]): T[] { return this.wrapReadFunction<T[]>("concat", arguments); }
    join(separator?: string): string { return this.wrapReadFunction<string>("join", arguments); }
    reverse():T[] { return this.wrapReadFunction<T[]>("reverse", arguments); }
    slice(start?: number, end?: number): T[] { return this.wrapReadFunction<T[]>("slice", arguments); }
    sort(compareFn?: (a: T, b: T) => number): T[] { return this.wrapReadFunction<T[]>("sort", arguments); }
    indexOf(searchElement: T, fromIndex?: number): number { return this.wrapReadFunction<number>("indexOf", arguments); }
    lastIndexOf(searchElement: T, fromIndex?: number): number { return this.wrapReadFunction<number>("lastIndexOf", arguments); }
    every(callbackfn: (value: T, index: number, array: T[]) => boolean, thisArg?: any): boolean { return this.wrapReadFunction<boolean>("every", arguments); }
    some(callbackfn: (value: T, index: number, array: T[]) => boolean, thisArg?: any): boolean { return this.wrapReadFunction<boolean>("some", arguments); }
    forEach(callbackfn: (value: T, index: number, array: T[]) => void, thisArg?: any): void { return this.wrapReadFunction<void>("forEach", arguments); }
    map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[] { return this.wrapReadFunction<U[]>("map", arguments); }
    filter(callbackfn: (value: T, index: number, array: T[]) => boolean, thisArg?: any): T[] { return this.wrapReadFunction<T[]>("filter", arguments); }
    reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U { return this.wrapReadFunction<U>("reduce", arguments); }
    reduceRight<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U { return this.wrapReadFunction<U>("reduceRight", arguments); }

    private wrapReadFunction<U>(funcName:string, args:IArguments):U {
        var baseFunc = Array.prototype[funcName];
        // generate a new function that wraps arround the Array.prototype, and replace our own definition
        ObservableArray.prototype[funcName] = function() {
            this.dependencyState.notifyObserved();
            return baseFunc.apply(this._values, arguments);
        }
        return this[funcName].apply(this, args);
    }
}




class SimpleEventEmitter {
    listeners:{(data?):void}[] = [];

    emit(...data:any[]);
    emit() {
        var listeners = this.listeners.slice();
        var l = listeners.length;
        switch (arguments.length) {
            case 0:
                for(var i = 0; i < l; i++)
                    listeners[i]();
                break;
            case 1:
                var data = arguments[0];
                for(var i = 0; i < l; i++)
                    listeners[i](data);
                break;
            default:
                for(var i = 0; i < l; i++)
                    listeners[i].apply(undefined, arguments);
        }
    }

    on(listener:(...data:any[])=>void):Lambda {
        var disposed = false;
        this.listeners.push(listener);
        return () => {
            if (disposed)
                return;
            disposed = true;
            var idx = this.listeners.indexOf(listener);
            if (idx !== -1)
                this.listeners.splice(idx, 1);
        }
    }

    once(listener:(...data:any[])=>void):Lambda {
        var subscription = this.on(function() {
            subscription();
            listener.apply(arguments);
        });
        return subscription;
    }
}
mobservableStatic.SimpleEventEmitter = SimpleEventEmitter;

class Scheduler {
    private static readyEvent = new SimpleEventEmitter();
    private static inBatch = 0;
    private static tasks:{():void}[] = [];

    public static schedule(func:Lambda) {
        if (Scheduler.inBatch < 1) {
            func(); // func is allowed to throw, it will not affect any internal state
        }
        else
            Scheduler.tasks[Scheduler.tasks.length] = func;
    }

    private static runPostBatch() {
        var i = 0;
        try { // try is expensive, move it out of the while
            for(i = 0; i < Scheduler.tasks.length; i++)
                Scheduler.tasks[i]();
            Scheduler.tasks = [];
        }
        catch (e) {
            console && console.error("Failed to run scheduled action, the action has been dropped from the queue: " + e, e);
            // drop already executed tasks, including the failing one, and retry in the future
            Scheduler.tasks.splice(0, i + 1);
            setTimeout(() => Scheduler.runPostBatch(), 1);
            // rethrow
            throw e;
        }
    }

    static batch(action:Lambda) {
        Scheduler.inBatch += 1;
        try {
            action();
        } finally {
            Scheduler.inBatch -= 1;
            if (Scheduler.inBatch === 0) {
                Scheduler.runPostBatch();
                Scheduler.scheduleReady();
            }
        }
    }

    private static pendingReady = false;

    static scheduleReady() {
        if (!Scheduler.pendingReady) {
            Scheduler.pendingReady = true;
            setTimeout(()=> {
                Scheduler.pendingReady = false;
                Scheduler.readyEvent.emit();
            }, 1);
        }
    }

    static onReady(listener:Lambda) {
        return Scheduler.readyEvent.on(listener);
    }

    static onceReady(listener:Lambda) {
        return Scheduler.readyEvent.once(listener);
    }
}

/**
 * Given a new and an old list, tries to determine which items are added or removed
 * in linear time. The algorithm is heuristic and does not give the optimal results in all cases.
 * (For example, [a,b] -> [b, a] yiels [[b,a],[a,b]])
 * its basic assumptions is that the difference between base and current are a few splices.
 *
 * returns a tuple<addedItems, removedItems>
 * @type {T[]}
 */
function quickDiff<T>(current:T[], base:T[]):[T[],T[]] {
    if (!base.length)
        return [current, []];
    if (!current.length)
        return [[], base];

    var added:T[] = [];
    var removed:T[] = [];

    var    currentIndex = 0,
        currentSearch = 0,
        currentLength = current.length,
        currentExhausted = false,
        baseIndex = 0,
        baseSearch = 0,
        baseLength = base.length,
        isSearching = false,
        baseExhausted = false;

    while (!baseExhausted && !currentExhausted) {
        if (!isSearching) {
            // within rang and still the same
            if (currentIndex < currentLength && baseIndex < baseLength && current[currentIndex] === base[baseIndex]) {
                currentIndex++;
                baseIndex++;
                // early exit; ends where equal
                if (currentIndex === currentLength && baseIndex === baseLength)
                    return [added, removed];
                continue;
            }
            currentSearch = currentIndex;
            baseSearch = baseIndex;
            isSearching = true;
        }
        baseSearch += 1;
        currentSearch += 1;
        if (baseSearch >= baseLength)
            baseExhausted = true;
        if (currentSearch >= currentLength)
            currentExhausted = true;

        if (!currentExhausted && current[currentSearch] === base[baseIndex]) {
            // items where added
            added.push.apply(added, current.slice(currentIndex, currentSearch));
            currentIndex = currentSearch +1;
            baseIndex ++;
            isSearching = false;
        }
        else if (!baseExhausted && base[baseSearch] === current[currentIndex]) {
            // items where removed
            removed.push.apply(removed, base.slice(baseIndex, baseSearch));
            baseIndex = baseSearch +1;
            currentIndex ++;
            isSearching = false;
        }
    }

    added.push.apply(added, current.slice(currentIndex));
    removed.push.apply(removed, base.slice(baseIndex));
    return [added, removed];
}

// For testing purposes only;
(<any>mobservableStatic).quickDiff = quickDiff;
(<any>mobservableStatic).stackDepth = () => DNode.trackingStack.length;

function warn(message) {
    if (console)
        console.warn("[WARNING:mobservable] " + message);
}

/**
    Makes sure that the provided function is invoked at most once.
*/
function once(func: Lambda):Lambda {
    var invoked = false;
    return function() {
        if (invoked)
            return;
        invoked = true;
        return func.apply(this, arguments);
    }
}

export = mobservableStatic;
