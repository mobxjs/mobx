/**
 * MOBservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
function createObservable(value, scope) {
    var prop = null;
    if (Array.isArray && Array.isArray(value) && mobservableStatic.debugLevel)
        warn("mobservable.value() was invoked with an array. Probably you want to create an mobservable.array() instead of observing a reference to an array?");
    if (typeof value === "function")
        prop = new ComputedObservable(value, scope);
    else
        prop = new ObservableValue(value, scope);
    var propFunc = function (value) {
        if (arguments.length > 0)
            return prop.set(value);
        else
            return prop.get();
    };
    propFunc.observe = prop.observe.bind(prop);
    propFunc.prop = prop;
    propFunc.toString = function () { return prop.toString(); };
    return propFunc;
}
var mobservableStatic = function (value, scope) {
    return createObservable(value, scope);
};
mobservableStatic.value = createObservable;
mobservableStatic.debugLevel = 0;
mobservableStatic.watch = function watch(func, onInvalidate) {
    var dnode = new DNode(true);
    var retVal;
    dnode.nextState = function () {
        retVal = func();
        dnode.nextState = function () {
            dnode.dispose();
            onInvalidate();
            return false;
        };
        return false;
    };
    dnode.computeNextState();
    return [retVal, function () { return dnode.dispose(); }];
};
mobservableStatic.observeProperty = function observeProperty(object, key, listener, invokeImmediately) {
    if (invokeImmediately === void 0) { invokeImmediately = false; }
    if (!object || !key || object[key] === undefined)
        throw new Error("Object '" + object + "' has no key '" + key + "'.");
    if (!listener || typeof listener !== "function")
        throw new Error("Third argument to mobservable.observeProperty should be a function");
    var currentValue = object[key];
    if (currentValue instanceof ObservableValue || currentValue instanceof ObservableArray)
        return currentValue.observe(listener, invokeImmediately);
    else if (currentValue.prop && currentValue.prop instanceof ObservableValue)
        return currentValue.prop.observe(listener, invokeImmediately);
    var observer = new ComputedObservable((function () { return object[key]; }), object);
    var disposer = observer.observe(listener, invokeImmediately);
    if (mobservableStatic.debugLevel && observer.dependencyState.observing.length === 0)
        warn("mobservable.observeProperty: property '" + key + "' of '" + object + " doesn't seem to be observable. Did you define it as observable?");
    return once(function () {
        disposer();
        observer.dependencyState.dispose();
    });
};
mobservableStatic.array = function array(values) {
    return new ObservableArray(values);
};
mobservableStatic.toJSON = function toJSON(value) {
    if (value instanceof ObservableArray)
        return value.values();
    return value;
};
mobservableStatic.batch = function batch(action) {
    return Scheduler.batch(action);
};
mobservableStatic.onReady = function onReady(listener) {
    return Scheduler.onReady(listener);
};
mobservableStatic.onceReady = function onceReady(listener) {
    Scheduler.onceReady(listener);
};
mobservableStatic.observable = function observable(target, key, descriptor) {
    var baseValue = descriptor ? descriptor.value : null;
    if (typeof baseValue === "function") {
        delete descriptor.value;
        delete descriptor.writable;
        descriptor.get = function () {
            mobservableStatic.defineObservableProperty(this, key, baseValue);
            return this[key];
        };
        descriptor.set = function () {
            console.trace();
            throw new Error("It is not allowed to reassign observable functions");
        };
    }
    else {
        Object.defineProperty(target, key, {
            configurable: true, enumberable: true,
            get: function () {
                mobservableStatic.defineObservableProperty(this, key, undefined);
                return this[key];
            },
            set: function (value) {
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
};
mobservableStatic.defineObservableProperty = function defineObservableProperty(object, name, initialValue) {
    var _property = mobservableStatic.value(initialValue, object);
    definePropertyForObservable(object, name, _property);
};
mobservableStatic.initializeObservableProperties = function initializeObservableProperties(object) {
    for (var key in object)
        if (object.hasOwnProperty(key)) {
            if (object[key] && object[key].prop && object[key].prop instanceof ObservableValue)
                definePropertyForObservable(object, key, object[key]);
        }
};
function definePropertyForObservable(object, name, observable) {
    Object.defineProperty(object, name, {
        get: function () {
            return observable();
        },
        set: function (value) {
            observable(value);
        },
        enumerable: true,
        configurable: true
    });
}
var ObservableValue = (function () {
    function ObservableValue(_value, scope) {
        this._value = _value;
        this.scope = scope;
        this.changeEvent = new SimpleEventEmitter();
        this.dependencyState = new DNode(false);
    }
    ObservableValue.prototype.set = function (value) {
        if (value !== this._value) {
            var oldValue = this._value;
            this.dependencyState.markStale();
            this._value = value;
            this.dependencyState.markReady(true);
            this.changeEvent.emit(value, oldValue);
        }
        return this.scope;
    };
    ObservableValue.prototype.get = function () {
        this.dependencyState.notifyObserved();
        return this._value;
    };
    ObservableValue.prototype.observe = function (listener, fireImmediately) {
        var _this = this;
        if (fireImmediately === void 0) { fireImmediately = false; }
        this.dependencyState.setRefCount(+1);
        if (fireImmediately)
            listener(this.get(), undefined);
        var disposer = this.changeEvent.on(listener);
        return once(function () {
            _this.dependencyState.setRefCount(-1);
            disposer();
        });
    };
    ObservableValue.prototype.toString = function () {
        return "Observable[" + this._value + "]";
    };
    return ObservableValue;
})();
var ComputedObservable = (function (_super) {
    __extends(ComputedObservable, _super);
    function ComputedObservable(func, scope) {
        _super.call(this, undefined, scope);
        this.func = func;
        this.isComputing = false;
        this.hasError = false;
        if (!func)
            throw new Error("ComputedObservable requires a function");
        this.dependencyState.isComputed = true;
        this.dependencyState.nextState = this.compute.bind(this);
    }
    ComputedObservable.prototype.get = function () {
        if (this.isComputing)
            throw new Error("Cycle detected");
        var state = this.dependencyState;
        if (state.isSleeping) {
            if (DNode.trackingStack.length > 0) {
                state.wakeUp();
                state.notifyObserved();
            }
            else {
                this.compute();
            }
        }
        else {
            state.notifyObserved();
        }
        if (state.hasCycle)
            throw new Error("Cycle detected");
        if (this.hasError) {
            if (mobservableStatic.debugLevel) {
                console.trace();
                warn(this + ": rethrowing caught exception to observer: " + this._value + (this._value.cause || ''));
            }
            throw this._value;
        }
        return this._value;
    };
    ComputedObservable.prototype.set = function (_) {
        throw new Error(this.toString() + ": A computed observable does not accept new values!");
    };
    ComputedObservable.prototype.compute = function () {
        var newValue;
        try {
            if (this.isComputing)
                throw new Error("Cycle detected");
            this.isComputing = true;
            newValue = this.func.call(this.scope);
            this.hasError = false;
        }
        catch (e) {
            this.hasError = true;
            console.error(this + "Caught error during computation: ", e);
            if (e instanceof Error)
                newValue = e;
            else {
                newValue = new Error("MobservableComputationError");
                newValue.cause = e;
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
    };
    ComputedObservable.prototype.toString = function () {
        return "ComputedObservable[" + this.func.toString() + "]";
    };
    return ComputedObservable;
})(ObservableValue);
var DNodeState;
(function (DNodeState) {
    DNodeState[DNodeState["STALE"] = 0] = "STALE";
    DNodeState[DNodeState["PENDING"] = 1] = "PENDING";
    DNodeState[DNodeState["READY"] = 2] = "READY";
})(DNodeState || (DNodeState = {}));
;
var DNode = (function () {
    function DNode(isComputed) {
        this.isComputed = isComputed;
        this.state = DNodeState.READY;
        this.isSleeping = true;
        this.hasCycle = false;
        this.observing = [];
        this.prevObserving = null;
        this.observers = [];
        this.dependencyChangeCount = 0;
        this.dependencyStaleCount = 0;
        this.isDisposed = false;
        this.externalRefenceCount = 0;
    }
    DNode.prototype.setRefCount = function (delta) {
        var rc = this.externalRefenceCount += delta;
        if (rc === 0)
            this.tryToSleep();
        else if (rc === delta)
            this.wakeUp();
    };
    DNode.prototype.addObserver = function (node) {
        this.observers[this.observers.length] = node;
    };
    DNode.prototype.removeObserver = function (node) {
        var obs = this.observers, idx = obs.indexOf(node);
        if (idx !== -1) {
            obs.splice(idx, 1);
            if (obs.length === 0)
                this.tryToSleep();
        }
    };
    DNode.prototype.markStale = function () {
        if (this.state !== DNodeState.READY)
            return;
        this.state = DNodeState.STALE;
        this.notifyObservers();
    };
    DNode.prototype.markReady = function (stateDidActuallyChange) {
        if (this.state === DNodeState.READY)
            return;
        this.state = DNodeState.READY;
        this.notifyObservers(stateDidActuallyChange);
        if (this.observers.length === 0)
            Scheduler.scheduleReady();
    };
    DNode.prototype.notifyObservers = function (stateDidActuallyChange) {
        if (stateDidActuallyChange === void 0) { stateDidActuallyChange = false; }
        var os = this.observers.slice();
        for (var l = os.length, i = 0; i < l; i++)
            os[i].notifyStateChange(this, stateDidActuallyChange);
    };
    DNode.prototype.tryToSleep = function () {
        if (this.isComputed && this.observers.length === 0 && this.externalRefenceCount === 0 && !this.isSleeping) {
            for (var i = 0, l = this.observing.length; i < l; i++)
                this.observing[i].removeObserver(this);
            this.observing = [];
            this.isSleeping = true;
        }
    };
    DNode.prototype.wakeUp = function () {
        if (this.isSleeping && this.isComputed) {
            this.isSleeping = false;
            this.state = DNodeState.PENDING;
            this.computeNextState();
        }
    };
    DNode.prototype.notifyStateChange = function (observable, stateDidActuallyChange) {
        var _this = this;
        if (observable.state === DNodeState.STALE) {
            if (++this.dependencyStaleCount === 1)
                this.markStale();
        }
        else {
            if (stateDidActuallyChange)
                this.dependencyChangeCount += 1;
            if (--this.dependencyStaleCount === 0) {
                this.state = DNodeState.PENDING;
                Scheduler.schedule(function () {
                    if (_this.dependencyChangeCount > 0)
                        _this.computeNextState();
                    else
                        _this.markReady(false);
                    _this.dependencyChangeCount = 0;
                });
            }
        }
    };
    DNode.prototype.computeNextState = function () {
        this.trackDependencies();
        var stateDidChange = this.nextState();
        this.bindDependencies();
        this.markReady(stateDidChange);
    };
    DNode.prototype.nextState = function () {
        return false;
    };
    DNode.prototype.trackDependencies = function () {
        this.prevObserving = this.observing;
        DNode.trackingStack[DNode.trackingStack.length] = [];
    };
    DNode.prototype.bindDependencies = function () {
        this.observing = DNode.trackingStack.pop();
        if (this.isComputed && this.observing.length === 0 && mobservableStatic.debugLevel > 1 && !this.isDisposed) {
            console.trace();
            warn("You have created a function that doesn't observe any values, did you forget to make its dependencies observable?");
        }
        var _a = quickDiff(this.observing, this.prevObserving), added = _a[0], removed = _a[1];
        this.prevObserving = null;
        for (var i = 0, l = removed.length; i < l; i++)
            removed[i].removeObserver(this);
        this.hasCycle = false;
        for (var i = 0, l = added.length; i < l; i++) {
            if (this.isComputed && added[i].findCycle(this)) {
                this.hasCycle = true;
                this.observing.splice(this.observing.indexOf(added[i]), 1);
                added[i].hasCycle = true;
            }
            else {
                added[i].addObserver(this);
            }
        }
    };
    DNode.prototype.notifyObserved = function () {
        var ts = DNode.trackingStack, l = ts.length;
        if (l > 0) {
            var cs = ts[l - 1], csl = cs.length;
            if (cs[csl - 1] !== this && cs[csl - 2] !== this)
                cs[csl] = this;
        }
    };
    DNode.prototype.findCycle = function (node) {
        var obs = this.observing;
        if (obs.indexOf(node) !== -1)
            return true;
        for (var l = obs.length, i = 0; i < l; i++)
            if (obs[i].findCycle(node))
                return true;
        return false;
    };
    DNode.prototype.dispose = function () {
        if (this.observers.length)
            throw new Error("Cannot dispose DNode; it is still being observed");
        for (var l = this.observing.length, i = 0; i < l; i++)
            this.observing[i].removeObserver(this);
        this.observing = [];
        this.isDisposed = true;
    };
    DNode.trackingStack = [];
    return DNode;
})();
var ObservableArray = (function () {
    function ObservableArray(initialValues) {
        Object.defineProperties(this, {
            "dependencyState": { enumerable: false, value: new DNode(false) },
            "_values": { enumerable: false, value: initialValues ? initialValues.slice() : [] },
            "changeEvent": { enumerable: false, value: new SimpleEventEmitter() },
        });
        if (initialValues && initialValues.length)
            this.updateLength(0, initialValues.length);
    }
    Object.defineProperty(ObservableArray.prototype, "length", {
        get: function () {
            this.dependencyState.notifyObserved();
            return this._values.length;
        },
        set: function (newLength) {
            if (typeof newLength !== "number" || newLength < 0)
                throw new Error("Out of range: " + newLength);
            var currentLength = this._values.length;
            if (newLength === currentLength)
                return;
            else if (newLength > currentLength)
                this.spliceWithArray(currentLength, 0, new Array(newLength - currentLength));
            else
                this.spliceWithArray(newLength, currentLength - newLength);
        },
        enumerable: true,
        configurable: true
    });
    ObservableArray.prototype.updateLength = function (oldLength, delta) {
        if (delta < 0)
            for (var i = oldLength + delta; i < oldLength; i++)
                delete this[i];
        else if (delta > 0) {
            if (oldLength + delta > ObservableArray.OBSERVABLE_ARRAY_BUFFER_SIZE)
                ObservableArray.reserveArrayBuffer(oldLength + delta);
            for (var i = oldLength, end = oldLength + delta; i < end; i++)
                Object.defineProperty(this, "" + i, ObservableArray.ENUMERABLE_PROPS[i]);
        }
    };
    ObservableArray.prototype.spliceWithArray = function (index, deleteCount, newItems) {
        var length = this._values.length;
        if ((newItems === undefined || newItems.length === 0) && (deleteCount === 0 || length === 0))
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
        var res = (_a = this._values).splice.apply(_a, [index, deleteCount].concat(newItems));
        this.updateLength(length, lengthDelta);
        this.notifySplice(index, res, newItems);
        return res;
        var _a;
    };
    ObservableArray.prototype.notifyChildUpdate = function (index, oldValue) {
        this.notifyChanged();
        this.changeEvent.emit({ object: this, type: 'update', index: index, oldValue: oldValue });
    };
    ObservableArray.prototype.notifySplice = function (index, deleted, added) {
        if (deleted.length === 0 && added.length === 0)
            return;
        this.notifyChanged();
        this.changeEvent.emit({ object: this, type: 'splice', index: index, addedCount: added.length, removed: deleted });
    };
    ObservableArray.prototype.notifyChanged = function () {
        this.dependencyState.markStale();
        this.dependencyState.markReady(true);
    };
    ObservableArray.prototype.observe = function (listener, fireImmediately) {
        if (fireImmediately === void 0) { fireImmediately = false; }
        if (fireImmediately)
            listener({ object: this, type: 'splice', index: 0, addedCount: this._values.length, removed: [] });
        return this.changeEvent.on(listener);
    };
    ObservableArray.prototype.clear = function () {
        return this.splice(0);
    };
    ObservableArray.prototype.replace = function (newItems) {
        return this.spliceWithArray(0, this._values.length, newItems);
    };
    ObservableArray.prototype.values = function () {
        this.dependencyState.notifyObserved();
        return this._values.slice();
    };
    ObservableArray.prototype.toJSON = function () {
        this.dependencyState.notifyObserved();
        return this._values.slice();
    };
    ObservableArray.prototype.clone = function () {
        this.dependencyState.notifyObserved();
        return new ObservableArray(this._values);
    };
    ObservableArray.prototype.splice = function (index, deleteCount) {
        var newItems = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            newItems[_i - 2] = arguments[_i];
        }
        switch (arguments.length) {
            case 0:
                return [];
            case 1:
                return this.spliceWithArray(index);
            case 2:
                return this.spliceWithArray(index, deleteCount);
        }
        return this.spliceWithArray(index, deleteCount, newItems);
    };
    ObservableArray.prototype.push = function () {
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i - 0] = arguments[_i];
        }
        this.spliceWithArray(this._values.length, 0, items);
        return this._values.length;
    };
    ObservableArray.prototype.pop = function () {
        return this.splice(Math.max(this._values.length - 1, 0), 1)[0];
    };
    ObservableArray.prototype.shift = function () {
        return this.splice(0, 1)[0];
    };
    ObservableArray.prototype.unshift = function () {
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i - 0] = arguments[_i];
        }
        this.spliceWithArray(0, 0, items);
        return this._values.length;
    };
    ObservableArray.prototype.reverse = function () {
        return this.replace(this._values.reverse());
    };
    ObservableArray.prototype.sort = function (compareFn) {
        return this.replace(this._values.sort.apply(this._values, arguments));
    };
    ObservableArray.prototype.toString = function () { return this.wrapReadFunction("toString", arguments); };
    ObservableArray.prototype.toLocaleString = function () { return this.wrapReadFunction("toLocaleString", arguments); };
    ObservableArray.prototype.concat = function () { return this.wrapReadFunction("concat", arguments); };
    ObservableArray.prototype.join = function (separator) { return this.wrapReadFunction("join", arguments); };
    ObservableArray.prototype.slice = function (start, end) { return this.wrapReadFunction("slice", arguments); };
    ObservableArray.prototype.indexOf = function (searchElement, fromIndex) { return this.wrapReadFunction("indexOf", arguments); };
    ObservableArray.prototype.lastIndexOf = function (searchElement, fromIndex) { return this.wrapReadFunction("lastIndexOf", arguments); };
    ObservableArray.prototype.every = function (callbackfn, thisArg) { return this.wrapReadFunction("every", arguments); };
    ObservableArray.prototype.some = function (callbackfn, thisArg) { return this.wrapReadFunction("some", arguments); };
    ObservableArray.prototype.forEach = function (callbackfn, thisArg) { return this.wrapReadFunction("forEach", arguments); };
    ObservableArray.prototype.map = function (callbackfn, thisArg) { return this.wrapReadFunction("map", arguments); };
    ObservableArray.prototype.filter = function (callbackfn, thisArg) { return this.wrapReadFunction("filter", arguments); };
    ObservableArray.prototype.reduce = function (callbackfn, initialValue) { return this.wrapReadFunction("reduce", arguments); };
    ObservableArray.prototype.reduceRight = function (callbackfn, initialValue) { return this.wrapReadFunction("reduceRight", arguments); };
    ObservableArray.prototype.wrapReadFunction = function (funcName, initialArgs) {
        var baseFunc = Array.prototype[funcName];
        return (ObservableArray.prototype[funcName] = function () {
            this.dependencyState.notifyObserved();
            return baseFunc.apply(this._values, arguments);
        }).apply(this, initialArgs);
    };
    ObservableArray.createArrayBufferItem = function (index) {
        var prop = {
            enumerable: false,
            configurable: true,
            set: function (value) {
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
                    throw new Error("ObservableArray: Index out of bounds, " + index + " is larger than " + this.values.length);
            },
            get: function () {
                if (index < this._values.length) {
                    this.dependencyState.notifyObserved();
                    return this._values[index];
                }
                return undefined;
            }
        };
        Object.defineProperty(ObservableArray.prototype, "" + index, prop);
        prop.enumerable = true;
        ObservableArray.ENUMERABLE_PROPS[index] = prop;
    };
    ObservableArray.reserveArrayBuffer = function (max) {
        for (var index = ObservableArray.OBSERVABLE_ARRAY_BUFFER_SIZE; index <= max; index++)
            ObservableArray.createArrayBufferItem(index);
        ObservableArray.OBSERVABLE_ARRAY_BUFFER_SIZE = max;
    };
    ObservableArray.OBSERVABLE_ARRAY_BUFFER_SIZE = 0;
    ObservableArray.ENUMERABLE_PROPS = [];
    return ObservableArray;
})();
ObservableArray.reserveArrayBuffer(1000);
var SimpleEventEmitter = (function () {
    function SimpleEventEmitter() {
        this.listeners = [];
    }
    SimpleEventEmitter.prototype.emit = function () {
        var listeners = this.listeners.slice();
        var l = listeners.length;
        switch (arguments.length) {
            case 0:
                for (var i = 0; i < l; i++)
                    listeners[i]();
                break;
            case 1:
                var data = arguments[0];
                for (var i = 0; i < l; i++)
                    listeners[i](data);
                break;
            default:
                for (var i = 0; i < l; i++)
                    listeners[i].apply(null, arguments);
        }
    };
    SimpleEventEmitter.prototype.on = function (listener) {
        var _this = this;
        this.listeners.push(listener);
        return once(function () {
            var idx = _this.listeners.indexOf(listener);
            if (idx !== -1)
                _this.listeners.splice(idx, 1);
        });
    };
    SimpleEventEmitter.prototype.once = function (listener) {
        var subscription = this.on(function () {
            subscription();
            listener.apply(this, arguments);
        });
        return subscription;
    };
    return SimpleEventEmitter;
})();
mobservableStatic.SimpleEventEmitter = SimpleEventEmitter;
var Scheduler = (function () {
    function Scheduler() {
    }
    Scheduler.schedule = function (func) {
        if (Scheduler.inBatch < 1)
            func();
        else
            Scheduler.tasks[Scheduler.tasks.length] = func;
    };
    Scheduler.runPostBatchActions = function () {
        var i = 0;
        try {
            for (; i < Scheduler.tasks.length; i++)
                Scheduler.tasks[i]();
            Scheduler.tasks = [];
        }
        catch (e) {
            console.error("Failed to run scheduled action, the action has been dropped from the queue: " + e, e);
            Scheduler.tasks.splice(0, i + 1);
            setTimeout(Scheduler.runPostBatchActions, 1);
            throw e;
        }
    };
    Scheduler.batch = function (action) {
        Scheduler.inBatch += 1;
        try {
            return action();
        }
        finally {
            if (--Scheduler.inBatch === 0) {
                Scheduler.runPostBatchActions();
                Scheduler.scheduleReady();
            }
        }
    };
    Scheduler.scheduleReady = function () {
        if (!Scheduler.pendingReady) {
            Scheduler.pendingReady = true;
            setTimeout(function () {
                Scheduler.pendingReady = false;
                Scheduler.readyEvent.emit();
            }, 1);
        }
    };
    Scheduler.onReady = function (listener) {
        return Scheduler.readyEvent.on(listener);
    };
    Scheduler.onceReady = function (listener) {
        return Scheduler.readyEvent.once(listener);
    };
    Scheduler.pendingReady = false;
    Scheduler.readyEvent = new SimpleEventEmitter();
    Scheduler.inBatch = 0;
    Scheduler.tasks = [];
    return Scheduler;
})();
function quickDiff(current, base) {
    if (!base.length)
        return [current, []];
    if (!current.length)
        return [[], base];
    var added = [];
    var removed = [];
    var currentIndex = 0, currentSearch = 0, currentLength = current.length, currentExhausted = false, baseIndex = 0, baseSearch = 0, baseLength = base.length, isSearching = false, baseExhausted = false;
    while (!baseExhausted && !currentExhausted) {
        if (!isSearching) {
            if (currentIndex < currentLength && baseIndex < baseLength && current[currentIndex] === base[baseIndex]) {
                currentIndex++;
                baseIndex++;
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
            added.push.apply(added, current.slice(currentIndex, currentSearch));
            currentIndex = currentSearch + 1;
            baseIndex++;
            isSearching = false;
        }
        else if (!baseExhausted && base[baseSearch] === current[currentIndex]) {
            removed.push.apply(removed, base.slice(baseIndex, baseSearch));
            baseIndex = baseSearch + 1;
            currentIndex++;
            isSearching = false;
        }
    }
    added.push.apply(added, current.slice(currentIndex));
    removed.push.apply(removed, base.slice(baseIndex));
    return [added, removed];
}
mobservableStatic.quickDiff = quickDiff;
mobservableStatic.stackDepth = function () { return DNode.trackingStack.length; };
function warn(message) {
    if (console)
        console.warn("[WARNING:mobservable] " + message);
}
function once(func) {
    var invoked = false;
    return function () {
        if (invoked)
            return;
        invoked = true;
        return func.apply(this, arguments);
    };
}
module.exports = mobservableStatic;
//# sourceMappingURL=mobservable.js.map