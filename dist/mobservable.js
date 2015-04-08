/// <reference path="./typings/node-0.10.d.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');
function observableValue(value, scope) {
    var prop = null;
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
mobservableStatic.defineProperty = function defineProperty(object, name, initialValue) {
    var _property = mobservableStatic.value(initialValue, object);
    Object.defineProperty(object, name, {
        get: function () {
            return _property();
        },
        set: function (value) {
            _property(value);
        },
        enumerable: true,
        configurable: true
    });
};
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
        var current = this.get();
        if (fireImmediately)
            listener(current, undefined);
        this.events.addListener('change', listener);
        return function () {
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
        this.initialized = false;
        if (!func)
            throw new Error("ComputedObservable requires a function");
        this.dependencyState.compute = this.compute.bind(this);
    }
    ComputedObservable.prototype.get = function () {
        if (!this.initialized) {
            this.initialized = true;
            this.dependencyState.computeNextValue();
        }
        return _super.prototype.get.call(this);
    };
    ComputedObservable.prototype.set = function (_) {
        throw new Error("ComputedObservable cannot retrieve a new value!");
    };
    ComputedObservable.prototype.compute = function () {
        var newValue = this.func.call(this.scope);
        this.initialized = true;
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
                if (this._supressLengthNotification === true || newLength != currentLength)
                    return;
                if (newLength > currentLength)
                    this.spliceWithArray(currentLength, 0, new Array(newLength - currentLength));
                else if (newLength < currentLength)
                    this.splice(newLength - 1, currentLength - newLength);
                this.notifyObserved();
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
    ObservableArray.prototype.toString = function () { return this.wrapReadFunction("toString", arguments); };
    ObservableArray.prototype.toLocaleString = function () { return this.wrapReadFunction("toLocaleString", arguments); };
    ObservableArray.prototype.concat = function () {
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i - 0] = arguments[_i];
        }
        return this.wrapReadFunction("concat", arguments);
    };
    ObservableArray.prototype.join = function (separator) { return this.wrapReadFunction("join", arguments); };
    ObservableArray.prototype.reverse = function () { return this.wrapReadFunction("reverse", arguments); };
    ObservableArray.prototype.slice = function (start, end) { return this.wrapReadFunction("slice", arguments); };
    ObservableArray.prototype.sort = function (compareFn) { return this.wrapReadFunction("sort", arguments); };
    ObservableArray.prototype.indexOf = function (searchElement, fromIndex) { return this.wrapReadFunction("indexOf", arguments); };
    ObservableArray.prototype.lastIndexOf = function (searchElement, fromIndex) { return this.wrapReadFunction("lastIndexOf", arguments); };
    ObservableArray.prototype.every = function (callbackfn, thisArg) { return this.wrapReadFunction("every", arguments); };
    ObservableArray.prototype.some = function (callbackfn, thisArg) { return this.wrapReadFunction("some", arguments); };
    ObservableArray.prototype.forEach = function (callbackfn, thisArg) { return this.wrapReadFunction("forEach", arguments); };
    ObservableArray.prototype.map = function (callbackfn, thisArg) { return this.wrapReadFunction("map", arguments); };
    ObservableArray.prototype.filter = function (callbackfn, thisArg) { return this.wrapReadFunction("filter", arguments); };
    ObservableArray.prototype.reduce = function (callbackfn, initialValue) { return this.wrapReadFunction("reduce", arguments); };
    ObservableArray.prototype.reduceRight = function (callbackfn, initialValue) { return this.wrapReadFunction("reduceRight", arguments); };
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
        this.state = DNodeState.READY;
        this.observing = [];
        this.prevObserving = [];
        this.observers = [];
        this.dependencyChangeCount = 0;
    }
    DNode.prototype.getObserversCount = function () {
        return this.observers.length;
    };
    DNode.prototype.addObserver = function (node) {
        this.observers[this.observers.length] = node;
    };
    DNode.prototype.removeObserver = function (node) {
        var idx = this.observers.indexOf(node);
        if (idx !== -1)
            this.observers.splice(idx, 1);
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
        if (this.state === DNodeState.PENDING)
            return;
        if (this.state === DNodeState.STALE)
            return;
        this.state = DNodeState.STALE;
        this.notifyObservers();
    };
    DNode.prototype.markReady = function (didTheValueActuallyChange) {
        if (this.state === DNodeState.READY)
            return;
        this.state = DNodeState.READY;
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
            if (obs[i].state !== DNodeState.READY)
                return false;
        return true;
    };
    DNode.prototype.notifyStateChange = function (observable, didTheValueActuallyChange) {
        var _this = this;
        switch (this.state) {
            case DNodeState.STALE:
                if (observable.state === DNodeState.READY && didTheValueActuallyChange)
                    this.dependencyChangeCount += 1;
                if (observable.state === DNodeState.READY && this.areAllDependenciesAreStable()) {
                    if (this.dependencyChangeCount > 0) {
                        this.state = DNodeState.PENDING;
                        Scheduler.schedule(function () { return _this.computeNextValue(); });
                    }
                    else {
                        this.markReady(false);
                    }
                    this.dependencyChangeCount = 0;
                }
                break;
            case DNodeState.PENDING:
                break;
            case DNodeState.READY:
                if (observable.state === DNodeState.STALE)
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
        var changes = quickDiff(this.observing, this.prevObserving);
        var added = changes[0];
        var removed = changes[1];
        for (var i = 0, l = removed.length; i < l; i++)
            removed[i].removeObserver(this);
        for (var i = 0, l = added.length; i < l; i++) {
            added[i].addObserver(this);
            added[i].findCycle(this);
        }
    };
    DNode.prototype.notifyObserved = function () {
        if (this.state === DNodeState.PENDING)
            throw new Error("Cycle detected");
        var ts = DNode.trackingStack, l = ts.length;
        if (l) {
            var cs = ts[l - 1], csl = cs.length;
            if (cs[csl - 1] !== this && cs[csl - 2] !== this)
                cs[csl] = this;
        }
    };
    DNode.prototype.findCycle = function (node) {
        if (!this.observing)
            return;
        if (this.observing.indexOf(node) !== -1)
            throw new Error("Cycle detected");
        for (var l = this.observing.length, i = 0; i < l; i++)
            this.observing[i].findCycle(node);
    };
    DNode.prototype.dispose = function () {
        for (var l = this.observing.length, i = 0; i < l; i++)
            this.observing[i].removeObserver(this);
        this.observing = [];
    };
    DNode.trackingStack = [];
    return DNode;
})();
var Scheduler = (function () {
    function Scheduler() {
    }
    Scheduler.schedule = function (func) {
        if (Scheduler.inBatch < 1)
            func();
        else
            Scheduler.tasks[Scheduler.tasks.length] = func;
    };
    Scheduler.runPostBatch = function () {
        while (Scheduler.tasks.length) {
            try {
                Scheduler.tasks.shift()();
            }
            catch (e) {
                console && console.error("Failed to run scheduled action: " + e);
                throw e;
            }
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
module.exports = mobservableStatic;
//# sourceMappingURL=mobservable.js.map