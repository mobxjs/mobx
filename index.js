/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
/// <refererence path="./scheduler.ts" />
/// <refererence path="./utils.ts" />
/// <refererence path="./simpleeventemitter.ts" />
/// <refererence path="./dnode.ts" />
/// <refererence path="./observablevalue.ts" />
/// <refererence path="./observablearray.ts" />
/// <refererence path="./computedobservable.ts" />
/// <refererence path="./reactjs.ts" />
var mobservable;
(function (mobservable) {
    function createObservable(value, scope) {
        if (Array.isArray(value))
            return new mobservable.ObservableArray(value);
        if (typeof value === "function")
            return computed(value, scope);
        return mobservable.primitive(value);
    }
    mobservable.createObservable = createObservable;
    mobservable.value = createObservable;
    function reference(value) {
        return new mobservable.ObservableValue(value).createGetterSetter();
    }
    mobservable.reference = reference;
    mobservable.primitive = reference;
    function computed(func, scope) {
        return new mobservable.ComputedObservable(func, scope).createGetterSetter();
    }
    mobservable.computed = computed;
    function expr(expr, scope) {
        if (mobservable.DNode.trackingStack.length === 0)
            throw new Error("mobservable.expr can only be used inside a computed observable. Probably mobservable.computed should be used instead of .expr");
        return new mobservable.ComputedObservable(expr, scope).get();
    }
    mobservable.expr = expr;
    function sideEffect(func, scope) {
        return computed(func, scope).observe(mobservable.noop);
    }
    mobservable.sideEffect = sideEffect;
    function array(values) {
        return new mobservable.ObservableArray(values);
    }
    mobservable.array = array;
    function props(target, props, value) {
        switch (arguments.length) {
            case 0:
                throw new Error("Not enough arguments");
            case 1:
                return props(target, target); // mix target properties into itself
            case 2:
                for (var key in props)
                    props(target, key, props[key]);
                break;
            case 3:
                var isArray = Array.isArray(value);
                var observable = value(value, target);
                Object.defineProperty(target, props, {
                    get: isArray
                        ? function () { return observable; }
                        : observable,
                    set: isArray
                        ? function (newValue) { observable.replace(newValue); }
                        : observable,
                    enumerable: true,
                    configurable: false
                });
                break;
        }
        return target;
    }
    mobservable.props = props;
    function fromJson(source) {
        function convertValue(value) {
            if (!value)
                return value;
            if (typeof value === "object")
                return fromJson(value);
            return value;
        }
        if (source) {
            if (Array.isArray(source))
                return array(source.map(convertValue));
            if (typeof source === "object") {
                var obj = {};
                for (var key in source)
                    if (source.hasOwnProperty(key))
                        obj[key] = convertValue(source[key]);
                return props(obj);
            }
        }
        throw new Error("mobservable.fromJson expects object or array, got: '" + source + "'");
    }
    mobservable.fromJson = fromJson;
    function toJson(source) {
        if (!source)
            return source;
        if (Array.isArray(source) || source instanceof mobservable.ObservableArray)
            return source.map(toJson);
        if (typeof source === "object") {
            var res = {};
            for (var key in source)
                if (source.hasOwnProperty(key))
                    res[key] = toJson(source[key]);
            return res;
        }
        return source;
    }
    mobservable.toJson = toJson;
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
    function observable(target, key, descriptor) {
        var baseValue = descriptor ? descriptor.value : null;
        // observable annotations are invoked on the prototype, not on actual instances,
        // so upon invocation, determine the 'this' instance, and define a property on the
        // instance as well (that hides the propotype property)
        if (typeof baseValue === "function") {
            delete descriptor.value;
            delete descriptor.writable;
            descriptor.configurable = true;
            descriptor.get = function () {
                var observable = this.key = computed(baseValue, this);
                return observable;
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
                    props(this, key, undefined);
                    return this[key];
                },
                set: function (value) {
                    props(this, key, value);
                }
            });
        }
    }
    mobservable.observable = observable;
    /**
     * Inverse function of `props` and `array`, given an (observable) array, returns a plain,
     * non observable version. (non recursive), or given an object with observable properties, returns a clone
     * object with plain properties.
     *
     * Any other value will be returned as is.
     */
    function toPlainValue(value) {
        if (value) {
            if (value instanceof Array)
                return value.slice();
            else if (value instanceof mobservable.ObservableValue)
                return value.get();
            else if (typeof value === "function" && value.impl) {
                if (value.impl instanceof mobservable.ObservableValue)
                    return value();
                else if (value.impl instanceof mobservable.ObservableArray)
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
    mobservable.toPlainValue = toPlainValue;
    /**
        Can be used to observe observable properties that are created using the `observable` annotation,
        `defineObservableProperty` or `initializeObservableProperties`.
        (Since properties do not expose an .observe method themselves).
    */
    function observeProperty(object, key, listener, invokeImmediately) {
        if (invokeImmediately === void 0) { invokeImmediately = false; }
        if (!object)
            throw new Error("Cannot observe property of '" + object + "'");
        if (!(key in object))
            throw new Error("Object '" + object + "' has no property '" + key + "'.");
        if (!listener || typeof listener !== "function")
            throw new Error("Third argument to mobservable.observeProperty should be a function");
        // wrap with observable function
        var observer = new mobservable.ComputedObservable((function () { return object[key]; }), object);
        var disposer = observer.observe(listener, invokeImmediately);
        if (observer.dependencyState.observing.length === 0)
            throw new Error("mobservable.observeProperty: property '" + key + "' of '" + object + " doesn't seem to be observable. Did you define it as observable using @observable or mobservable.props? You might try to use the .observe() method instead.");
        return mobservable.once(function () {
            disposer();
            observer.dependencyState.dispose(); // clean up
        });
    }
    mobservable.observeProperty = observeProperty;
    /**
        Evaluates func and return its results. Watch tracks all observables that are used by 'func'
        and invokes 'onValidate' whenever func *should* update.
        Returns  a tuplde [return value of func, disposer]. The disposer can be used to abort the watch early.
    */
    function watch(func, onInvalidate) {
        var watch = new mobservable.WatchedExpression(func, onInvalidate);
        return [watch.value, function () { return watch.dispose(); }];
    }
    mobservable.watch = watch;
    function batch(action) {
        return mobservable.Scheduler.batch(action);
    }
    mobservable.batch = batch;
    mobservable.debugLevel = 0;
})(mobservable || (mobservable = {}));
/*    export var m:IMObservableStatic = <IMObservableStatic> function(value, scope?) {
        return createObservable(value,scope);
    };
*/
/*
    // For testing purposes only;
    (<any>m).quickDiff = quickDiff;
    (<any>m).stackDepth = () => DNode.trackingStack.length;

*/
/* typescript does not support UMD modules yet, lets do it ourselves... */
/*(declare var define;
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
*/ 
var mobservable;
(function (mobservable) {
    var ObservableValue = (function () {
        function ObservableValue(_value) {
            this._value = _value;
            this.changeEvent = new mobservable.SimpleEventEmitter();
            this.dependencyState = new mobservable.DNode(this);
        }
        ObservableValue.prototype.set = function (value) {
            if (value !== this._value) {
                var oldValue = this._value;
                this.dependencyState.markStale();
                this._value = value;
                this.dependencyState.markReady(true);
                this.changeEvent.emit(value, oldValue);
            }
        };
        ObservableValue.prototype.get = function () {
            this.dependencyState.notifyObserved();
            return this._value;
        };
        ObservableValue.prototype.observe = function (listener, fireImmediately) {
            var _this = this;
            if (fireImmediately === void 0) { fireImmediately = false; }
            this.dependencyState.setRefCount(+1); // awake
            if (fireImmediately)
                listener(this.get(), undefined);
            var disposer = this.changeEvent.on(listener);
            return mobservable.once(function () {
                _this.dependencyState.setRefCount(-1);
                disposer();
            });
        };
        ObservableValue.prototype.createGetterSetter = function () {
            var self = this;
            var f = function (value) {
                if (arguments.length > 0)
                    self.set(value);
                else
                    return self.get();
            };
            f.impl = this;
            f.observe = function (listener, fire) {
                return self.observe(listener, fire);
            };
            f.toString = function () {
                return self.toString();
            };
            return f;
        };
        ObservableValue.prototype.toString = function () {
            return "Observable[" + this._value + "]";
        };
        return ObservableValue;
    })();
    mobservable.ObservableValue = ObservableValue;
})(mobservable || (mobservable = {}));
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var mobservable;
(function (mobservable) {
    var ComputedObservable = (function (_super) {
        __extends(ComputedObservable, _super);
        function ComputedObservable(func, scope) {
            _super.call(this, undefined);
            this.func = func;
            this.scope = scope;
            this.isComputing = false;
            this.hasError = false;
            if (typeof func !== "function")
                throw new Error("ComputedObservable requires a function");
        }
        ComputedObservable.prototype.get = function () {
            if (this.isComputing)
                throw new Error("Cycle detected");
            var state = this.dependencyState;
            if (state.isSleeping) {
                if (mobservable.DNode.trackingStack.length > 0) {
                    // somebody depends on the outcome of this computation
                    state.wakeUp(); // note: wakeup triggers a compute
                    state.notifyObserved();
                }
                else {
                    // nobody depends on this computable; so compute a fresh value but do not wake up
                    this.compute();
                }
            }
            else {
                // we are already up to date, somebody is just inspecting our current value
                state.notifyObserved();
            }
            if (state.hasCycle)
                throw new Error("Cycle detected");
            if (this.hasError) {
                if (mobservable.debugLevel) {
                    console.trace();
                    mobservable.warn(this + ": rethrowing caught exception to observer: " + this._value + (this._value.cause || ''));
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
                // this cycle detection mechanism is primarily for lazy computed values; other cycles are already detected in the dependency tree
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
    })(mobservable.ObservableValue);
    mobservable.ComputedObservable = ComputedObservable;
    /**
     * given an expression, evaluate it once and track its dependencies.
     * Whenever the expression *should* re-evaluate, the onInvalidate event should fire
     */
    var WatchedExpression = (function () {
        function WatchedExpression(expr, onInvalidate) {
            this.expr = expr;
            this.onInvalidate = onInvalidate;
            this.dependencyState = new mobservable.DNode(this);
            this.didEvaluate = false;
            this.dependencyState.computeNextState();
        }
        WatchedExpression.prototype.compute = function () {
            if (!this.didEvaluate) {
                this.didEvaluate = true;
                this.value = this.expr();
            }
            else {
                this.dispose();
                this.onInvalidate();
            }
            return false;
        };
        WatchedExpression.prototype.dispose = function () {
            this.dependencyState.dispose();
        };
        return WatchedExpression;
    })();
    mobservable.WatchedExpression = WatchedExpression;
})(mobservable || (mobservable = {}));
var mobservable;
(function (mobservable) {
    var DNodeState;
    (function (DNodeState) {
        DNodeState[DNodeState["STALE"] = 0] = "STALE";
        DNodeState[DNodeState["PENDING"] = 1] = "PENDING";
        DNodeState[DNodeState["READY"] = 2] = "READY";
    })(DNodeState || (DNodeState = {}));
    ;
    /**
     * A Node in the dependency graph of a (computed)observable.
     *
     * observing: nodes that are needed for this DNode to operate
     * observers: nodes that need this node to operate
     */
    var DNode = (function () {
        function DNode(owner) {
            this.owner = owner;
            this.state = DNodeState.READY;
            this.isSleeping = true; // isSleeping: nobody is observing this dependency node, so don't bother tracking DNode's this DNode depends on
            this.hasCycle = false; // this node is part of a cycle, which is an error
            this.observing = []; // nodes we are looking at. Our value depends on these nodes
            this.prevObserving = null; // nodes we were looking at before. Used to determine changes in the dependency tree
            this.observers = []; // nodes that are dependent on this node. Will be notified when our state change
            this.dependencyChangeCount = 0; // nr of nodes being observed that have received a new value. If > 0, we should recompute
            this.dependencyStaleCount = 0; // nr of nodes being observed that are currently not ready
            this.isDisposed = false; // ready to be garbage collected. Nobody is observing or ever will observe us
            this.externalRefenceCount = 0; // nr of 'things' that depend on us, excluding other DNode's. If > 0, this node will not go to sleep
            this.isComputed = owner.compute !== undefined;
        }
        ;
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
                return; // stale or pending; recalculation already scheduled, we're fine..
            this.state = DNodeState.STALE;
            this.notifyObservers();
        };
        DNode.prototype.markReady = function (stateDidActuallyChange) {
            if (this.state === DNodeState.READY)
                return;
            this.state = DNodeState.READY;
            this.notifyObservers(stateDidActuallyChange);
        };
        DNode.prototype.notifyObservers = function (stateDidActuallyChange) {
            if (stateDidActuallyChange === void 0) { stateDidActuallyChange = false; }
            var os = this.observers.slice();
            for (var l = os.length, i = 0; i < l; i++)
                os[i].notifyStateChange(this, stateDidActuallyChange);
        };
        DNode.prototype.tryToSleep = function () {
            if (!this.isSleeping && this.isComputed && this.observers.length === 0 && this.externalRefenceCount === 0) {
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
        // the state of something we are observing has changed..
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
                    mobservable.Scheduler.schedule(function () {
                        // did any of the observables really change?
                        if (_this.dependencyChangeCount > 0)
                            _this.computeNextState();
                        else
                            // we're done, but didn't change, lets make sure verybody knows..
                            _this.markReady(false);
                        _this.dependencyChangeCount = 0;
                    });
                }
            }
        };
        DNode.prototype.computeNextState = function () {
            this.trackDependencies();
            var stateDidChange = this.owner.compute();
            this.bindDependencies();
            this.markReady(stateDidChange);
        };
        DNode.prototype.trackDependencies = function () {
            this.prevObserving = this.observing;
            DNode.trackingStack[DNode.trackingStack.length] = [];
        };
        DNode.prototype.bindDependencies = function () {
            this.observing = DNode.trackingStack.pop();
            if (this.isComputed && this.observing.length === 0 && mobservable.debugLevel > 1 && !this.isDisposed) {
                console.trace();
                mobservable.warn("You have created a function that doesn't observe any values, did you forget to make its dependencies observable?");
            }
            var _a = mobservable.quickDiff(this.observing, this.prevObserving), added = _a[0], removed = _a[1];
            this.prevObserving = null;
            for (var i = 0, l = removed.length; i < l; i++)
                removed[i].removeObserver(this);
            this.hasCycle = false;
            for (var i = 0, l = added.length; i < l; i++) {
                if (this.isComputed && added[i].findCycle(this)) {
                    this.hasCycle = true;
                    // don't observe anything that caused a cycle, or we are stuck forever!
                    this.observing.splice(this.observing.indexOf(added[i]), 1);
                    added[i].hasCycle = true; // for completeness sake..
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
                // this last item added check is an optimization especially for array loops,
                // because an array.length read with subsequent reads from the array
                // might trigger many observed events, while just checking the last added item is cheap
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
            if (this.observing)
                for (var l = this.observing.length, i = 0; i < l; i++)
                    this.observing[i].removeObserver(this);
            this.observing = null;
            this.isDisposed = true;
        };
        DNode.trackingStack = []; // stack of: list of DNode's being observed by the currently ongoing computation
        return DNode;
    })();
    mobservable.DNode = DNode;
})(mobservable || (mobservable = {}));
var mobservable;
(function (mobservable) {
    // Workaround to make sure ObservableArray extends Array
    var StubArray = (function () {
        function StubArray() {
        }
        return StubArray;
    })();
    StubArray.prototype = [];
    var ObservableArray = (function (_super) {
        __extends(ObservableArray, _super);
        function ObservableArray(initialValues) {
            _super.call(this);
            // make for .. in / Object.keys behave like an array, so hide the other properties
            Object.defineProperties(this, {
                "dependencyState": { enumerable: false, value: new mobservable.DNode(this) },
                "_values": { enumerable: false, value: initialValues ? initialValues.slice() : [] },
                "changeEvent": { enumerable: false, value: new mobservable.SimpleEventEmitter() }
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
        // adds / removes the necessary numeric properties to this object
        ObservableArray.prototype.updateLength = function (oldLength, delta) {
            if (delta < 0)
                for (var i = oldLength + delta; i < oldLength; i++)
                    delete this[i]; // bit faster but mem inefficient: Object.defineProperty(this, <string><any> i, notEnumerableProp);
            else if (delta > 0) {
                if (oldLength + delta > ObservableArray.OBSERVABLE_ARRAY_BUFFER_SIZE)
                    ObservableArray.reserveArrayBuffer(oldLength + delta);
                // funny enough, this is faster than slicing ENUMERABLE_PROPS into defineProperties, and faster as a temporarily map
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
            this.updateLength(length, lengthDelta); // create or remove new entries
            this.notifySplice(index, res, newItems);
            return res;
            var _a;
        };
        ObservableArray.prototype.notifyChildUpdate = function (index, oldValue) {
            this.notifyChanged();
            // conform: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe
            this.changeEvent.emit({ object: this, type: 'update', index: index, oldValue: oldValue });
        };
        ObservableArray.prototype.notifySplice = function (index, deleted, added) {
            if (deleted.length === 0 && added.length === 0)
                return;
            this.notifyChanged();
            // conform: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe
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
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
        ObservableArray.prototype.find = function (predicate, thisArg, fromIndex) {
            if (fromIndex === void 0) { fromIndex = 0; }
            this.dependencyState.notifyObserved();
            var items = this._values, l = items.length;
            for (var i = fromIndex; i < l; i++)
                if (predicate.call(thisArg, items[i], i, this))
                    return items[i];
            return null;
        };
        /*
            functions that do alter the internal structure of the array, (based on lib.es6.d.ts)
            since these functions alter the inner structure of the array, the have side effects.
            Because the have side effects, they should not be used in computed function,
            and for that reason the do not call dependencyState.notifyObserved
         */
        ObservableArray.prototype.splice = function (index, deleteCount) {
            var newItems = [];
            for (var _i = 2; _i < arguments.length; _i++) {
                newItems[_i - 2] = arguments[_i];
            }
            this.sideEffectWarning("splice");
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
            this.sideEffectWarning("push");
            this.spliceWithArray(this._values.length, 0, items);
            return this._values.length;
        };
        ObservableArray.prototype.pop = function () {
            this.sideEffectWarning("pop");
            return this.splice(Math.max(this._values.length - 1, 0), 1)[0];
        };
        ObservableArray.prototype.shift = function () {
            this.sideEffectWarning("shift");
            return this.splice(0, 1)[0];
        };
        ObservableArray.prototype.unshift = function () {
            var items = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                items[_i - 0] = arguments[_i];
            }
            this.sideEffectWarning("unshift");
            this.spliceWithArray(0, 0, items);
            return this._values.length;
        };
        ObservableArray.prototype.reverse = function () {
            this.sideEffectWarning("reverse");
            return this.replace(this._values.reverse());
        };
        ObservableArray.prototype.sort = function (compareFn) {
            this.sideEffectWarning("sort");
            return this.replace(this._values.sort.apply(this._values, arguments));
        };
        ObservableArray.prototype.remove = function (value) {
            this.sideEffectWarning("remove");
            var idx = this._values.indexOf(value);
            if (idx > -1) {
                this.splice(idx, 1);
                return true;
            }
            return false;
        };
        /*
            functions that do not alter the array, from lib.es6.d.ts
        */
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
            // generate a new function that wraps arround the Array.prototype, and replace our own definition
            return (ObservableArray.prototype[funcName] = function () {
                this.dependencyState.notifyObserved();
                return baseFunc.apply(this._values, arguments);
            }).apply(this, initialArgs);
        };
        ObservableArray.prototype.sideEffectWarning = function (funcName) {
            if (mobservable.debugLevel > 0 && mobservable.DNode.trackingStack.length > 0)
                mobservable.warn("[Mobservable.Array] The method array." + funcName + " should probably not be used inside observable functions since it has side-effects");
        };
        ObservableArray.createArrayBufferItem = function (index) {
            var prop = {
                enumerable: false,
                configurable: false,
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
            prop.configurable = true;
            ObservableArray.ENUMERABLE_PROPS[index] = prop;
        };
        ObservableArray.reserveArrayBuffer = function (max) {
            for (var index = ObservableArray.OBSERVABLE_ARRAY_BUFFER_SIZE; index < max; index++)
                ObservableArray.createArrayBufferItem(index);
            ObservableArray.OBSERVABLE_ARRAY_BUFFER_SIZE = max;
        };
        ObservableArray.OBSERVABLE_ARRAY_BUFFER_SIZE = 0;
        ObservableArray.ENUMERABLE_PROPS = [];
        return ObservableArray;
    })(StubArray);
    mobservable.ObservableArray = ObservableArray;
    ObservableArray.reserveArrayBuffer(1000);
})(mobservable || (mobservable = {}));
var mobservable;
(function (mobservable) {
    mobservable.ObserverMixin = {
        componentWillMount: function () {
            var baseRender = this.render;
            this.render = function () {
                var _this = this;
                if (this._watchDisposer)
                    this._watchDisposer();
                var _a = mobservable.watch(function () { return baseRender.call(_this); }, function () {
                    _this.forceUpdate();
                }), rendering = _a[0], disposer = _a[1];
                this._watchDisposer = disposer;
                return rendering;
            };
        },
        componentWillUnmount: function () {
            if (this._watchDisposer)
                this._watchDisposer();
        },
        shouldComponentUpdate: function (nextProps, nextState) {
            // update on any state changes (as is the default)
            if (this.state !== nextState)
                return true;
            // update if props are shallowly not equal, inspired by PureRenderMixin
            var keys = Object.keys(this.props);
            var key;
            if (keys.length !== Object.keys(nextProps).length)
                return true;
            for (var i = keys.length - 1; i >= 0, key = keys[i]; i--)
                if (nextProps[key] !== this.props[key])
                    return true;
            return false;
        }
    };
    function ObservingComponent(componentClass) {
        var baseMount = componentClass.componentWillMount;
        var baseUnmount = componentClass.componentWillUnmount;
        componentClass.prototype.componentWillMount = function () {
            mobservable.ObserverMixin.componentWillMount.apply(this, arguments);
            return baseMount && baseMount.apply(this, arguments);
        };
        componentClass.prototype.componentWillUnmount = function () {
            mobservable.ObserverMixin.componentWillUnmount.apply(this, arguments);
            return baseUnmount && baseUnmount.apply(this, arguments);
        };
        componentClass.prototype.shouldComponentUpdate = mobservable.ObserverMixin.shouldComponentUpdate;
        return componentClass;
    }
    mobservable.ObservingComponent = ObservingComponent;
    ;
})(mobservable || (mobservable = {}));
var mobservable;
(function (mobservable) {
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
            while (Scheduler.tasks.length) {
                try {
                    for (; i < Scheduler.tasks.length; i++)
                        Scheduler.tasks[i]();
                    Scheduler.tasks = [];
                }
                catch (e) {
                    console.error("Failed to run scheduled action, the action has been dropped from the queue: " + e, e);
                    // drop already executed tasks, including the failing one, and continue with other actions, to keep state as stable as possible
                    Scheduler.tasks.splice(0, i + 1);
                }
            }
        };
        Scheduler.batch = function (action) {
            Scheduler.inBatch += 1;
            try {
                return action();
            }
            finally {
                //Scheduler.inBatch -= 1;
                if (--Scheduler.inBatch === 0) {
                    // make sure follow up actions are processed in batch after the current queue
                    Scheduler.inBatch += 1;
                    Scheduler.runPostBatchActions();
                    Scheduler.inBatch -= 1;
                }
            }
        };
        Scheduler.inBatch = 0;
        Scheduler.tasks = [];
        return Scheduler;
    })();
    mobservable.Scheduler = Scheduler;
})(mobservable || (mobservable = {}));
var mobservable;
(function (mobservable) {
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
            return mobservable.once(function () {
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
    mobservable.SimpleEventEmitter = SimpleEventEmitter;
})(mobservable || (mobservable = {}));
var mobservable;
(function (mobservable) {
    function warn(message) {
        if (console)
            console.warn("[WARNING:mobservable] " + message);
    }
    mobservable.warn = warn;
    /**
        Makes sure that the provided function is invoked at most once.
    */
    function once(func) {
        var invoked = false;
        return function () {
            if (invoked)
                return;
            invoked = true;
            return func.apply(this, arguments);
        };
    }
    mobservable.once = once;
    function noop() {
        // NOOP
    }
    mobservable.noop = noop;
    ;
    /**
     * Given a new and an old list, tries to determine which items are added or removed
     * in linear time. The algorithm is heuristic and does not give the optimal results in all cases.
     * (For example, [a,b] -> [b, a] yiels [[b,a],[a,b]])
     * its basic assumptions is that the difference between base and current are a few splices.
     *
     * returns a tuple<addedItems, removedItems>
     * @type {T[]}
     */
    function quickDiff(current, base) {
        if (!base || !base.length)
            return [current, []];
        if (!current || !current.length)
            return [[], base];
        var added = [];
        var removed = [];
        var currentIndex = 0, currentSearch = 0, currentLength = current.length, currentExhausted = false, baseIndex = 0, baseSearch = 0, baseLength = base.length, isSearching = false, baseExhausted = false;
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
                currentIndex = currentSearch + 1;
                baseIndex++;
                isSearching = false;
            }
            else if (!baseExhausted && base[baseSearch] === current[currentIndex]) {
                // items where removed
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
    mobservable.quickDiff = quickDiff;
})(mobservable || (mobservable = {}));
