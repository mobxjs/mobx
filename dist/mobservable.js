var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');
function observableValue(value, scope) {
    var prop = null;
    if (Array.isArray && Array.isArray(value))
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
    propFunc.toString = function () {
        return prop.toString();
    };
    return propFunc;
}
var mobservableStatic = function (value, scope) {
    return observableValue(value, scope);
};
mobservableStatic.value = observableValue;
mobservableStatic.watch = function watch(func, onInvalidate) {
    var dnode = new DNode();
    var retVal;
    dnode.compute = function () {
        retVal = func();
        dnode.compute = function () {
            if (dnode.getObserversCount())
                throw new Error("A guarded function should not have observers!");
            dnode.dispose();
            onInvalidate();
            return false;
        };
        return false;
    };
    dnode.computeNextValue();
    return [retVal, function () { return dnode.dispose(); }];
};
mobservableStatic.array = function array(values) {
    return new ObservableArray(values);
};
mobservableStatic.batch = function batch(action) {
    Scheduler.batch(action);
};
mobservableStatic.onReady = function onReady(listener) {
    return Scheduler.onReady(listener);
};
mobservableStatic.onceReady = function onceReady(listener) {
    Scheduler.onceReady(listener);
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
        this.events = new events.EventEmitter();
        this.dependencyState = new DNode();
    }
    ObservableValue.prototype.set = function (value) {
        if (value !== this._value) {
            var oldValue = this._value;
            this.dependencyState.markStale();
            this._value = value;
            this.dependencyState.markReady(true);
            this.events.emit('change', value, oldValue);
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
        var current = this.get();
        if (fireImmediately)
            listener(current, undefined);
        this.events.addListener('change', listener);
        return function () {
            _this.dependencyState.setRefCount(-1);
            _this.events.removeListener('change', listener);
        };
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
        this.dependencyState.compute = this.compute.bind(this);
    }
    ComputedObservable.prototype.get = function () {
        if (this.isComputing)
            throw new Error("Cycle detected");
        if (DNode.trackingStack.length) {
            this.dependencyState.wakeUp();
            this.dependencyState.notifyObserved();
        }
        else if (this.dependencyState.isSleeping) {
            this.compute();
        }
        else {
        }
        if (this.dependencyState.hasCycle)
            throw new Error("Cycle detected");
        if (this.hasError)
            throw this._value;
        return this._value;
    };
    ComputedObservable.prototype.set = function (_) {
        throw new Error("ComputedObservable cannot retrieve a new value!");
    };
    ComputedObservable.prototype.compute = function () {
        var newValue;
        try {
            if (this.isComputing)
                throw new Error("Cycle detected");
            this.isComputing = true;
            var newValue = this.func.call(this.scope);
            this.hasError = false;
        }
        catch (e) {
            this.hasError = true;
            console && console.error("Caught error during computation: ", e);
            if (e instanceof Error)
                newValue = e;
            else {
                newValue = new Error("ComputationError");
                newValue.cause = e;
            }
        }
        this.isComputing = false;
        var changed = newValue !== this._value;
        if (changed) {
            var oldValue = this._value;
            this._value = newValue;
            this.events.emit('change', newValue, oldValue);
        }
        return changed;
    };
    ComputedObservable.prototype.toString = function () {
        return "ComputedObservable[" + this.func.toString() + "]";
    };
    return ComputedObservable;
})(ObservableValue);
var ObservableArray = (function () {
    function ObservableArray(initialValues) {
        Object.defineProperty(this, "length", {
            enumerable: false,
            get: function () {
                this.dependencyState.notifyObserved();
                return this._values.length;
            },
            set: function (newLength) {
                var currentLength = this._values.length;
                if (newLength === currentLength)
                    return;
                if (newLength > currentLength)
                    this.spliceWithArray(currentLength, 0, new Array(newLength - currentLength));
                else if (newLength < currentLength)
                    this.splice(newLength, currentLength - newLength);
            }
        });
        Object.defineProperty(this, "dependencyState", { enumerable: false, value: new DNode() });
        Object.defineProperty(this, "_values", { enumerable: false, value: [] });
        Object.defineProperty(this, "events", { enumerable: false, value: new events.EventEmitter() });
        if (initialValues && initialValues.length)
            this.spliceWithArray(0, 0, initialValues);
        else
            this.createNewStubEntry(0);
    }
    ObservableArray.prototype.updateLength = function (oldLength, delta) {
        if (delta < 0) {
            for (var i = oldLength - 1 - delta; i < oldLength; i++)
                delete this[i];
        }
        else if (delta > 0) {
            for (var i = 0; i < delta; i++)
                this.createNewEntry(oldLength + i);
        }
        else
            return;
        this.createNewStubEntry(oldLength + delta);
    };
    ObservableArray.prototype.createNewEntry = function (index) {
        var _this = this;
        Object.defineProperty(this, "" + index, {
            enumerable: true,
            configurable: true,
            set: function (value) {
                if (_this._values[index] !== value) {
                    _this._values[index] = value;
                    _this.notifyChildUpdate(index);
                }
            },
            get: function () {
                _this.dependencyState.notifyObserved();
                return _this._values[index];
            }
        });
    };
    ObservableArray.prototype.createNewStubEntry = function (index) {
        var _this = this;
        Object.defineProperty(this, "" + index, {
            enumerable: false,
            configurable: true,
            set: function (value) { return _this.push(value); },
            get: function () { return undefined; }
        });
    };
    ObservableArray.prototype.spliceWithArray = function (index, deleteCount, newItems) {
        var length = this._values.length;
        if (index > length)
            index = length;
        else if (index < 0)
            index = Math.max(0, length - index);
        if (index === undefined)
            return;
        if (deleteCount === undefined)
            deleteCount = length - index;
        if (newItems === undefined)
            newItems = [];
        var lengthDelta = newItems.length - deleteCount;
        var res = Array.prototype.splice.apply(this._values, [index, deleteCount].concat(newItems));
        this.updateLength(length, lengthDelta);
        this.notifySplice(index, res, newItems);
        return res;
    };
    ObservableArray.prototype.notifyChildUpdate = function (index) {
        this.notifyChanged();
    };
    ObservableArray.prototype.notifySplice = function (index, deleted, added) {
        this.notifyChanged();
    };
    ObservableArray.prototype.notifyChanged = function () {
        this.dependencyState.markStale();
        this.dependencyState.markReady(true);
        this.events.emit('change');
    };
    ObservableArray.prototype.observe = function (listener, fireImmediately) {
        var _this = this;
        if (fireImmediately === void 0) { fireImmediately = false; }
        if (fireImmediately)
            listener();
        this.events.addListener('change', listener);
        return function () {
            _this.events.removeListener('change', listener);
        };
    };
    ObservableArray.prototype.clear = function () {
        return this.splice(0);
    };
    ObservableArray.prototype.replace = function (newItems) {
        return this.spliceWithArray(0, this._values.length, newItems);
    };
    ObservableArray.prototype.values = function () {
        return this.slice(0);
    };
    ObservableArray.prototype.splice = function (index, deleteCount) {
        var newItems = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            newItems[_i - 2] = arguments[_i];
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
        return this.splice(this._values.length, 1)[0];
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
    ObservableArray.prototype.toString = function () {
        return this.wrapReadFunction("toString", arguments);
    };
    ObservableArray.prototype.toLocaleString = function () {
        return this.wrapReadFunction("toLocaleString", arguments);
    };
    ObservableArray.prototype.concat = function () {
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i - 0] = arguments[_i];
        }
        return this.wrapReadFunction("concat", arguments);
    };
    ObservableArray.prototype.join = function (separator) {
        return this.wrapReadFunction("join", arguments);
    };
    ObservableArray.prototype.reverse = function () {
        return this.wrapReadFunction("reverse", arguments);
    };
    ObservableArray.prototype.slice = function (start, end) {
        return this.wrapReadFunction("slice", arguments);
    };
    ObservableArray.prototype.sort = function (compareFn) {
        return this.wrapReadFunction("sort", arguments);
    };
    ObservableArray.prototype.indexOf = function (searchElement, fromIndex) {
        return this.wrapReadFunction("indexOf", arguments);
    };
    ObservableArray.prototype.lastIndexOf = function (searchElement, fromIndex) {
        return this.wrapReadFunction("lastIndexOf", arguments);
    };
    ObservableArray.prototype.every = function (callbackfn, thisArg) {
        return this.wrapReadFunction("every", arguments);
    };
    ObservableArray.prototype.some = function (callbackfn, thisArg) {
        return this.wrapReadFunction("some", arguments);
    };
    ObservableArray.prototype.forEach = function (callbackfn, thisArg) {
        return this.wrapReadFunction("forEach", arguments);
    };
    ObservableArray.prototype.map = function (callbackfn, thisArg) {
        return this.wrapReadFunction("map", arguments);
    };
    ObservableArray.prototype.filter = function (callbackfn, thisArg) {
        return this.wrapReadFunction("filter", arguments);
    };
    ObservableArray.prototype.reduce = function (callbackfn, initialValue) {
        return this.wrapReadFunction("reduce", arguments);
    };
    ObservableArray.prototype.reduceRight = function (callbackfn, initialValue) {
        return this.wrapReadFunction("reduceRight", arguments);
    };
    ObservableArray.prototype.wrapReadFunction = function (funcName, args) {
        var baseFunc = Array.prototype[funcName];
        ObservableArray.prototype[funcName] = function () {
            this.dependencyState.notifyObserved();
            return baseFunc.apply(this._values, arguments);
        };
        return this[funcName].apply(this, args);
    };
    return ObservableArray;
})();
var DNodeState;
(function (DNodeState) {
    DNodeState[DNodeState["STALE"] = 0] = "STALE";
    DNodeState[DNodeState["PENDING"] = 1] = "PENDING";
    DNodeState[DNodeState["READY"] = 2] = "READY";
})(DNodeState || (DNodeState = {}));
;
var DNode = (function () {
    function DNode() {
        this.state = 2 /* READY */;
        this.isSleeping = true;
        this.hasCycle = false;
        this.observing = [];
        this.prevObserving = null;
        this.observers = [];
        this.dependencyChangeCount = 0;
        this.isDisposed = false;
        this.externalRefenceCount = 0;
    }
    DNode.prototype.getRefCount = function () {
        return this.observers.length + this.externalRefenceCount;
    };
    DNode.prototype.setRefCount = function (delta) {
        this.externalRefenceCount += delta;
        if (delta > 0 && this.externalRefenceCount === delta)
            this.wakeUp();
        else if (this.externalRefenceCount === 0)
            this.tryToSleep();
    };
    DNode.prototype.getObserversCount = function () {
        return this.observers.length;
    };
    DNode.prototype.addObserver = function (node) {
        this.observers[this.observers.length] = node;
    };
    DNode.prototype.removeObserver = function (node) {
        var idx = this.observers.indexOf(node);
        if (idx !== -1) {
            this.observers.splice(idx, 1);
            this.tryToSleep();
        }
    };
    DNode.prototype.hasObservingChanged = function () {
        if (this.observing.length !== this.prevObserving.length)
            return true;
        var l = this.observing.length;
        for (var i = 0; i < l; i++)
            if (this.observing[i] !== this.prevObserving[i])
                return true;
        return false;
    };
    DNode.prototype.markStale = function () {
        if (this.state === 1 /* PENDING */)
            return;
        if (this.state === 0 /* STALE */)
            return;
        this.state = 0 /* STALE */;
        this.notifyObservers();
    };
    DNode.prototype.markReady = function (didTheValueActuallyChange) {
        if (this.state === 2 /* READY */)
            return;
        this.state = 2 /* READY */;
        this.notifyObservers(didTheValueActuallyChange);
        Scheduler.scheduleReady();
    };
    DNode.prototype.notifyObservers = function (didTheValueActuallyChange) {
        if (didTheValueActuallyChange === void 0) { didTheValueActuallyChange = false; }
        var os = this.observers;
        for (var i = os.length - 1; i >= 0; i--)
            os[i].notifyStateChange(this, didTheValueActuallyChange);
    };
    DNode.prototype.areAllDependenciesAreStable = function () {
        var obs = this.observing, l = obs.length;
        for (var i = 0; i < l; i++)
            if (obs[i].state !== 2 /* READY */)
                return false;
        return true;
    };
    DNode.prototype.tryToSleep = function () {
        if (this.getRefCount() === 0 && !this.isSleeping) {
            for (var i = 0, l = this.observing.length; i < l; i++)
                this.observing[i].removeObserver(this);
            this.observing = [];
            this.isSleeping = true;
        }
    };
    DNode.prototype.wakeUp = function () {
        if (this.isSleeping) {
            this.isSleeping = false;
            this.state = 1 /* PENDING */;
            this.computeNextValue();
        }
    };
    DNode.prototype.notifyStateChange = function (observable, didTheValueActuallyChange) {
        var _this = this;
        switch (this.state) {
            case 0 /* STALE */:
                if (observable.state === 2 /* READY */ && didTheValueActuallyChange)
                    this.dependencyChangeCount += 1;
                if (observable.state === 2 /* READY */ && this.areAllDependenciesAreStable()) {
                    this.state = 1 /* PENDING */;
                    Scheduler.schedule(function () {
                        if (_this.dependencyChangeCount > 0)
                            _this.computeNextValue();
                        else
                            _this.markReady(false);
                        _this.dependencyChangeCount = 0;
                    });
                }
                break;
            case 1 /* PENDING */:
                break;
            case 2 /* READY */:
                if (observable.state === 0 /* STALE */)
                    this.markStale();
                break;
        }
    };
    DNode.prototype.computeNextValue = function () {
        this.trackDependencies();
        var valueDidChange = this.compute();
        this.bindDependencies();
        this.markReady(valueDidChange);
    };
    DNode.prototype.compute = function () {
        return false;
    };
    DNode.prototype.trackDependencies = function () {
        this.prevObserving = this.observing;
        DNode.trackingStack[DNode.trackingStack.length] = [];
    };
    DNode.prototype.bindDependencies = function () {
        this.observing = DNode.trackingStack.pop();
        if (this.observing.length === 0 && !this.isDisposed)
            warn("You have created a function that doesn't observe any values, did you forget to make its dependencies observable?");
        var changes = quickDiff(this.observing, this.prevObserving);
        var added = changes[0];
        var removed = changes[1];
        this.prevObserving = null;
        for (var i = 0, l = removed.length; i < l; i++)
            removed[i].removeObserver(this);
        this.hasCycle = false;
        for (var i = 0, l = added.length; i < l; i++) {
            if (added[i].findCycle(this)) {
                this.hasCycle = true;
                this.observing.splice(this.observing.indexOf(added[i]), 1);
            }
            else
                added[i].addObserver(this);
        }
    };
    DNode.prototype.notifyObserved = function () {
        var ts = DNode.trackingStack, l = ts.length;
        if (l) {
            var cs = ts[l - 1], csl = cs.length;
            if (cs[csl - 1] !== this && cs[csl - 2] !== this)
                cs[csl] = this;
        }
    };
    DNode.prototype.findCycle = function (node) {
        if (this.observing.indexOf(node) !== -1)
            return true;
        for (var l = this.observing.length, i = 0; i < l; i++)
            if (this.observing[i].findCycle(node))
                return true;
        return false;
    };
    DNode.prototype.dispose = function () {
        for (var l = this.observing.length, i = 0; i < l; i++)
            this.observing[i].removeObserver(this);
        this.observing = [];
        this.observers = [];
        this.isDisposed = true;
    };
    DNode.trackingStack = [];
    return DNode;
})();
var Scheduler = (function () {
    function Scheduler() {
    }
    Scheduler.schedule = function (func) {
        if (Scheduler.inBatch < 1) {
            func();
        }
        else
            Scheduler.tasks[Scheduler.tasks.length] = func;
    };
    Scheduler.runPostBatch = function () {
        var i = 0;
        try {
            for (i = 0; i < Scheduler.tasks.length; i++)
                Scheduler.tasks[i]();
            Scheduler.tasks = [];
        }
        catch (e) {
            console && console.error("Failed to run scheduled action, the action has been dropped from the queue: " + e, e);
            Scheduler.tasks.splice(0, i + 1);
            setTimeout(function () { return Scheduler.runPostBatch(); }, 1);
            throw e;
        }
    };
    Scheduler.batch = function (action) {
        Scheduler.inBatch += 1;
        try {
            action();
        }
        finally {
            Scheduler.inBatch -= 1;
            if (Scheduler.inBatch === 0) {
                Scheduler.runPostBatch();
                Scheduler.scheduleReady();
            }
        }
    };
    Scheduler.scheduleReady = function () {
        if (!Scheduler.pendingReady) {
            Scheduler.pendingReady = true;
            setTimeout(function () {
                Scheduler.pendingReady = false;
                Scheduler.events.emit('ready');
            }, 1);
        }
    };
    Scheduler.onReady = function (listener) {
        Scheduler.events.on('ready', listener);
        return function () {
            Scheduler.events.removeListener('ready', listener);
        };
    };
    Scheduler.onceReady = function (listener) {
        Scheduler.events.once('ready', listener);
    };
    Scheduler.events = new events.EventEmitter();
    Scheduler.inBatch = 0;
    Scheduler.tasks = [];
    Scheduler.pendingReady = false;
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
module.exports = mobservableStatic;
//# sourceMappingURL=mobservable.js.map