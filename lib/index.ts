/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */

interface IMObservableStatic {
    // ways of creating observables. 
    <T>(value?:T[]):Mobservable.IObservableArray<T>;
    <T>(value?:T|{():T}, scope?:Object):Mobservable.IObservableValue<T>;
    
    value<T>(value?:T[]):Mobservable.IObservableArray<T>;
    value<T>(value?:T|{():T}, scope?:Object):Mobservable.IObservableValue<T>;
    
    array<T>(values?:T[]):Mobservable.IObservableArray<T>;
    primitive<T>(value?:T):Mobservable.IObservableValue<T>;
    reference<T>(value?:T):Mobservable.IObservableValue<T>;
    computed<T>(func:()=>T,scope?):Mobservable.IObservableValue<T>;
    expr<T>(expr:()=>T,scope?):T;
    sideEffect(func:Mobservable.Lambda,scope?):Mobservable.Lambda;

    // create observable properties
    props(object:Object, name:string, initalValue: any);
    props(object:Object, props:Object);
    props(object:Object);
    fromJson<T>(value:T):T;
    observable(target:Object, key:string); // annotation

    // convert observables to not observables
    toJson<T>(value:T):T;
    toPlainValue<T>(any:T):T;
    
    // observe observables
    observeProperty(object:Object, key:string, listener:Function, invokeImmediately?:boolean):Mobservable.Lambda;
    watch<T>(func:()=>T, onInvalidate:Mobservable.Lambda):[T,Mobservable.Lambda];
    
    // change a lot of observables at once
    batch<T>(action:()=>T):T;

    // Utils
    debugLevel: number;
    SimpleEventEmitter: new()=> Mobservable.ISimpleEventEmitter;
    
    ObserverMixin: {
        componentWillMount();
        componentWillUnmount();
        shouldComponentUpdate(nextProps, nextState);
    };
    ObservingComponent<T>(componentClass:T):T;
}

declare module Mobservable {
    
    interface Lambda {
        ():void;
    }
    
    interface IObservable {
        observe(callback:(...args:any[])=>void, fireImmediately?:boolean):Lambda;
    }
    
    interface IObservableValue<T> extends IObservable {
        ():T;
        (value:T);
        observe(callback:(newValue:T, oldValue:T)=>void, fireImmediately?:boolean):Lambda;
    }
    
    interface IObservableArray<T> extends IObservable, Array<T> {
        spliceWithArray(index:number, deleteCount?:number, newItems?:T[]):T[];
        observe(listener:(changeData:IArrayChange<T>|IArraySplice<T>)=>void, fireImmediately?:boolean):Lambda;
        clear(): T[];
        replace(newItems:T[]);
        values(): T[];
        clone(): IObservableArray<T>;
        find(predicate:(item:T,index:number,array:IObservableArray<T>)=>boolean,thisArg?,fromIndex?:number):T;
        remove(value:T):boolean;
    }
    
    interface IArrayChange<T> {
        type: string; // Always: 'update'
        object: IObservableArray<T>;
        index: number;
        oldValue: T;
    }
    
    interface IArraySplice<T> {
        type: string; // Always: 'splice'
        object: IObservableArray<T>;
        index: number;
        removed: T[];
        addedCount: number;
    }
    
    interface ISimpleEventEmitter {
        emit(...data:any[]):void;
        on(listener:(...data:any[])=>void):Lambda;
        once(listener:(...data:any[])=>void):Lambda;
    }
}

/* END OF DECLARATION */

type Lambda = Mobservable.Lambda;

module mobservable { // wrap in module for UMD export, see end of the file

function createObservable<T>(value:T[]):Mobservable.IObservableArray<T>;
function createObservable<T>(value?:T|{():T}, scope?:Object):Mobservable.IObservableValue<T>;
function createObservable(value?, scope?:Object):any {
    if (Array.isArray(value))
        return new ObservableArray(value);
    if (typeof value === "function")
        return m.computed(value, scope);
    return m.primitive(value);
}

export var m:IMObservableStatic = <IMObservableStatic> function(value, scope?) {
    return createObservable(value,scope);
};

m.value = createObservable;

m.primitive = m.reference = function(value?) {
    return new ObservableValue(value).createGetterSetter();
}

m.computed = function<T>(func:()=>void, scope?) {
    return new ComputedObservable(func, scope).createGetterSetter();
}

m.expr = function<T>(expr:()=>void, scope?) {
    if (DNode.trackingStack.length === 0)
        throw new Error("mobservable.expr can only be used inside a computed observable. Probably mobservable.computed should be used instead of .expr");
    return new ComputedObservable(expr, scope).get();
}

m.sideEffect = function(func:Lambda, scope?):Lambda {
    return m.computed(func, scope).observe(noop);
}

m.array = function array<T>(values?:T[]): ObservableArray<T> {
    return new ObservableArray(values);
}

m.props = function props(target, props?, value?) {
    switch(arguments.length) {
        case 0:
            throw new Error("Not enough arguments");
        case 1:
            return m.props(target, target); // mix target properties into itself
        case 2:
            for(var key in props)
                m.props(target, key, props[key]);
            break;
        case 3:
            var isArray = Array.isArray(value);
            var observable = m.value(value, target);
            Object.defineProperty(target, props, {
                get: isArray 
                    ? function() { return observable; } 
                    : observable,
                set: isArray 
                    ? function(newValue) { (<Mobservable.IObservableArray<any>><any>observable).replace(newValue) } 
                    : observable,
                enumerable: true,
                configurable: false
            });
            break;
    }
    return target;
}

m.fromJson = function fromJson(source) {
    function convertValue(value) {
        if (!value)
            return value;
        if (typeof value === "object") // array or object
            return fromJson(value);
        return value;
    }

    if (source) {
        if (Array.isArray(source))
            return m.array(source.map(convertValue));
        if (typeof source === "object") {
            var props = {};
            for(var key in source) if (source.hasOwnProperty(key))
                props[key] = convertValue(source[key]);
            return m.props(props);
        }
    }
    throw new Error(`mobservable.fromJson expects object or array, got: '${source}'`);
}

m.toJson = function toJson(source) {
    if (!source)
        return source;
    if (Array.isArray(source) || source instanceof ObservableArray)
        return source.map(toJson);
    if (typeof source === "object") {
        var res = {};
        for (var key in source) if (source.hasOwnProperty(key))
            res[key] = toJson(source[key]);
        return res;
    }
    return source;
}

/**
 * Use this annotation to wrap properties of an object in an observable, for example:
 * class OrderLine {
 *   @observable amount = 3;
 *   @observable price = 2;
 *   @observable total() {
 *      return this.amount * this.price;
 *   }
 * }
 */
m.observable = function observable(target:Object, key:string, descriptor?) {
    var baseValue = descriptor ? descriptor.value : null;
    // observable annotations are invoked on the prototype, not on actual instances,
    // so upon invocation, determine the 'this' instance, and define a property on the
    // instance as well (that hides the propotype property)
    if (typeof baseValue === "function") {
        delete descriptor.value;
        delete descriptor.writable;
        descriptor.configurable = true;
        descriptor.get = function() {
            var observable = this.key = m.computed(baseValue, this);
            return observable;
        };
        descriptor.set = function () {
            console.trace();
            throw new Error("It is not allowed to reassign observable functions");
        };
    } else {
        Object.defineProperty(target, key, {
            configurable: true, enumberable:true,
            get: function() {
                m.props(this, key, undefined);
                return this[key];
            },
            set: function(value) {
                m.props(this, key, value);
            }
        });
    }
}

/**
 * Inverse function of `props` and `array`, given an (observable) array, returns a plain,
 * non observable version. (non recursive), or given an object with observable properties, returns a clone
 * object with plain properties.
 *
 * Any other value will be returned as is.
 */
m.toPlainValue = function toPlainValue(value:any):any {
    if (value) {
        if (value instanceof Array)
            return value.slice();
        else if (value instanceof ObservableValue)
            return value.get();
        else if (typeof value === "function" && value.impl) {
            if (value.impl instanceof ObservableValue)
                return value()
            else if (value.impl instanceof ObservableArray)
                return value().slice();
        }            
        else if (typeof value === "object") {
            var res = {};
            for (var key in value)
                res[key] = toPlainValue(value[key]);
            return res;
        }
    }
    return value;
}

/**
    Can be used to observe observable properties that are created using the `observable` annotation,
    `defineObservableProperty` or `initializeObservableProperties`.
    (Since properties do not expose an .observe method themselves).
*/ 
m.observeProperty = function observeProperty(object:Object, key:string, listener:(...args:any[])=>void, invokeImmediately = false):Lambda {
    if (!object)
        throw new Error(`Cannot observe property of '${object}'`);
    if (!(key in object))
        throw new Error(`Object '${object}' has no property '${key}'.`);
    if (!listener || typeof listener !== "function")
        throw new Error("Third argument to mobservable.observeProperty should be a function");

    // wrap with observable function
    var observer = new ComputedObservable((() => object[key]), object);
    var disposer = observer.observe(listener, invokeImmediately);

    if ((<any>observer).dependencyState.observing.length === 0)
        throw new Error(`mobservable.observeProperty: property '${key}' of '${object} doesn't seem to be observable. Did you define it as observable using @observable or mobservable.props? You might try to use the .observe() method instead.`);

    return once(() => {
        disposer();
        (<any>observer).dependencyState.dispose(); // clean up
    });
}

/**
    Evaluates func and return its results. Watch tracks all observables that are used by 'func'
    and invokes 'onValidate' whenever func *should* update.
    Returns  a tuplde [return value of func, disposer]. The disposer can be used to abort the watch early.
*/
m.watch = function watch<T>(func:()=>T, onInvalidate:Lambda):[T,Lambda] {
    var watch = new WatchedExpression(func, onInvalidate);
    return [watch.value, () => watch.dispose()];
}

m.batch = function batch<T>(action:()=>T):T {
    return Scheduler.batch(action);
}

m.debugLevel = 0;

class ObservableValue<T> {
    protected changeEvent = new SimpleEventEmitter();
    protected dependencyState:DNode = new DNode(this);

    constructor(protected _value?:T){
    }

    set(value:T) {
        if (value !== this._value) {
            var oldValue = this._value;
            this.dependencyState.markStale();
            this._value = value;
            this.dependencyState.markReady(true);
            this.changeEvent.emit(value, oldValue);
        }
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
    
    createGetterSetter():Mobservable.IObservableValue<T> {
        var self = this;
        var f:any = function(value?) {
            if (arguments.length > 0)
                self.set(value);
            else
                return self.get();
        };
        f.impl = this;
        f.observe = function(listener, fire) {
            return self.observe(listener, fire);
        }
        f.toString = function() {
            return self.toString();
        }
        return f;
    }

    toString() {
        return `Observable[${this._value}]`;
    }
}

class ComputedObservable<U> extends ObservableValue<U> {
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
            if (m.debugLevel) {
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
class WatchedExpression<T> {
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

enum DNodeState {
    STALE,     // One or more depencies have changed but their values are not yet known, current value is stale
    PENDING,   // All dependencies are up to date again, a recalculation of this node is ongoing or pending, current value is stale
    READY,     // Everything is bright and shiny
};

/**
 * A Node in the dependency graph of a (computed)observable.
 *
 * observing: nodes that are needed for this DNode to operate
 * observers: nodes that need this node to operate
 */
class DNode {
    static trackingStack: DNode[][] = [];  // stack of: list of DNode's being observed by the currently ongoing computation

    state: DNodeState = DNodeState.READY;
    isSleeping = true; // isSleeping: nobody is observing this dependency node, so don't bother tracking DNode's this DNode depends on
    hasCycle = false;  // this node is part of a cycle, which is an error
    private observing: DNode[] = [];       // nodes we are looking at. Our value depends on these nodes
    private prevObserving: DNode[] = null; // nodes we were looking at before. Used to determine changes in the dependency tree
    private observers: DNode[] = [];       // nodes that are dependent on this node. Will be notified when our state change
    private dependencyChangeCount = 0;     // nr of nodes being observed that have received a new value. If > 0, we should recompute
    private dependencyStaleCount = 0;      // nr of nodes being observed that are currently not ready
    private isDisposed = false;            // ready to be garbage collected. Nobody is observing or ever will observe us
    private externalRefenceCount = 0;      // nr of 'things' that depend on us, excluding other DNode's. If > 0, this node will not go to sleep
    public isComputed:boolean;;    // isComputed indicates that this node can depend on others, and should update when dependencies change

    constructor(private owner:{compute?:()=>boolean}) {
        this.isComputed = owner.compute !== undefined;
    }

    setRefCount(delta:number) {
        var rc = this.externalRefenceCount += delta;
        if (rc === 0)
            this.tryToSleep();
        else if (rc === delta) // a.k.a. rc was zero.
            this.wakeUp();
    }

    addObserver(node:DNode) {
        this.observers[this.observers.length] = node;
    }

    removeObserver(node:DNode) {
        var obs = this.observers, idx = obs.indexOf(node);
        if (idx !== -1) {
            obs.splice(idx, 1);
            if (obs.length === 0)
                this.tryToSleep();
        }
    }

    markStale() {
        if (this.state !== DNodeState.READY)
            return; // stale or pending; recalculation already scheduled, we're fine..
        this.state = DNodeState.STALE;
        this.notifyObservers();
    }

    markReady(stateDidActuallyChange:boolean) {
        if (this.state === DNodeState.READY)
            return;
        this.state = DNodeState.READY;
        this.notifyObservers(stateDidActuallyChange);
    }

    notifyObservers(stateDidActuallyChange:boolean=false) {
        var os = this.observers.slice();
        for(var l = os.length, i = 0; i < l; i++)
            os[i].notifyStateChange(this, stateDidActuallyChange);
    }

    tryToSleep() {
        if (!this.isSleeping && this.isComputed && this.observers.length === 0 && this.externalRefenceCount === 0) {
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
            this.computeNextState();
        }
    }

    // the state of something we are observing has changed..
    notifyStateChange(observable:DNode, stateDidActuallyChange:boolean) {
        if (observable.state === DNodeState.STALE) {
            if (++this.dependencyStaleCount === 1)
                this.markStale();
        } else { // not stale, thus ready since pending states are not propagated
            if (stateDidActuallyChange)
                this.dependencyChangeCount += 1;
            if (--this.dependencyStaleCount === 0) { // all dependencies are ready
                this.state = DNodeState.PENDING;
                Scheduler.schedule(() => {
                    // did any of the observables really change?
                    if (this.dependencyChangeCount > 0)
                        this.computeNextState();
                    else
                        // we're done, but didn't change, lets make sure verybody knows..
                        this.markReady(false);
                    this.dependencyChangeCount = 0;
                });
            }
        }
    }

    computeNextState() {
        this.trackDependencies();
        var stateDidChange = this.owner.compute();
        this.bindDependencies();
        this.markReady(stateDidChange);
    }

    private trackDependencies() {
        this.prevObserving = this.observing;
        DNode.trackingStack[DNode.trackingStack.length] = [];
    }

    private bindDependencies() {
        this.observing = DNode.trackingStack.pop();

        if (this.isComputed && this.observing.length === 0 && m.debugLevel > 1 && !this.isDisposed) {
            console.trace();
            warn("You have created a function that doesn't observe any values, did you forget to make its dependencies observable?");
        }

        var [added, removed] = quickDiff(this.observing, this.prevObserving);
        this.prevObserving = null;

        for(var i = 0, l = removed.length; i < l; i++)
            removed[i].removeObserver(this);

        this.hasCycle = false;
        for(var i = 0, l = added.length; i < l; i++) {
            if (this.isComputed && added[i].findCycle(this)) {
                this.hasCycle = true;
                // don't observe anything that caused a cycle, or we are stuck forever!
                this.observing.splice(this.observing.indexOf(added[i]), 1);
                added[i].hasCycle = true; // for completeness sake..
            } else {
                added[i].addObserver(this);
            }
        }
    }

    public notifyObserved() {
        var ts = DNode.trackingStack, l = ts.length;
        if (l > 0) {
            var cs = ts[l - 1], csl = cs.length;
            // this last item added check is an optimization especially for array loops,
            // because an array.length read with subsequent reads from the array
            // might trigger many observed events, while just checking the last added item is cheap
            if (cs[csl -1] !== this && cs[csl -2] !== this)
                cs[csl] = this;
        }
    }

    private findCycle(node:DNode) {
        var obs = this.observing;
        if (obs.indexOf(node) !== -1)
            return true;
        for(var l = obs.length, i = 0; i < l; i++)
            if (obs[i].findCycle(node))
                return true;
        return false;
    }

    public dispose() {
        if (this.observers.length)
            throw new Error("Cannot dispose DNode; it is still being observed");
        if (this.observing) for(var l=this.observing.length, i=0; i<l; i++)
            this.observing[i].removeObserver(this);
        this.observing = null;
        this.isDisposed = true;
    }
}

// Workaround to make sure ObservableArray extends Array
class StubArray {
}
StubArray.prototype = [];

class ObservableArray<T> extends StubArray implements Mobservable.IObservableArray<T> {
    [n: number]: T;

    private _values: T[];
    private dependencyState:DNode;
    private changeEvent: SimpleEventEmitter;

    constructor(initialValues?:T[]) {
        super();
        // make for .. in / Object.keys behave like an array, so hide the other properties
        Object.defineProperties(this, {
            "dependencyState" : { enumerable: false, value: new DNode(this) },
            "_values" : { enumerable: false, value: initialValues ? initialValues.slice() : [] },
            "changeEvent" : { enumerable: false, value: new SimpleEventEmitter() }
        });
        if (initialValues && initialValues.length)
            this.updateLength(0, initialValues.length);
    }

    get length():number {
        this.dependencyState.notifyObserved();
        return this._values.length;
    }

    set length(newLength:number) {
        if (typeof newLength !== "number" || newLength < 0)
            throw new Error("Out of range: " + newLength);
        var currentLength = this._values.length;
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
            if (oldLength + delta > ObservableArray.OBSERVABLE_ARRAY_BUFFER_SIZE)
                ObservableArray.reserveArrayBuffer(oldLength + delta);
            // funny enough, this is faster than slicing ENUMERABLE_PROPS into defineProperties, and faster as a temporarily map
            for (var i = oldLength, end = oldLength + delta; i < end; i++)
                Object.defineProperty(this, "" + i, ObservableArray.ENUMERABLE_PROPS[i])
        }
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
        var res:T[] = this._values.splice(index, deleteCount, ...newItems);
        this.updateLength(length, lengthDelta); // create or remove new entries

        this.notifySplice(index, res, newItems);
        return res;
    }

    private notifyChildUpdate(index:number, oldValue:T) {
        this.notifyChanged();
        // conform: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe
        this.changeEvent.emit(<Mobservable.IArrayChange<T>>{ object: this, type: 'update', index: index, oldValue: oldValue});
    }

    private notifySplice(index:number, deleted:T[], added:T[]) {
        if (deleted.length === 0 && added.length === 0)
            return;
        this.notifyChanged();
        // conform: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe
        this.changeEvent.emit(<Mobservable.IArraySplice<T>>{ object: this, type: 'splice', index: index, addedCount: added.length, removed: deleted});
    }

    private notifyChanged() {
        this.dependencyState.markStale();
        this.dependencyState.markReady(true);
    }

    observe(listener:(changeData:Mobservable.IArrayChange<T>|Mobservable.IArraySplice<T>)=>void, fireImmediately=false):Lambda {
        if (fireImmediately)
            listener(<Mobservable.IArraySplice<T>>{ object: this, type: 'splice', index: 0, addedCount: this._values.length, removed: []});
        return this.changeEvent.on(listener);
    }

    clear(): T[] {
        return this.splice(0);
    }

    replace(newItems:T[]) {
        return this.spliceWithArray(0, this._values.length, newItems);
    }

    values(): T[] {
        this.dependencyState.notifyObserved();
        return this._values.slice();
    }

    toJSON(): T[] {
        this.dependencyState.notifyObserved();
        return this._values.slice();
    }

    clone(): ObservableArray<T> {
        this.dependencyState.notifyObserved();
        return new ObservableArray<T>(this._values);
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
    find(predicate:(item:T,index:number,array:ObservableArray<T>)=>boolean, thisArg?, fromIndex=0):T {
        this.dependencyState.notifyObserved();
        var items = this._values, l = items.length;
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
        this.spliceWithArray(this._values.length, 0, items);
        return this._values.length;
    }

    pop(): T {
        this.sideEffectWarning("pop");
        return this.splice(Math.max(this._values.length - 1, 0), 1)[0];
    }

    shift(): T {
        this.sideEffectWarning("shift");
        return this.splice(0, 1)[0]
    }

    unshift(...items: T[]): number {
        this.sideEffectWarning("unshift");
        this.spliceWithArray(0, 0, items);
        return this._values.length;
    }

    reverse():T[] {
        this.sideEffectWarning("reverse");
        return this.replace(this._values.reverse());
    }

    sort(compareFn?: (a: T, b: T) => number): T[] {
        this.sideEffectWarning("sort");
        return this.replace(this._values.sort.apply(this._values, arguments));
    }

    remove(value:T):boolean {
        this.sideEffectWarning("remove");
        var idx = this._values.indexOf(value);
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
            this.dependencyState.notifyObserved();
            return baseFunc.apply(this._values, arguments);
        }).apply(this, initialArgs);
    }

    private sideEffectWarning(funcName:string) {
        if (m.debugLevel > 0 && DNode.trackingStack.length > 0)
            warn(`[Mobservable.Array] The method array.${funcName} should probably not be used inside observable functions since it has side-effects`);
    }
    
    static OBSERVABLE_ARRAY_BUFFER_SIZE = 0;
    static ENUMERABLE_PROPS = [];

    static createArrayBufferItem(index:number) {
        var prop = {
            enumerable: false,
            configurable: false,
            set: function(value) {
                if (index < this._values.length) {
                    var oldValue = this._values[index];
                    if (oldValue !== value) {
                        this._values[index] = value;
                        this.notifyChildUpdate(index, oldValue);
                    }
                }
                else if (index === this._values.length)
                    this.push(value);
                else
                    throw new Error(`ObservableArray: Index out of bounds, ${index} is larger than ${this.values.length}`);
            },
            get: function() {
                if (index < this._values.length) {
                    this.dependencyState.notifyObserved();
                    return this._values[index];
                }
                return undefined;
            }
        };
        Object.defineProperty(ObservableArray.prototype, "" + index, prop);
        prop.enumerable = true;
        prop.configurable = true;
        ObservableArray.ENUMERABLE_PROPS[index] = prop;
    }

    static reserveArrayBuffer(max:number) {
        for (var index = ObservableArray.OBSERVABLE_ARRAY_BUFFER_SIZE; index < max; index++)
            ObservableArray.createArrayBufferItem(index);
        ObservableArray.OBSERVABLE_ARRAY_BUFFER_SIZE = max;
    }
}
ObservableArray.reserveArrayBuffer(1000);

class SimpleEventEmitter implements Mobservable.ISimpleEventEmitter {
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
                    listeners[i].apply(null, arguments);
        }
    }

    on(listener:(...data:any[])=>void):Lambda {
        this.listeners.push(listener);
        return once(() => {
            var idx = this.listeners.indexOf(listener);
            if (idx !== -1)
                this.listeners.splice(idx, 1);
        });
    }

    once(listener:(...data:any[])=>void):Lambda {
        var subscription = this.on(function() {
            subscription();
            listener.apply(this, arguments);
        });
        return subscription;
    }
}
m.SimpleEventEmitter = SimpleEventEmitter;

class Scheduler {
    private static inBatch = 0;
    private static tasks:{():void}[] = [];

    public static schedule(func:Lambda) {
        if (Scheduler.inBatch < 1)
            func();
        else
            Scheduler.tasks[Scheduler.tasks.length] = func;
    }

    private static runPostBatchActions() {
        var i = 0;
        while(Scheduler.tasks.length) {
            try { // try outside loop; much cheaper
                for(; i < Scheduler.tasks.length; i++)
                    Scheduler.tasks[i]();
                Scheduler.tasks = [];
            } catch (e) {
                console.error("Failed to run scheduled action, the action has been dropped from the queue: " + e, e);
                // drop already executed tasks, including the failing one, and continue with other actions, to keep state as stable as possible
                Scheduler.tasks.splice(0, i + 1);
            }
        }
    }

    static batch<T>(action:()=>T):T {
        Scheduler.inBatch += 1;
        try {
            return action();
        } finally {
            //Scheduler.inBatch -= 1;
            if (--Scheduler.inBatch === 0) {
                // make sure follow up actions are processed in batch after the current queue
                Scheduler.inBatch += 1;
                Scheduler.runPostBatchActions();
                Scheduler.inBatch -= 1;
            }
        }
    }
}

m.ObserverMixin = {
    componentWillMount: function() {
        var baseRender = this.render;
        this.render = function() {
            if (this._watchDisposer)
                this._watchDisposer();
            var[rendering, disposer] = m.watch(() => baseRender.call(this), () => {
                this.forceUpdate();
            });
            this._watchDisposer = disposer;
            return rendering;
        }
    },
    
    componentWillUnmount: function() {
        if (this._watchDisposer)
            this._watchDisposer();
    },
    
    shouldComponentUpdate: function(nextProps, nextState) {
        // update on any state changes (as is the default)
        if (this.state !== nextState)
            return true;
        // update if props are shallowly not equal, inspired by PureRenderMixin
        var keys = Object.keys(this.props);
        var key;
        if (keys.length !== Object.keys(nextProps).length)
            return true;
        for(var i = keys.length -1; i >= 0, key = keys[i]; i--)
            if (nextProps[key] !== this.props[key])
                return true;
        return false;
    }
}

m.ObservingComponent = function(componentClass) {
    var baseMount = componentClass.componentWillMount;
    var baseUnmount = componentClass.componentWillUnmount;
    componentClass.prototype.componentWillMount = function() {
        m.ObserverMixin.componentWillMount.apply(this, arguments);
        return baseMount && baseMount.apply(this, arguments);
    };
    componentClass.prototype.componentWillUnmount = function() {
        m.ObserverMixin.componentWillUnmount.apply(this, arguments);
        return baseUnmount && baseUnmount.apply(this, arguments);
    };
    componentClass.prototype.shouldComponentUpdate = m.ObserverMixin.shouldComponentUpdate;
    return componentClass;
};

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
    if (!base || !base.length)
        return [current, []];
    if (!current || !current.length)
        return [[], base];

    var added:T[] = [];
    var removed:T[] = [];

    var currentIndex = 0,
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
            added.push(...current.slice(currentIndex, currentSearch));
            currentIndex = currentSearch +1;
            baseIndex ++;
            isSearching = false;
        }
        else if (!baseExhausted && base[baseSearch] === current[currentIndex]) {
            // items where removed
            removed.push(...base.slice(baseIndex, baseSearch));
            baseIndex = baseSearch +1;
            currentIndex ++;
            isSearching = false;
        }
    }

    added.push(...current.slice(currentIndex));
    removed.push(...base.slice(baseIndex));
    return [added, removed];
}

// For testing purposes only;
(<any>m).quickDiff = quickDiff;
(<any>m).stackDepth = () => DNode.trackingStack.length;

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

function noop(){};

} // end of module

/* typescript does not support UMD modules yet, lets do it ourselves... */
declare var define;
declare var exports;
declare var module;

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD.
        define('mobservable', [], function () {
            return (factory());
        });
    } else if (typeof exports === 'object') {
        // CommonJS like
        module.exports = factory();
    } else {
        // register global
        root['mobservable'] = factory();
    }
}(this, function () {
    return mobservable.m;
}));
