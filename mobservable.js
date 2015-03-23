/// <reference path="./typings/node-0.10.d.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/**
 * MOBservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
var events = require('events');
function property(value, scope) {
    var prop = null;
    if (typeof value === "function")
        prop = new ComputedProperty(value, scope);
    else
        prop = new Property(value, scope);
    var propFunc = function (value) {
        if (arguments.length > 0)
            return prop.set(value);
        else
            return prop.get();
    };
    propFunc.subscribe = prop.subscribe.bind(prop);
    return propFunc;
}
exports.property = property;
function guard(func, onInvalidate) {
    var dnode = new DNode();
    var retVal;
    dnode.compute = function (done) {
        retVal = func();
        dnode.compute = function (done2) {
            done2();
            dnode.dispose();
            onInvalidate();
        };
        done();
    };
    dnode.computeNextValue();
    return [retVal, function () { return dnode.dispose(); }];
}
exports.guard = guard;
function batch(action) {
    Scheduler.batch(action);
}
exports.batch = batch;
function onReady(listener) {
    return Scheduler.onReady(listener);
}
exports.onReady = onReady;
function onceReady(listener) {
    Scheduler.onceReady(listener);
}
exports.onceReady = onceReady;
function defineProperty(object, name, initialValue) {
    var _property = property(initialValue, object);
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
}
exports.defineProperty = defineProperty;
var Property = (function () {
    function Property(_value, scope) {
        this._value = _value;
        this.scope = scope;
        this.events = new events.EventEmitter();
        this.dependencyState = new DNode();
    }
    Property.prototype.set = function (value) {
        if (value !== this._value) {
            var oldValue = this._value;
            this.dependencyState.markStale();
            this._value = value;
            this.dependencyState.markReady();
            this.events.emit('change', value, oldValue);
        }
        return this.scope;
    };
    Property.prototype.get = function () {
        this.dependencyState.notifyObserved();
        return this._value;
    };
    Property.prototype.subscribe = function (listener, fireImmediately) {
        var _this = this;
        if (fireImmediately === void 0) { fireImmediately = false; }
        var current = this.get(); // make sure the values are initialized
        if (fireImmediately)
            listener(current, undefined);
        this.events.addListener('change', listener);
        return function () {
            _this.events.removeListener('change', listener);
        };
    };
    Property.prototype.toString = function () {
        return "Property[" + this._value + "]";
    };
    return Property;
})();
var ComputedProperty = (function (_super) {
    __extends(ComputedProperty, _super);
    function ComputedProperty(func, scope) {
        var _this = this;
        _super.call(this, undefined, scope);
        this.func = func;
        this.initialized = false;
        this.privateSetter = null;
        if (!func)
            throw new Error("Computed required a function");
        this.privateSetter = this.set;
        this.set = function () {
            throw new Error("Computed cannot retrieve a new value!");
            return _this.scope;
        };
        this.dependencyState.compute = this.compute.bind(this);
    }
    ComputedProperty.prototype.get = function () {
        // first evaluation is lazy
        if (!this.initialized) {
            this.initialized = true; // prevents endless recursion in cycles (cycles themselves are only detected after finishing the computation)
            this.dependencyState.computeNextValue();
        }
        return _super.prototype.get.call(this); // assumption: Compute<> is always synchronous for computed properties
    };
    ComputedProperty.prototype.compute = function (onComplete) {
        this.privateSetter.call(this, this.func.call(this.scope));
        this.initialized = true;
        onComplete();
    };
    ComputedProperty.prototype.toString = function () {
        return "Property[" + this.func.toString() + "]";
    };
    return ComputedProperty;
})(Property);
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
        this.observing = [];
        this.prevObserving = [];
        this.observers = [];
    }
    DNode.prototype.addObserver = function (node) {
        this.observers.push(node);
    };
    DNode.prototype.removeObserver = function (node) {
        var idx = this.observers.indexOf(node);
        if (idx !== -1)
            this.observers.splice(idx, 1);
    };
    DNode.prototype.hasObservingChanged = function () {
        if (this.observing.length !== this.prevObserving.length)
            return true;
        for (var i = 0; i < this.observing.length; i++)
            if (this.observing[i] !== this.prevObserving[i])
                return true;
        return false;
    };
    DNode.prototype.markStale = function () {
        var _this = this;
        if (this.state === 1 /* PENDING */)
            return; // recalculation already scheduled, we're fine..
        if (this.state === 0 /* STALE */)
            return;
        this.state = 0 /* STALE */;
        this.observers.forEach(function (observer) { return observer.notifyStateChange(_this); });
    };
    DNode.prototype.markReady = function () {
        var _this = this;
        if (this.state === 2 /* READY */)
            return;
        this.state = 2 /* READY */;
        this.observers.forEach(function (observer) { return observer.notifyStateChange(_this); });
        Scheduler.scheduleReady();
    };
    DNode.prototype.notifyStateChange = function (observable) {
        var _this = this;
        switch (this.state) {
            case 0 /* STALE */:
                // The observable has become stable, and all others are stable as well, we can compute now!
                if (observable.state === 2 /* READY */ && this.observing.filter(function (o) { return o.state !== 2 /* READY */; }).length === 0) {
                    this.state = 1 /* PENDING */;
                    Scheduler.schedule(function () { return _this.computeNextValue(); });
                }
                break;
            case 1 /* PENDING */:
            case 2 /* READY */:
                if (observable.state === 0 /* STALE */)
                    this.markStale();
                break;
        }
    };
    DNode.prototype.computeNextValue = function () {
        var _this = this;
        this.trackDependencies();
        this.compute(function () {
            _this.bindDependencies();
            _this.markReady();
        });
    };
    DNode.prototype.compute = function (onComplete) {
        onComplete();
    };
    DNode.prototype.trackDependencies = function () {
        this.prevObserving = this.observing;
        DNode.trackingStack.unshift([]);
    };
    DNode.prototype.bindDependencies = function () {
        var _this = this;
        this.observing = DNode.trackingStack.shift();
        if (this.hasObservingChanged()) {
            this.prevObserving.forEach(function (observing) { return observing.removeObserver(_this); });
            this.observing.forEach(function (observable) { return observable.addObserver(_this); });
            this.findCycle(this);
        }
    };
    DNode.prototype.notifyObserved = function () {
        if (this.state === 1 /* PENDING */)
            throw new Error("Cycle detected");
        if (DNode.trackingStack.length)
            DNode.trackingStack[0].push(this);
    };
    DNode.prototype.findCycle = function (node) {
        if (!this.observing)
            return;
        if (this.observing.indexOf(node) !== -1)
            throw new Error("Cycle detected");
        this.observing.forEach(function (o) { return o.findCycle(node); });
    };
    DNode.prototype.dispose = function () {
        var _this = this;
        this.observing.forEach(function (observing) { return observing.removeObserver(_this); });
        this.observing = [];
        // Do something with the observers, notify some state like KILLED?
    };
    /*
        Dependency detection
    */
    // TODO: is trackingstack + push/pop still valid if DNode.compute is executed asynchronously?
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
            Scheduler.tasks.push(func);
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
