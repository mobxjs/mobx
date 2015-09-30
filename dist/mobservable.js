/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
var mobservable;
(function (mobservable) {
    var _;
    (function (_) {
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
        _.once = once;
        function noop() {
            // NOOP
        }
        _.noop = noop;
        function unique(list) {
            var res = [];
            list.forEach(function (item) {
                if (res.indexOf(item) === -1)
                    res.push(item);
            });
            return res;
        }
        _.unique = unique;
        function isPlainObject(value) {
            return value !== null && typeof value == 'object' && Object.getPrototypeOf(value) === Object.prototype;
        }
        _.isPlainObject = isPlainObject;
        /**
         * Naive deepEqual. Doesn't check for prototype, non-enumerable or out-of-range properties on arrays.
         * If you have such a case, you probably should use this function but something fancier :).
         */
        function deepEquals(a, b) {
            if (a === null && b === null)
                return true;
            if (a === undefined && b === undefined)
                return true;
            var aIsArray = Array.isArray(a) || a instanceof _.ObservableArray;
            if (aIsArray !== (Array.isArray(b) || b instanceof _.ObservableArray)) {
                return false;
            }
            else if (aIsArray) {
                if (a.length !== b.length)
                    return false;
                for (var i = a.length; i >= 0; i--)
                    if (!deepEquals(a[i], b[i]))
                        return false;
                return true;
            }
            else if (typeof a === "object" && typeof b === "object") {
                if (a === null || b === null)
                    return false;
                if (Object.keys(a).length !== Object.keys(b).length)
                    return false;
                for (var prop in a) {
                    if (!b.hasOwnProperty(prop))
                        return false;
                    if (!deepEquals(a[prop], b[prop]))
                        return false;
                }
                return true;
            }
            return a === b;
        }
        _.deepEquals = deepEquals;
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
        _.quickDiff = quickDiff;
    })(_ = mobservable._ || (mobservable._ = {}));
})(mobservable || (mobservable = {}));
/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
var mobservable;
(function (mobservable) {
    var _;
    (function (_) {
        // TODO: rewrite to closures instead of this weird static class..
        // TODO: type alias Lambda plz..
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
        _.Scheduler = Scheduler;
    })(_ = mobservable._ || (mobservable._ = {}));
})(mobservable || (mobservable = {}));
/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
var mobservable;
(function (mobservable) {
    var _;
    (function (_) {
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
                return _.once(function () {
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
        _.SimpleEventEmitter = SimpleEventEmitter;
    })(_ = mobservable._ || (mobservable._ = {}));
})(mobservable || (mobservable = {}));
/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var mobservable;
(function (mobservable) {
    var globalScope = (function () { return this; })();
    // DNode[][], stack of: list of DNode's being observed by the currently ongoing computation
    if (globalScope.__mobservableTrackingStack)
        throw new Error("[mobservable] An incompatible version of mobservable is already loaded.");
    globalScope.__mobservableViewStack = [];
    var _;
    (function (_) {
        var mobservableId = 0;
        function checkIfStateIsBeingModifiedDuringView(context) {
            if (isComputingView() && mobservable.strict === true) {
                // TODO: add url with detailed error subscription / best practice here:
                var ts = __mobservableViewStack;
                throw new Error("[mobservable] It is not allowed to change the state during the computation of a reactive view if 'mobservable.strict' mode is enabled:\n Should the data you are trying to modify actually be a view?\n View name: " + context.name + ".\n Current stack size is " + ts.length + ", active view: \"" + ts[ts.length - 1].toString() + "\".");
            }
        }
        _.checkIfStateIsBeingModifiedDuringView = checkIfStateIsBeingModifiedDuringView;
        /**
         * The state of some node in the dependency tree that is created for all views.
         */
        (function (NodeState) {
            NodeState[NodeState["STALE"] = 0] = "STALE";
            NodeState[NodeState["PENDING"] = 1] = "PENDING";
            NodeState[NodeState["READY"] = 2] = "READY";
        })(_.NodeState || (_.NodeState = {}));
        var NodeState = _.NodeState;
        ;
        /**
         * A root node in the dependency graph. This node can be observed by others, but doesn't observe anything itself.
         * These nodes are used to store 'state'.
         */
        var DataNode = (function () {
            function DataNode(context) {
                this.context = context;
                this.id = ++mobservableId;
                this.state = NodeState.READY;
                this.observers = []; // nodes that are dependent on this node. Will be notified when our state change
                this.isDisposed = false; // ready to be garbage collected. Nobody is observing or ever will observe us
                this.externalRefenceCount = 0; // nr of 'things' that depend on us, excluding other DNode's. If > 0, this node will not go to sleep
                if (!context.name)
                    context.name = "[m#" + this.id + "]";
            }
            DataNode.prototype.setRefCount = function (delta) {
                this.externalRefenceCount += delta;
            };
            DataNode.prototype.addObserver = function (node) {
                this.observers[this.observers.length] = node;
            };
            DataNode.prototype.removeObserver = function (node) {
                var obs = this.observers, idx = obs.indexOf(node);
                if (idx !== -1)
                    obs.splice(idx, 1);
            };
            DataNode.prototype.markStale = function () {
                if (this.state !== NodeState.READY)
                    return; // stale or pending; recalculation already scheduled, we're fine..
                this.state = NodeState.STALE;
                if (_.transitionTracker)
                    _.reportTransition(this, "STALE");
                this.notifyObservers();
            };
            DataNode.prototype.markReady = function (stateDidActuallyChange) {
                if (this.state === NodeState.READY)
                    return;
                this.state = NodeState.READY;
                if (_.transitionTracker)
                    _.reportTransition(this, "READY", true, this["_value"]);
                this.notifyObservers(stateDidActuallyChange);
            };
            DataNode.prototype.notifyObservers = function (stateDidActuallyChange) {
                if (stateDidActuallyChange === void 0) { stateDidActuallyChange = false; }
                var os = this.observers.slice();
                for (var l = os.length, i = 0; i < l; i++)
                    os[i].notifyStateChange(this, stateDidActuallyChange);
            };
            DataNode.prototype.notifyObserved = function () {
                var ts = __mobservableViewStack, l = ts.length;
                if (l > 0) {
                    var deps = ts[l - 1].observing, depslength = deps.length;
                    // this last item added check is an optimization especially for array loops,
                    // because an array.length read with subsequent reads from the array
                    // might trigger many observed events, while just checking the latest added items is cheap
                    // (n.b.: this code is inlined and not in observable view for performance reasons)
                    if (deps[depslength - 1] !== this && deps[depslength - 2] !== this)
                        deps[depslength] = this;
                }
            };
            DataNode.prototype.dispose = function () {
                if (this.observers.length)
                    throw new Error("[mobservable] Cannot dispose DNode; it is still being observed");
                this.isDisposed = true;
            };
            DataNode.prototype.toString = function () {
                return "DNode[" + this.context.name + ", state: " + this.state + ", observers: " + this.observers.length + "]";
            };
            return DataNode;
        })();
        _.DataNode = DataNode;
        /**
         * A node in the state dependency root that observes other nodes, and can be observed itself.
         * Represents the state of a View.
         */
        var ViewNode = (function (_super) {
            __extends(ViewNode, _super);
            function ViewNode() {
                _super.apply(this, arguments);
                this.isSleeping = true; // isSleeping: nobody is observing this dependency node, so don't bother tracking DNode's this DNode depends on
                this.hasCycle = false; // this node is part of a cycle, which is an error
                this.observing = []; // nodes we are looking at. Our value depends on these nodes
                this.prevObserving = null; // nodes we were looking at before. Used to determine changes in the dependency tree
                this.dependencyChangeCount = 0; // nr of nodes being observed that have received a new value. If > 0, we should recompute
                this.dependencyStaleCount = 0; // nr of nodes being observed that are currently not ready
            }
            ViewNode.prototype.setRefCount = function (delta) {
                var rc = this.externalRefenceCount += delta;
                if (rc === 0)
                    this.tryToSleep();
                else if (rc === delta)
                    this.wakeUp();
            };
            ViewNode.prototype.removeObserver = function (node) {
                _super.prototype.removeObserver.call(this, node);
                this.tryToSleep();
            };
            ViewNode.prototype.tryToSleep = function () {
                if (!this.isSleeping && this.observers.length === 0 && this.externalRefenceCount === 0) {
                    for (var i = 0, l = this.observing.length; i < l; i++)
                        this.observing[i].removeObserver(this);
                    this.observing = [];
                    this.isSleeping = true;
                }
            };
            ViewNode.prototype.wakeUp = function () {
                if (this.isSleeping) {
                    this.isSleeping = false;
                    this.state = NodeState.PENDING;
                    this.computeNextState();
                }
            };
            // the state of something we are observing has changed..
            ViewNode.prototype.notifyStateChange = function (observable, stateDidActuallyChange) {
                var _this = this;
                if (observable.state === NodeState.STALE) {
                    if (++this.dependencyStaleCount === 1)
                        this.markStale();
                }
                else {
                    if (stateDidActuallyChange)
                        this.dependencyChangeCount += 1;
                    if (--this.dependencyStaleCount === 0) {
                        this.state = NodeState.PENDING;
                        _.Scheduler.schedule(function () {
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
            ViewNode.prototype.computeNextState = function () {
                this.trackDependencies();
                if (_.transitionTracker)
                    _.reportTransition(this, "PENDING");
                var stateDidChange = this.compute();
                this.bindDependencies();
                this.markReady(stateDidChange);
            };
            ViewNode.prototype.compute = function () {
                throw "Abstract!";
            };
            ViewNode.prototype.trackDependencies = function () {
                this.prevObserving = this.observing;
                this.observing = [];
                __mobservableViewStack[__mobservableViewStack.length] = this;
            };
            ViewNode.prototype.bindDependencies = function () {
                __mobservableViewStack.length -= 1;
                if (this.observing.length === 0 && mobservable.logLevel > 1 && !this.isDisposed) {
                    console.error("[mobservable] You have created a view function that doesn't observe any values, did you forget to make its dependencies observable?");
                }
                var _a = _.quickDiff(this.observing, this.prevObserving), added = _a[0], removed = _a[1];
                this.prevObserving = null;
                this.hasCycle = false;
                for (var i = 0, l = added.length; i < l; i++) {
                    var dependency = added[i];
                    if (dependency instanceof ViewNode && dependency.findCycle(this)) {
                        this.hasCycle = true;
                        // don't observe anything that caused a cycle, or we are stuck forever!
                        this.observing.splice(this.observing.indexOf(added[i]), 1);
                        dependency.hasCycle = true; // for completeness sake..
                    }
                    else {
                        added[i].addObserver(this);
                    }
                }
                // remove observers after adding them, so that they don't go in lazy mode to early
                for (var i = 0, l = removed.length; i < l; i++)
                    removed[i].removeObserver(this);
            };
            ViewNode.prototype.findCycle = function (node) {
                var obs = this.observing;
                if (obs.indexOf(node) !== -1)
                    return true;
                for (var l = obs.length, i = 0; i < l; i++)
                    if (obs[i] instanceof ViewNode && obs[i].findCycle(node))
                        return true;
                return false;
            };
            ViewNode.prototype.dispose = function () {
                if (this.observing)
                    for (var l = this.observing.length, i = 0; i < l; i++)
                        this.observing[i].removeObserver(this);
                this.observing = null;
                _super.prototype.dispose.call(this);
            };
            return ViewNode;
        })(DataNode);
        _.ViewNode = ViewNode;
        function stackDepth() {
            return __mobservableViewStack.length;
        }
        _.stackDepth = stackDepth;
        function isComputingView() {
            return __mobservableViewStack.length > 0;
        }
        _.isComputingView = isComputingView;
    })(_ = mobservable._ || (mobservable._ = {}));
})(mobservable || (mobservable = {}));
/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
var mobservable;
(function (mobservable) {
    var _;
    (function (_) {
        var ObservableValue = (function (_super) {
            __extends(ObservableValue, _super);
            function ObservableValue(value, mode, context) {
                _super.call(this, context);
                this.value = value;
                this.mode = mode;
                this.changeEvent = new _.SimpleEventEmitter();
                var _a = _.getValueModeFromValue(value, _.ValueMode.Recursive), childmode = _a[0], unwrappedValue = _a[1];
                // If the value mode is recursive, modifiers like 'structure', 'reference', or 'flat' could apply
                if (this.mode === _.ValueMode.Recursive)
                    this.mode = childmode;
                this._value = this.makeReferenceValueReactive(unwrappedValue);
            }
            ObservableValue.prototype.makeReferenceValueReactive = function (value) {
                return _.makeChildReactive(value, this.mode, this.context);
            };
            ObservableValue.prototype.set = function (newValue) {
                _.assertUnwrapped(newValue, "Modifiers cannot be used on non-initial values.");
                _.checkIfStateIsBeingModifiedDuringView(this.context);
                var changed = this.mode === _.ValueMode.Structure ? !_.deepEquals(newValue, this._value) : newValue !== this._value;
                // Possible improvement; even if changed and structural, apply the minium amount of updates to alter the object,
                // To minimize the amount of observers triggered.
                // Complex. Is that a useful case?
                if (changed) {
                    var oldValue = this._value;
                    this.markStale();
                    this._value = this.makeReferenceValueReactive(newValue);
                    this.markReady(true);
                    this.changeEvent.emit(this._value, oldValue);
                }
            };
            ObservableValue.prototype.get = function () {
                this.notifyObserved();
                return this._value;
            };
            ObservableValue.prototype.observe = function (listener, fireImmediately) {
                if (fireImmediately === void 0) { fireImmediately = false; }
                if (fireImmediately)
                    listener(this.get(), undefined);
                return this.changeEvent.on(listener);
            };
            ObservableValue.prototype.asPropertyDescriptor = function () {
                var _this = this;
                return {
                    configurable: false,
                    enumerable: true,
                    get: function () { return _this.get(); },
                    set: function (value) { return _this.set(value); }
                };
            };
            ObservableValue.prototype.toString = function () {
                return "Observable[" + this.context.name + ":" + this._value + "]";
            };
            return ObservableValue;
        })(_.DataNode);
        _.ObservableValue = ObservableValue;
    })(_ = mobservable._ || (mobservable._ = {}));
})(mobservable || (mobservable = {}));
/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
var mobservable;
(function (mobservable) {
    var _;
    (function (_) {
        // Workaround to make sure ObservableArray extends Array
        var StubArray = (function () {
            function StubArray() {
            }
            return StubArray;
        })();
        StubArray.prototype = [];
        var ObservableArrayAdministration = (function (_super) {
            __extends(ObservableArrayAdministration, _super);
            function ObservableArrayAdministration(array, mode, context) {
                _super.call(this, context);
                this.array = array;
                this.mode = mode;
                this.values = [];
                this.changeEvent = new _.SimpleEventEmitter();
                if (!context.object)
                    context.object = array;
            }
            return ObservableArrayAdministration;
        })(_.DataNode);
        _.ObservableArrayAdministration = ObservableArrayAdministration;
        var ObservableArray = (function (_super) {
            __extends(ObservableArray, _super);
            function ObservableArray(initialValues, mode, context) {
                _super.call(this);
                Object.defineProperty(this, "$mobservable", {
                    enumerable: false,
                    configurable: false,
                    value: new ObservableArrayAdministration(this, mode, context)
                });
                if (initialValues && initialValues.length)
                    this.replace(initialValues);
            }
            Object.defineProperty(ObservableArray.prototype, "length", {
                get: function () {
                    this.$mobservable.notifyObserved();
                    return this.$mobservable.values.length;
                },
                set: function (newLength) {
                    if (typeof newLength !== "number" || newLength < 0)
                        throw new Error("[mobservable.array] Out of range: " + newLength);
                    var currentLength = this.$mobservable.values.length;
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
                    if (oldLength + delta > OBSERVABLE_ARRAY_BUFFER_SIZE)
                        reserveArrayBuffer(oldLength + delta);
                    // funny enough, this is faster than slicing ENUMERABLE_PROPS into defineProperties, and faster as a temporarily map
                    for (var i = oldLength, end = oldLength + delta; i < end; i++)
                        Object.defineProperty(this, "" + i, ENUMERABLE_PROPS[i]);
                }
            };
            ObservableArray.prototype.spliceWithArray = function (index, deleteCount, newItems) {
                var _this = this;
                var length = this.$mobservable.values.length;
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
                else
                    newItems = newItems.map(function (value) { return _this.makeReactiveArrayItem(value); });
                var lengthDelta = newItems.length - deleteCount;
                var res = (_a = this.$mobservable.values).splice.apply(_a, [index, deleteCount].concat(newItems));
                this.updateLength(length, lengthDelta); // create or remove new entries
                this.notifySplice(index, res, newItems);
                return res;
                var _a;
            };
            ObservableArray.prototype.makeReactiveArrayItem = function (value) {
                _.assertUnwrapped(value, "Array values cannot have modifiers");
                return _.makeChildReactive(value, this.$mobservable.mode, {
                    object: this.$mobservable.context.object,
                    name: this.$mobservable.context.name + "[x]"
                });
            };
            ObservableArray.prototype.notifyChildUpdate = function (index, oldValue) {
                this.notifyChanged();
                // conform: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe
                this.$mobservable.changeEvent.emit({ object: this, type: 'update', index: index, oldValue: oldValue });
            };
            ObservableArray.prototype.notifySplice = function (index, deleted, added) {
                if (deleted.length === 0 && added.length === 0)
                    return;
                this.notifyChanged();
                // conform: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe
                this.$mobservable.changeEvent.emit({ object: this, type: 'splice', index: index, addedCount: added.length, removed: deleted });
            };
            ObservableArray.prototype.notifyChanged = function () {
                _.checkIfStateIsBeingModifiedDuringView(this.$mobservable.context);
                this.$mobservable.markStale();
                this.$mobservable.markReady(true);
            };
            ObservableArray.prototype.observe = function (listener, fireImmediately) {
                if (fireImmediately === void 0) { fireImmediately = false; }
                if (fireImmediately)
                    listener({ object: this, type: 'splice', index: 0, addedCount: this.$mobservable.values.length, removed: [] });
                return this.$mobservable.changeEvent.on(listener);
            };
            ObservableArray.prototype.clear = function () {
                return this.splice(0);
            };
            ObservableArray.prototype.replace = function (newItems) {
                return this.spliceWithArray(0, this.$mobservable.values.length, newItems);
            };
            ObservableArray.prototype.values = function () {
                console.warn("mobservable.array.values is deprecated and will be removed in 0.7, use slice() instead");
                this.$mobservable.notifyObserved();
                return this.$mobservable.values.slice();
            };
            ObservableArray.prototype.toJSON = function () {
                this.$mobservable.notifyObserved();
                return this.$mobservable.values.slice();
            };
            ObservableArray.prototype.clone = function () {
                console.warn("mobservable.array.clone is deprecated and will be removed in 0.7");
                this.$mobservable.notifyObserved();
                return new ObservableArray(this.$mobservable.values, this.$mobservable.mode, {
                    object: null,
                    name: this.$mobservable.context.name + "[clone]"
                });
            };
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
            ObservableArray.prototype.find = function (predicate, thisArg, fromIndex) {
                if (fromIndex === void 0) { fromIndex = 0; }
                this.$mobservable.notifyObserved();
                var items = this.$mobservable.values, l = items.length;
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
                this.spliceWithArray(this.$mobservable.values.length, 0, items);
                return this.$mobservable.values.length;
            };
            ObservableArray.prototype.pop = function () {
                return this.splice(Math.max(this.$mobservable.values.length - 1, 0), 1)[0];
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
                return this.$mobservable.values.length;
            };
            ObservableArray.prototype.reverse = function () {
                return this.replace(this.$mobservable.values.reverse());
            };
            ObservableArray.prototype.sort = function (compareFn) {
                return this.replace(this.$mobservable.values.sort.apply(this.$mobservable.values, arguments));
            };
            ObservableArray.prototype.remove = function (value) {
                var idx = this.$mobservable.values.indexOf(value);
                if (idx > -1) {
                    this.splice(idx, 1);
                    return true;
                }
                return false;
            };
            ObservableArray.prototype.toString = function () {
                return "[mobservable.array] " + Array.prototype.toString.apply(this.$mobservable.values, arguments);
            };
            ObservableArray.prototype.toLocaleString = function () {
                return "[mobservable.array] " + Array.prototype.toLocaleString.apply(this.$mobservable.values, arguments);
            };
            ObservableArray.prototype.concat = function () { throw "Illegal state"; };
            ObservableArray.prototype.join = function (separator) { throw "Illegal state"; };
            ObservableArray.prototype.slice = function (start, end) { throw "Illegal state"; };
            ObservableArray.prototype.indexOf = function (searchElement, fromIndex) { throw "Illegal state"; };
            ObservableArray.prototype.lastIndexOf = function (searchElement, fromIndex) { throw "Illegal state"; };
            ObservableArray.prototype.every = function (callbackfn, thisArg) { throw "Illegal state"; };
            ObservableArray.prototype.some = function (callbackfn, thisArg) { throw "Illegal state"; };
            ObservableArray.prototype.forEach = function (callbackfn, thisArg) { throw "Illegal state"; };
            ObservableArray.prototype.map = function (callbackfn, thisArg) { throw "Illegal state"; };
            ObservableArray.prototype.filter = function (callbackfn, thisArg) { throw "Illegal state"; };
            ObservableArray.prototype.reduce = function (callbackfn, initialValue) { throw "Illegal state"; };
            ObservableArray.prototype.reduceRight = function (callbackfn, initialValue) { throw "Illegal state"; };
            return ObservableArray;
        })(StubArray);
        _.ObservableArray = ObservableArray;
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
        ].forEach(function (funcName) {
            var baseFunc = Array.prototype[funcName];
            ObservableArray.prototype[funcName] = function () {
                this.$mobservable.notifyObserved();
                return baseFunc.apply(this.$mobservable.values, arguments);
            };
        });
        /**
         * This array buffer contains two lists of properties, so that all arrays
         * can recycle their property definitions, which significantly improves performance of creating
         * properties on the fly.
         */
        var OBSERVABLE_ARRAY_BUFFER_SIZE = 0;
        var ENUMERABLE_PROPS = [];
        function createArrayBufferItem(index) {
            var prop = {
                enumerable: false,
                configurable: false,
                set: function (value) {
                    _.assertUnwrapped(value, "Modifiers cannot be used on array values. For non-reactive array values use makeReactive(asFlat(array)).");
                    if (index < this.$mobservable.values.length) {
                        var oldValue = this.$mobservable.values[index];
                        var changed = this.$mobservable.mode === _.ValueMode.Structure ? !_.deepEquals(oldValue, value) : oldValue !== value;
                        if (changed) {
                            this.$mobservable.values[index] = this.makeReactiveArrayItem(value);
                            this.notifyChildUpdate(index, oldValue);
                        }
                    }
                    else if (index === this.$mobservable.values.length)
                        this.push(this.makeReactiveArrayItem(value));
                    else
                        throw new Error("[mobservable.array] Index out of bounds, " + index + " is larger than " + this.values.length);
                },
                get: function () {
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
        function reserveArrayBuffer(max) {
            for (var index = OBSERVABLE_ARRAY_BUFFER_SIZE; index < max; index++)
                createArrayBufferItem(index);
            OBSERVABLE_ARRAY_BUFFER_SIZE = max;
        }
        reserveArrayBuffer(1000);
    })(_ = mobservable._ || (mobservable._ = {}));
})(mobservable || (mobservable = {}));
/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
var mobservable;
(function (mobservable) {
    var _;
    (function (_) {
        // responsible for the administration of objects that have become reactive
        var ObservableObject = (function () {
            function ObservableObject(target, context, mode) {
                this.target = target;
                this.context = context;
                this.mode = mode;
                this.values = {};
                if (target.$mobservable)
                    throw new Error("Illegal state: already an reactive object");
                if (!context) {
                    this.context = {
                        object: target,
                        name: ""
                    };
                }
                else if (!context.object) {
                    context.object = target;
                }
                Object.defineProperty(target, "$mobservable", {
                    enumerable: false,
                    configurable: false,
                    value: this
                });
            }
            ObservableObject.asReactive = function (target, context, mode) {
                if (target.$mobservable)
                    return target.$mobservable;
                return new ObservableObject(target, context, mode);
            };
            ObservableObject.prototype.set = function (propName, value) {
                if (this.values[propName])
                    this.target[propName] = value; // the property setter will make 'value' reactive if needed.
                else
                    this.defineReactiveProperty(propName, value);
            };
            ObservableObject.prototype.defineReactiveProperty = function (propName, value) {
                var observable;
                var context = {
                    object: this.context.object,
                    name: (this.context.name || "") + "." + propName
                };
                if (typeof value === "function" && value.length === 0)
                    observable = new _.ObservableView(value, this.target, context, false);
                else if (value instanceof _.AsStructure && typeof value.value === "function" && value.value.length === 0)
                    observable = new _.ObservableView(value.value, this.target, context, true);
                else
                    observable = new _.ObservableValue(value, this.mode, context);
                this.values[propName] = observable;
                Object.defineProperty(this.target, propName, observable.asPropertyDescriptor());
            };
            return ObservableObject;
        })();
        _.ObservableObject = ObservableObject;
    })(_ = mobservable._ || (mobservable._ = {}));
})(mobservable || (mobservable = {}));
/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
var mobservable;
(function (mobservable) {
    var _;
    (function (_) {
        function throwingViewSetter() {
            throw new Error("[mobservable.view '" + this.context.name + "'] View functions do not accept new values");
        }
        _.throwingViewSetter = throwingViewSetter;
        var ObservableView = (function (_super) {
            __extends(ObservableView, _super);
            function ObservableView(func, scope, context, compareStructural) {
                _super.call(this, context);
                this.func = func;
                this.scope = scope;
                this.compareStructural = compareStructural;
                this.isComputing = false;
                this.hasError = false;
                this.changeEvent = new _.SimpleEventEmitter();
            }
            ObservableView.prototype.get = function () {
                if (this.isComputing)
                    throw new Error("[mobservable.view '" + this.context.name + "'] Cycle detected");
                if (this.isSleeping) {
                    if (_.isComputingView()) {
                        // somebody depends on the outcome of this computation
                        this.wakeUp(); // note: wakeup triggers a compute
                        this.notifyObserved();
                    }
                    else {
                        // nobody depends on this computable;
                        // so just compute fresh value and continue to sleep
                        this.wakeUp();
                        this.tryToSleep();
                    }
                }
                else {
                    // we are already up to date, somebody is just inspecting our current value
                    this.notifyObserved();
                }
                if (this.hasCycle)
                    throw new Error("[mobservable.view '" + this.context.name + "'] Cycle detected");
                if (this.hasError) {
                    if (mobservable.logLevel > 0)
                        console.error("[mobservable.view '" + this.context.name + "'] Rethrowing caught exception to observer: " + this._value + (this._value.cause || ''));
                    throw this._value;
                }
                return this._value;
            };
            ObservableView.prototype.set = function () {
                throwingViewSetter.call(this);
            };
            ObservableView.prototype.compute = function () {
                var newValue;
                try {
                    // this cycle detection mechanism is primarily for lazy computed values; other cycles are already detected in the dependency tree
                    if (this.isComputing)
                        throw new Error("[mobservable.view '" + this.context.name + "'] Cycle detected");
                    this.isComputing = true;
                    newValue = this.func.call(this.scope);
                    this.hasError = false;
                }
                catch (e) {
                    this.hasError = true;
                    console.error("[mobservable.view '" + this.context.name + "'] Caught error during computation: ", e, "View function:", this.func.toString());
                    console.trace();
                    if (e instanceof Error)
                        newValue = e;
                    else {
                        newValue = new Error(("[mobservable.view '" + this.context.name + "'] Error during computation (see error.cause) in ") + this.func.toString());
                        newValue.cause = e;
                    }
                }
                this.isComputing = false;
                var changed = this.compareStructural ? !_.deepEquals(newValue, this._value) : newValue !== this._value;
                if (changed) {
                    var oldValue = this._value;
                    this._value = newValue;
                    this.changeEvent.emit(newValue, oldValue);
                    return true;
                }
                return false;
            };
            ObservableView.prototype.observe = function (listener, fireImmediately) {
                var _this = this;
                if (fireImmediately === void 0) { fireImmediately = false; }
                this.setRefCount(+1); // awake
                if (fireImmediately)
                    listener(this.get(), undefined);
                var disposer = this.changeEvent.on(listener);
                return _.once(function () {
                    _this.setRefCount(-1);
                    disposer();
                });
            };
            ObservableView.prototype.asPropertyDescriptor = function () {
                var _this = this;
                return {
                    configurable: false,
                    enumerable: false,
                    get: function () { return _this.get(); },
                    set: throwingViewSetter
                };
            };
            ObservableView.prototype.toString = function () {
                return "ComputedObservable[" + this.context.name + ":" + this._value + "] " + this.func.toString();
            };
            return ObservableView;
        })(_.ViewNode);
        _.ObservableView = ObservableView;
    })(_ = mobservable._ || (mobservable._ = {}));
})(mobservable || (mobservable = {}));
/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
var mobservable;
(function (mobservable) {
    var reactComponentId = 1;
    mobservable.reactiveMixin = {
        componentWillMount: function () {
            var name = (this.displayName || this.constructor.name || "ReactiveComponent") + reactComponentId++;
            var baseRender = this.render;
            this.render = function () {
                var _this = this;
                if (this._watchDisposer)
                    this._watchDisposer();
                var _a = mobservable.observeUntilInvalid(function () { return baseRender.call(_this); }, function () {
                    _this.forceUpdate();
                }, {
                    object: this,
                    name: name
                }), rendering = _a[0], disposer = _a[1], watch = _a[2];
                this.$mobservable = watch;
                this._watchDisposer = disposer;
                return rendering;
            };
        },
        componentWillUnmount: function () {
            if (this._watchDisposer)
                this._watchDisposer();
            delete this._mobservableDNode;
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
    function reactiveComponent(componentClass) {
        console.warn("The use of mobservable.reactiveComponent and mobservable.reactiveMixin is deprecated, please use reactiveComponent from the mobservable-react package");
        var target = componentClass.prototype || componentClass; // For React 0.14
        var baseMount = target.componentWillMount;
        var baseUnmount = target.componentWillUnmount;
        target.componentWillMount = function () {
            mobservable.reactiveMixin.componentWillMount.apply(this, arguments);
            baseMount && baseMount.apply(this, arguments);
        };
        target.componentWillUnmount = function () {
            mobservable.reactiveMixin.componentWillUnmount.apply(this, arguments);
            baseUnmount && baseUnmount.apply(this, arguments);
        };
        if (!target.shouldComponentUpdate)
            target.shouldComponentUpdate = mobservable.reactiveMixin.shouldComponentUpdate;
        return componentClass;
    }
    mobservable.reactiveComponent = reactiveComponent;
    ;
})(mobservable || (mobservable = {}));
// Type definitions for mobservable v0.6.10
// Project: https://mweststrate.github.io/mobservable
// Definitions by: Michel Weststrate <https://github.com/mweststrate/>
// Definitions: https://github.com/borisyankov/DefinitelyTyped
/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
var mobservable;
(function (mobservable) {
    var _;
    (function (_) {
        function getDNode(thing, property) {
            if (!mobservable.isReactive(thing))
                throw new Error("[mobservable.getDNode] " + thing + " doesn't seem to be reactive");
            if (property !== undefined) {
                var o = thing.$mobservable;
                var dnode = o.values && o.values[property];
                if (!dnode)
                    throw new Error("[mobservable.getDNode] property '" + property + "' of '" + thing + "' doesn't seem to be a reactive property");
                return dnode;
            }
            if (thing.$mobservable) {
                if (thing.$mobservable instanceof _.ObservableObject)
                    throw new Error("[mobservable.getDNode] missing properties parameter. Please specify a property of '" + thing + "'.");
                return thing.$mobservable;
            }
            throw new Error("[mobservable.getDNode] " + thing + " doesn't seem to be reactive");
        }
        _.getDNode = getDNode;
        function reportTransition(node, state, changed, newValue) {
            if (changed === void 0) { changed = false; }
            if (newValue === void 0) { newValue = null; }
            _.transitionTracker.emit({
                id: node.id,
                name: node.context.name,
                context: node.context.object,
                state: state,
                changed: changed,
                newValue: newValue
            });
        }
        _.reportTransition = reportTransition;
        _.transitionTracker = null;
    })(_ = mobservable._ || (mobservable._ = {}));
    var extras;
    (function (extras) {
        function getDependencyTree(thing, property) {
            return nodeToDependencyTree(_.getDNode(thing, property));
        }
        extras.getDependencyTree = getDependencyTree;
        function nodeToDependencyTree(node) {
            var result = {
                id: node.id,
                name: node.context.name,
                context: node.context.object || null
            };
            if (node instanceof _.ViewNode && node.observing.length)
                result.dependencies = _.unique(node.observing).map(nodeToDependencyTree);
            return result;
        }
        function getObserverTree(thing, property) {
            return nodeToObserverTree(_.getDNode(thing, property));
        }
        extras.getObserverTree = getObserverTree;
        function nodeToObserverTree(node) {
            var result = {
                id: node.id,
                name: node.context.name,
                context: node.context.object || null
            };
            if (node.observers.length)
                result.observers = _.unique(node.observers).map(nodeToObserverTree);
            if (node.externalRefenceCount > 0)
                result.listeners = node.externalRefenceCount;
            return result;
        }
        function createConsoleReporter(extensive) {
            var lines = [];
            var scheduled = false;
            return function (line) {
                if (extensive || line.changed)
                    lines.push(line);
                if (!scheduled) {
                    scheduled = true;
                    setTimeout(function () {
                        console[console["table"] ? "table" : "dir"](lines);
                        lines = [];
                        scheduled = false;
                    }, 1);
                }
            };
        }
        function trackTransitions(extensive, onReport) {
            if (extensive === void 0) { extensive = false; }
            if (!_.transitionTracker)
                _.transitionTracker = new _.SimpleEventEmitter();
            var reporter = onReport
                ? function (line) {
                    if (extensive || line.changed)
                        onReport(line);
                }
                : createConsoleReporter(extensive);
            var disposer = _.transitionTracker.on(reporter);
            return _.once(function () {
                disposer();
                if (_.transitionTracker.listeners.length === 0)
                    _.transitionTracker = null;
            });
        }
        extras.trackTransitions = trackTransitions;
    })(extras = mobservable.extras || (mobservable.extras = {}));
})(mobservable || (mobservable = {}));
/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
var mobservable;
(function (mobservable) {
    function makeReactive(v, scopeOrName, name) {
        if (isReactive(v))
            return v;
        var opts = _.isPlainObject(scopeOrName) ? scopeOrName : {};
        var _a = _.getValueModeFromValue(v, _.ValueMode.Recursive), mode = _a[0], value = _a[1];
        if (opts.recurse === false) {
            console.warn("[mobservable.makeReactive] option 'recurse: false' is deprecated, use 'mobservable.asFlat' instead");
            mode = _.ValueMode.Flat;
        }
        else if (opts.as === "reference") {
            console.warn("[mobservable.makeReactive] option 'as: \"reference\"' is deprecated, use 'mobservable.asReference' instead");
            mode = _.ValueMode.Reference;
        }
        var sourceType = mode === _.ValueMode.Reference ? _.ValueType.Reference : _.getTypeOfValue(value);
        var scope = opts.scope || (scopeOrName && typeof scopeOrName === "object" ? scopeOrName : null);
        var context = {
            name: name || opts.name,
            object: opts.context || opts.scope
        };
        switch (sourceType) {
            case _.ValueType.Reference:
            case _.ValueType.ComplexObject:
                return _.toGetterSetterFunction(new _.ObservableValue(value, mode, context));
            case _.ValueType.ComplexFunction:
                throw new Error("[mobservable.makeReactive] Creating reactive functions from functions with multiple arguments is currently not supported, see https://github.com/mweststrate/mobservable/issues/12");
            case _.ValueType.ViewFunction:
                if (!context.name)
                    context.name = value.name;
                return _.toGetterSetterFunction(new _.ObservableView(value, opts.scope || opts.context, context, mode === _.ValueMode.Structure));
            case _.ValueType.Array:
            case _.ValueType.PlainObject:
                return _.makeChildReactive(value, mode, context);
        }
        throw "Illegal State";
    }
    mobservable.makeReactive = makeReactive;
    function asReference(value) {
        return new _.AsReference(value);
    }
    mobservable.asReference = asReference;
    function asStructure(value) {
        return new _.AsStructure(value);
    }
    mobservable.asStructure = asStructure;
    function asFlat(value) {
        return new _.AsFlat(value);
    }
    mobservable.asFlat = asFlat;
    function isReactive(value) {
        if (value === null || value === undefined)
            return false;
        return !!value.$mobservable;
    }
    mobservable.isReactive = isReactive;
    function sideEffect(func, scope) {
        console.warn("[mobservable.sideEffect] 'sideEffect' has been renamed to 'observe' and will be removed in a later version.");
        return observe(func, scope);
    }
    mobservable.sideEffect = sideEffect;
    function observe(view, scope) {
        var _a = _.getValueModeFromValue(view, _.ValueMode.Recursive), mode = _a[0], unwrappedView = _a[1];
        var observable = new _.ObservableView(unwrappedView, scope, {
            object: scope,
            name: view.name
        }, mode === _.ValueMode.Structure);
        observable.setRefCount(+1);
        var disposer = _.once(function () {
            observable.setRefCount(-1);
        });
        if (mobservable.logLevel >= 2 && observable.observing.length === 0)
            console.warn("[mobservable.observe] not a single observable was used inside the observing function. This observer is now a no-op.");
        disposer.$mobservable = observable;
        return disposer;
    }
    mobservable.observe = observe;
    function observeUntil(predicate, effect, scope) {
        var disposer = observe(function () {
            if (predicate.call(scope)) {
                disposer();
                effect.call(scope);
            }
        });
        return disposer;
    }
    mobservable.observeUntil = observeUntil;
    function observeAsync(view, effect, delay, scope) {
        if (delay === void 0) { delay = 1; }
        var latestValue = undefined;
        var timeoutHandle;
        var disposer = observe(function () {
            latestValue = view.call(scope);
            if (!timeoutHandle) {
                timeoutHandle = setTimeout(function () {
                    effect.call(scope, latestValue);
                    timeoutHandle = null;
                }, delay);
            }
        });
        return _.once(function () {
            disposer();
            if (timeoutHandle)
                clearTimeout(timeoutHandle);
        });
    }
    mobservable.observeAsync = observeAsync;
    function when(predicate, effect, scope) {
        console.error("[mobservable.when] deprecated, please use 'mobservable.observeUntil'");
        return observeUntil(predicate, effect, scope);
    }
    mobservable.when = when;
    function expr(expr, scope) {
        if (!_.isComputingView())
            throw new Error("[mobservable.expr] 'expr' can only be used inside a computed value.");
        return makeReactive(expr, { scope: scope })();
    }
    mobservable.expr = expr;
    function extendReactive(target, properties, context) {
        return _.extendReactive(target, properties, _.ValueMode.Recursive, context); // No other mode makes sense..?
    }
    mobservable.extendReactive = extendReactive;
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
    function observable(target, key, baseDescriptor) {
        // observable annotations are invoked on the prototype, not on actual instances,
        // so upon invocation, determine the 'this' instance, and define a property on the
        // instance as well (that hides the propotype property)
        var isDecoratingProperty = baseDescriptor && !baseDescriptor.hasOwnProperty("value");
        var descriptor = baseDescriptor || {};
        var baseValue = isDecoratingProperty ? descriptor.get : descriptor.value;
        if (!isDecoratingProperty && typeof baseValue === "function")
            throw new Error("@observable functions are deprecated. Use @observable on a getter function if you want to create a view, or wrap the value in 'asReference' if you want to store a value (found on member '" + key + "').");
        if (isDecoratingProperty) {
            if (typeof baseValue !== "function")
                throw new Error("@observable expects a getter function if used on a property (found on member '" + key + "').");
            if (descriptor.set)
                throw new Error("@observable properties cannot have a setter (found on member '" + key + "').");
            if (baseValue.length !== 0)
                throw new Error("@observable getter functions should not take arguments (found on member '" + key + "').");
        }
        descriptor.configurable = true;
        descriptor.enumerable = true;
        delete descriptor.value;
        delete descriptor.writable;
        descriptor.get = function () {
            _.ObservableObject.asReactive(this, null, _.ValueMode.Recursive).set(key, baseValue);
            return this[key];
        };
        descriptor.set = isDecoratingProperty
            ? _.throwingViewSetter
            : function (value) {
                _.ObservableObject.asReactive(this, null, _.ValueMode.Recursive).set(key, value);
            };
        if (!isDecoratingProperty) {
            Object.defineProperty(target, key, descriptor);
        }
    }
    mobservable.observable = observable;
    /**
     * Basically, a deep clone, so that no reactive property will exist anymore.
     * Doesn't follow references.
     */
    function toJSON(source) {
        if (!source)
            return source;
        if (Array.isArray(source) || source instanceof _.ObservableArray)
            return source.map(toJSON);
        if (typeof source === "object" && _.isPlainObject(source)) {
            var res = {};
            for (var key in source)
                if (source.hasOwnProperty(key))
                    res[key] = toJSON(source[key]);
            return res;
        }
        return source;
    }
    mobservable.toJSON = toJSON;
    function toJson(source) {
        console.warn("mobservable.toJson is deprecated, use mobservable.toJSON instead");
        return toJSON(source);
    }
    mobservable.toJson = toJson;
    function transaction(action) {
        return _.Scheduler.batch(action);
    }
    mobservable.transaction = transaction;
    /**
        Evaluates func and return its results. Watch tracks all observables that are used by 'func'
        and invokes 'onValidate' whenever func *should* update.
        Returns  a tuplde [return value of func, disposer]. The disposer can be used to abort the watch early.
    */
    function observeUntilInvalid(func, onInvalidate, context) {
        console.warn("mobservable.observeUntilInvalid is deprecated and will be removed in 0.7");
        var hasRun = false;
        var result;
        var disposer = observe(function () {
            if (!hasRun) {
                hasRun = true;
                result = func();
            }
            else {
                onInvalidate();
            }
        });
        return [result, disposer, disposer['$mobservable']];
    }
    mobservable.observeUntilInvalid = observeUntilInvalid;
    mobservable.logLevel = 1; // 0 = production, 1 = development, 2 = debugging
    mobservable.strict = true;
    setTimeout(function () {
        if (mobservable.logLevel > 0)
            console.info("Welcome to mobservable. Current logLevel = " + mobservable.logLevel + ". Change mobservable.logLevel according to your needs: 0 = production, 1 = development, 2 = debugging. Strict mode is " + (mobservable.strict ? 'enabled' : 'disabled') + ".");
    }, 1);
    var _;
    (function (_) {
        (function (ValueType) {
            ValueType[ValueType["Reference"] = 0] = "Reference";
            ValueType[ValueType["PlainObject"] = 1] = "PlainObject";
            ValueType[ValueType["ComplexObject"] = 2] = "ComplexObject";
            ValueType[ValueType["Array"] = 3] = "Array";
            ValueType[ValueType["ViewFunction"] = 4] = "ViewFunction";
            ValueType[ValueType["ComplexFunction"] = 5] = "ComplexFunction";
        })(_.ValueType || (_.ValueType = {}));
        var ValueType = _.ValueType;
        (function (ValueMode) {
            ValueMode[ValueMode["Recursive"] = 0] = "Recursive";
            ValueMode[ValueMode["Reference"] = 1] = "Reference";
            ValueMode[ValueMode["Structure"] = 2] = "Structure";
            // No observers will be triggered if a new value is assigned (to a part of the tree) that deeply equals the old value.
            ValueMode[ValueMode["Flat"] = 3] = "Flat"; // If the value is an plain object, it will be made reactive, and so will all its future children.
        })(_.ValueMode || (_.ValueMode = {}));
        var ValueMode = _.ValueMode;
        function getTypeOfValue(value) {
            if (value === null || value === undefined)
                return ValueType.Reference;
            if (typeof value === "function")
                return value.length ? ValueType.ComplexFunction : ValueType.ViewFunction;
            if (Array.isArray(value) || value instanceof _.ObservableArray)
                return ValueType.Array;
            if (typeof value == 'object')
                return _.isPlainObject(value) ? ValueType.PlainObject : ValueType.ComplexObject;
            return ValueType.Reference; // safe default, only refer by reference..
        }
        _.getTypeOfValue = getTypeOfValue;
        function extendReactive(target, properties, mode, context) {
            var meta = _.ObservableObject.asReactive(target, context, mode);
            for (var key in properties)
                if (properties.hasOwnProperty(key)) {
                    meta.set(key, properties[key]);
                }
            return target;
        }
        _.extendReactive = extendReactive;
        function toGetterSetterFunction(observable) {
            var f = function (value) {
                if (arguments.length > 0)
                    observable.set(value);
                else
                    return observable.get();
            };
            f.$mobservable = observable;
            f.observe = function (listener, fire) {
                return observable.observe(listener, fire);
            };
            f.toString = function () {
                return observable.toString();
            };
            return f;
        }
        _.toGetterSetterFunction = toGetterSetterFunction;
        var AsReference = (function () {
            function AsReference(value) {
                this.value = value;
                assertUnwrapped(value, "Modifiers are not allowed to be nested");
            }
            return AsReference;
        })();
        _.AsReference = AsReference;
        var AsStructure = (function () {
            function AsStructure(value) {
                this.value = value;
                assertUnwrapped(value, "Modifiers are not allowed to be nested");
            }
            return AsStructure;
        })();
        _.AsStructure = AsStructure;
        var AsFlat = (function () {
            function AsFlat(value) {
                this.value = value;
                assertUnwrapped(value, "Modifiers are not allowed to be nested");
            }
            return AsFlat;
        })();
        _.AsFlat = AsFlat;
        function getValueModeFromValue(value, defaultMode) {
            if (value instanceof AsReference)
                return [ValueMode.Reference, value.value];
            if (value instanceof AsStructure)
                return [ValueMode.Structure, value.value];
            if (value instanceof AsFlat)
                return [ValueMode.Flat, value.value];
            return [defaultMode, value];
        }
        _.getValueModeFromValue = getValueModeFromValue;
        function makeChildReactive(value, parentMode, context) {
            var childMode;
            if (isReactive(value))
                return value;
            switch (parentMode) {
                case ValueMode.Reference:
                    return value;
                case ValueMode.Flat:
                    assertUnwrapped(value, "Items inside 'asFlat' canont have modifiers");
                    childMode = ValueMode.Reference;
                    break;
                case ValueMode.Structure:
                    assertUnwrapped(value, "Items inside 'asStructure' canont have modifiers");
                    childMode = ValueMode.Structure;
                    break;
                case ValueMode.Recursive:
                    _a = getValueModeFromValue(value, ValueMode.Recursive), childMode = _a[0], value = _a[1];
                    break;
                default:
                    throw "Illegal State";
            }
            if (Array.isArray(value))
                return new _.ObservableArray(value.slice(), childMode, context);
            if (_.isPlainObject(value))
                return _.extendReactive(value, value, childMode, context);
            return value;
            var _a;
        }
        _.makeChildReactive = makeChildReactive;
        function assertUnwrapped(value, message) {
            if (value instanceof AsReference || value instanceof AsStructure || value instanceof AsFlat)
                throw new Error("[mobservable] asStructure / asReference / asFlat cannot be used here. " + message);
        }
        _.assertUnwrapped = assertUnwrapped;
    })(_ = mobservable._ || (mobservable._ = {}));
})(mobservable || (mobservable = {}));
/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
/**
 * This file basically works around all the typescript limitations that exist atm:
 * 1. not being able to generate an external (UMD) module from multiple files (thats why we have internal module)
 * 2. not being able to merge a default export declaration with non-default export declarations
 */
/**
 * This complete file is a fight against the system since typescript cannot decently generate
 * ambient declarations from internal modules, merge default exports etc. etc.
 */
// Let the compiler figure out whether we are still compatible with the api..
var forCompilerVerificationOnly = mobservable;
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD.
        define('mobservable', [], function () {
            return (factory());
        });
    }
    else if (typeof exports === 'object') {
        // CommonJS like
        module.exports = factory();
    }
    else {
        // register global
        root['mobservable'] = factory();
    }
}(this, function () {
    var m = mobservable.makeReactive; // The default export
    m['default'] = mobservable.makeReactive;
    for (var key in mobservable)
        if (mobservable.hasOwnProperty(key))
            m[key] = mobservable[key]; // the non-default exports
    // Turn by-value-exports into properties  :-/
    Object.defineProperties(m, {
        logLevel: {
            get: function () { return mobservable.logLevel; },
            set: function (value) { return mobservable.logLevel = value; },
            enumerable: true
        },
        strict: {
            get: function () { return mobservable.strict; },
            set: function (value) { return mobservable.strict = value; },
            enumerable: true
        }
    });
    return m;
}));
//# sourceMappingURL=mobservable.js.map