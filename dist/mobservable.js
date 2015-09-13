/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https: //mweststrate.github.io/mobservable
 */
/// <reference path="./api.ts" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var mobservable;
(function (mobservable) {
    var globalScope = (function () { return this; })();
    globalScope.__mobservableTrackingStack = [];
    var _;
    (function (_) {
        var mobservableId = 0;
        (function (DNodeState) {
            DNodeState[DNodeState["STALE"] = 0] = "STALE";
            DNodeState[DNodeState["PENDING"] = 1] = "PENDING";
            DNodeState[DNodeState["READY"] = 2] = "READY";
        })(_.DNodeState || (_.DNodeState = {}));
        var DNodeState = _.DNodeState;
        ;
        var RootDNode = (function () {
            function RootDNode(context) {
                this.context = context;
                this.id = ++mobservableId;
                this.state = DNodeState.READY;
                this.observers = [];
                this.isDisposed = false;
                this.externalRefenceCount = 0;
                if (!context.name)
                    context.name = "[m#" + this.id + "]";
            }
            RootDNode.prototype.setRefCount = function (delta) {
                this.externalRefenceCount += delta;
            };
            RootDNode.prototype.addObserver = function (node) {
                this.observers[this.observers.length] = node;
            };
            RootDNode.prototype.removeObserver = function (node) {
                var obs = this.observers, idx = obs.indexOf(node);
                if (idx !== -1)
                    obs.splice(idx, 1);
            };
            RootDNode.prototype.markStale = function () {
                if (this.state !== DNodeState.READY)
                    return;
                this.state = DNodeState.STALE;
                if (_.transitionTracker)
                    _.reportTransition(this, "STALE");
                this.notifyObservers();
            };
            RootDNode.prototype.markReady = function (stateDidActuallyChange) {
                if (this.state === DNodeState.READY)
                    return;
                this.state = DNodeState.READY;
                if (_.transitionTracker)
                    _.reportTransition(this, "READY", true, this["_value"]);
                this.notifyObservers(stateDidActuallyChange);
            };
            RootDNode.prototype.notifyObservers = function (stateDidActuallyChange) {
                if (stateDidActuallyChange === void 0) { stateDidActuallyChange = false; }
                var os = this.observers.slice();
                for (var l = os.length, i = 0; i < l; i++)
                    os[i].notifyStateChange(this, stateDidActuallyChange);
            };
            RootDNode.prototype.notifyObserved = function () {
                var ts = __mobservableTrackingStack, l = ts.length;
                if (l > 0) {
                    var cs = ts[l - 1], csl = cs.length;
                    if (cs[csl - 1] !== this && cs[csl - 2] !== this)
                        cs[csl] = this;
                }
            };
            RootDNode.prototype.dispose = function () {
                if (this.observers.length)
                    throw new Error("Cannot dispose DNode; it is still being observed");
                this.isDisposed = true;
            };
            RootDNode.prototype.toString = function () {
                return "DNode[" + this.context.name + ", state: " + this.state + ", observers: " + this.observers.length + "]";
            };
            return RootDNode;
        })();
        _.RootDNode = RootDNode;
        var ObservingDNode = (function (_super) {
            __extends(ObservingDNode, _super);
            function ObservingDNode() {
                _super.apply(this, arguments);
                this.isSleeping = true;
                this.hasCycle = false;
                this.observing = [];
                this.prevObserving = null;
                this.dependencyChangeCount = 0;
                this.dependencyStaleCount = 0;
            }
            ObservingDNode.prototype.setRefCount = function (delta) {
                var rc = this.externalRefenceCount += delta;
                if (rc === 0)
                    this.tryToSleep();
                else if (rc === delta)
                    this.wakeUp();
            };
            ObservingDNode.prototype.removeObserver = function (node) {
                _super.prototype.removeObserver.call(this, node);
                this.tryToSleep();
            };
            ObservingDNode.prototype.tryToSleep = function () {
                if (!this.isSleeping && this.observers.length === 0 && this.externalRefenceCount === 0) {
                    for (var i = 0, l = this.observing.length; i < l; i++)
                        this.observing[i].removeObserver(this);
                    this.observing = [];
                    this.isSleeping = true;
                }
            };
            ObservingDNode.prototype.wakeUp = function () {
                if (this.isSleeping) {
                    this.isSleeping = false;
                    this.state = DNodeState.PENDING;
                    this.computeNextState();
                }
            };
            ObservingDNode.prototype.notifyStateChange = function (observable, stateDidActuallyChange) {
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
                        _.Scheduler.schedule(function () {
                            if (_this.dependencyChangeCount > 0)
                                _this.computeNextState();
                            else
                                _this.markReady(false);
                            _this.dependencyChangeCount = 0;
                        });
                    }
                }
            };
            ObservingDNode.prototype.computeNextState = function () {
                this.trackDependencies();
                if (_.transitionTracker)
                    _.reportTransition(this, "PENDING");
                var stateDidChange = this.compute();
                this.bindDependencies();
                this.markReady(stateDidChange);
            };
            ObservingDNode.prototype.compute = function () {
                throw "Abstract!";
            };
            ObservingDNode.prototype.trackDependencies = function () {
                this.prevObserving = this.observing;
                __mobservableTrackingStack[__mobservableTrackingStack.length] = [];
            };
            ObservingDNode.prototype.bindDependencies = function () {
                this.observing = __mobservableTrackingStack.pop();
                if (this.observing.length === 0 && mobservable.logLevel > 1 && !this.isDisposed) {
                    console.error("[mobservable] You have created a view function that doesn't observe any values, did you forget to make its dependencies observable?");
                }
                var _a = _.quickDiff(this.observing, this.prevObserving), added = _a[0], removed = _a[1];
                this.prevObserving = null;
                for (var i = 0, l = removed.length; i < l; i++)
                    removed[i].removeObserver(this);
                this.hasCycle = false;
                for (var i = 0, l = added.length; i < l; i++) {
                    var dependency = added[i];
                    if (dependency instanceof ObservingDNode && dependency.findCycle(this)) {
                        this.hasCycle = true;
                        this.observing.splice(this.observing.indexOf(added[i]), 1);
                        dependency.hasCycle = true;
                    }
                    else {
                        added[i].addObserver(this);
                    }
                }
            };
            ObservingDNode.prototype.findCycle = function (node) {
                var obs = this.observing;
                if (obs.indexOf(node) !== -1)
                    return true;
                for (var l = obs.length, i = 0; i < l; i++)
                    if (obs[i] instanceof ObservingDNode && obs[i].findCycle(node))
                        return true;
                return false;
            };
            ObservingDNode.prototype.dispose = function () {
                if (this.observing)
                    for (var l = this.observing.length, i = 0; i < l; i++)
                        this.observing[i].removeObserver(this);
                this.observing = null;
                _super.prototype.dispose.call(this);
            };
            return ObservingDNode;
        })(RootDNode);
        _.ObservingDNode = ObservingDNode;
        function stackDepth() {
            return __mobservableTrackingStack.length;
        }
        _.stackDepth = stackDepth;
        function isComputingView() {
            return __mobservableTrackingStack.length > 0;
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
    function makeReactive(value, opts) {
        if (isReactive(value))
            return value;
        opts = opts || {};
        if (value instanceof _.AsReference) {
            value = value.value;
            opts.as = "reference";
        }
        var recurse = opts.recurse !== false;
        var sourceType = opts.as === "reference" ? _.ValueType.Reference : _.getTypeOfValue(value);
        var context = {
            name: opts.name,
            object: opts.context || opts.scope
        };
        switch (sourceType) {
            case _.ValueType.Reference:
            case _.ValueType.ComplexObject:
                return _.toGetterSetterFunction(new _.ObservableValue(value, false, context));
            case _.ValueType.ComplexFunction:
                throw new Error("[mobservable:error] Creating reactive functions from functions with multiple arguments is currently not supported, see https://github.com/mweststrate/mobservable/issues/12");
            case _.ValueType.ViewFunction:
                if (!context.name)
                    context.name = value.name;
                return _.toGetterSetterFunction(new _.ObservableView(value, opts.scope || opts.context, context));
            case _.ValueType.Array:
                return new _.ObservableArray(value, recurse, context);
            case _.ValueType.PlainObject:
                return _.extendReactive({}, value, recurse, context);
        }
        throw "Illegal State";
    }
    mobservable.makeReactive = makeReactive;
    function asReference(value) {
        return new _.AsReference(value);
    }
    mobservable.asReference = asReference;
    function isReactive(value) {
        if (value === null || value === undefined)
            return false;
        return !!value.$mobservable;
    }
    mobservable.isReactive = isReactive;
    function sideEffect(func, scope) {
        var observable = new _.ObservableView(func, scope, {
            object: scope,
            name: func.name
        });
        observable.setRefCount(+1);
        var disposer = _.once(function () {
            observable.setRefCount(-1);
        });
        if (mobservable.logLevel >= 2 && observable.observing.length === 0)
            console.warn("[mobservable.sideEffect] not a single observable was used inside the side-effect function. Side-effect would be a no-op.");
        disposer.$mobservable = observable;
        return disposer;
    }
    mobservable.sideEffect = sideEffect;
    function extendReactive(target, properties, context) {
        return _.extendReactive(target, properties, true, context);
    }
    mobservable.extendReactive = extendReactive;
    function observable(target, key, descriptor) {
        var baseValue = descriptor ? descriptor.value : null;
        if (typeof baseValue === "function")
            throw new Error("@observable functions are deprecated. Use @observable (getter) properties instead");
        if (descriptor && descriptor.set)
            throw new Error("@observable properties cannot have a setter.");
        Object.defineProperty(target, key, {
            configurable: true, enumberable: true,
            get: function () {
                _.ObservableObject.asReactive(this, null).set(key, undefined, true);
                return this[key];
            },
            set: function (value) {
                _.ObservableObject.asReactive(this, null).set(key, value, true);
            }
        });
    }
    mobservable.observable = observable;
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
    function observeUntilInvalid(func, onInvalidate, context) {
        console.warn("mobservable.observeUntilInvalid is deprecated and will be removed in 0.7");
        var hasRun = false;
        var result;
        var disposer = sideEffect(function () {
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
    mobservable.logLevel = 1;
    setTimeout(function () {
        if (mobservable.logLevel > 0)
            console.info("Welcome to mobservable. Current logLevel = " + mobservable.logLevel + ". Change mobservable.logLevel according to your needs: 0 = production, 1 = development, 2 = debugging");
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
        function getTypeOfValue(value) {
            if (value === null || value === undefined)
                return ValueType.Reference;
            if (typeof value === "function")
                return value.length ? ValueType.ComplexFunction : ValueType.ViewFunction;
            if (Array.isArray(value) || value instanceof _.ObservableArray)
                return ValueType.Array;
            if (typeof value == 'object')
                return _.isPlainObject(value) ? ValueType.PlainObject : ValueType.ComplexObject;
            return ValueType.Reference;
        }
        _.getTypeOfValue = getTypeOfValue;
        function extendReactive(target, properties, recurse, context) {
            var meta = _.ObservableObject.asReactive(target, context);
            for (var key in properties)
                if (properties.hasOwnProperty(key))
                    meta.set(key, properties[key], recurse);
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
            }
            return AsReference;
        })();
        _.AsReference = AsReference;
    })(_ = mobservable._ || (mobservable._ = {}));
})(mobservable || (mobservable = {}));
var mobservable;
(function (mobservable) {
    var _;
    (function (_) {
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
        _.quickDiff = quickDiff;
    })(_ = mobservable._ || (mobservable._ = {}));
})(mobservable || (mobservable = {}));
var mobservable;
(function (mobservable) {
    var _;
    (function (_) {
        var StubArray = (function () {
            function StubArray() {
            }
            return StubArray;
        })();
        StubArray.prototype = [];
        var ObservableArrayAdministration = (function (_super) {
            __extends(ObservableArrayAdministration, _super);
            function ObservableArrayAdministration(array, recurse, context) {
                _super.call(this, context);
                this.array = array;
                this.recurse = recurse;
                this.values = [];
                this.changeEvent = new _.SimpleEventEmitter();
                if (!context.object)
                    context.object = array;
            }
            return ObservableArrayAdministration;
        })(_.RootDNode);
        _.ObservableArrayAdministration = ObservableArrayAdministration;
        var ObservableArray = (function (_super) {
            __extends(ObservableArray, _super);
            function ObservableArray(initialValues, recurse, context) {
                _super.call(this);
                Object.defineProperty(this, "$mobservable", {
                    enumerable: false,
                    configurable: false,
                    value: new ObservableArrayAdministration(this, recurse, context)
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
                    this.assertNotComputing("spliceWithArray");
                    if (typeof newLength !== "number" || newLength < 0)
                        throw new Error("Out of range: " + newLength);
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
            ObservableArray.prototype.updateLength = function (oldLength, delta) {
                if (delta < 0)
                    for (var i = oldLength + delta; i < oldLength; i++)
                        delete this[i];
                else if (delta > 0) {
                    if (oldLength + delta > OBSERVABLE_ARRAY_BUFFER_SIZE)
                        reserveArrayBuffer(oldLength + delta);
                    for (var i = oldLength, end = oldLength + delta; i < end; i++)
                        Object.defineProperty(this, "" + i, ENUMERABLE_PROPS[i]);
                }
            };
            ObservableArray.prototype.spliceWithArray = function (index, deleteCount, newItems) {
                var _this = this;
                this.assertNotComputing("spliceWithArray");
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
                else if (this.$mobservable.recurse)
                    newItems = newItems.map(function (value) { return _this.makeReactiveArrayItem(value); });
                var lengthDelta = newItems.length - deleteCount;
                var res = (_a = this.$mobservable.values).splice.apply(_a, [index, deleteCount].concat(newItems));
                this.updateLength(length, lengthDelta);
                this.notifySplice(index, res, newItems);
                return res;
                var _a;
            };
            ObservableArray.prototype.makeReactiveArrayItem = function (value) {
                if (mobservable.isReactive(value))
                    return value;
                if (value instanceof _.AsReference)
                    return value = value.value;
                var context = {
                    object: this.$mobservable.context.object,
                    name: this.$mobservable.context.name + "[x]"
                };
                if (Array.isArray(value))
                    return new _.ObservableArray(value, true, context);
                if (_.isPlainObject(value))
                    return _.extendReactive({}, value, true, context);
                return value;
            };
            ObservableArray.prototype.notifyChildUpdate = function (index, oldValue) {
                this.notifyChanged();
                this.$mobservable.changeEvent.emit({ object: this, type: 'update', index: index, oldValue: oldValue });
            };
            ObservableArray.prototype.notifySplice = function (index, deleted, added) {
                if (deleted.length === 0 && added.length === 0)
                    return;
                this.notifyChanged();
                this.$mobservable.changeEvent.emit({ object: this, type: 'splice', index: index, addedCount: added.length, removed: deleted });
            };
            ObservableArray.prototype.notifyChanged = function () {
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
                return new ObservableArray(this.$mobservable.values, this.$mobservable.recurse, {
                    object: null,
                    name: this.$mobservable.context.name + "[clone]"
                });
            };
            ObservableArray.prototype.find = function (predicate, thisArg, fromIndex) {
                if (fromIndex === void 0) { fromIndex = 0; }
                this.$mobservable.notifyObserved();
                var items = this.$mobservable.values, l = items.length;
                for (var i = fromIndex; i < l; i++)
                    if (predicate.call(thisArg, items[i], i, this))
                        return items[i];
                return null;
            };
            ObservableArray.prototype.splice = function (index, deleteCount) {
                var newItems = [];
                for (var _i = 2; _i < arguments.length; _i++) {
                    newItems[_i - 2] = arguments[_i];
                }
                this.assertNotComputing("splice");
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
                this.assertNotComputing("push");
                this.spliceWithArray(this.$mobservable.values.length, 0, items);
                return this.$mobservable.values.length;
            };
            ObservableArray.prototype.pop = function () {
                this.assertNotComputing("pop");
                return this.splice(Math.max(this.$mobservable.values.length - 1, 0), 1)[0];
            };
            ObservableArray.prototype.shift = function () {
                this.assertNotComputing("shift");
                return this.splice(0, 1)[0];
            };
            ObservableArray.prototype.unshift = function () {
                var items = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    items[_i - 0] = arguments[_i];
                }
                this.assertNotComputing("unshift");
                this.spliceWithArray(0, 0, items);
                return this.$mobservable.values.length;
            };
            ObservableArray.prototype.reverse = function () {
                this.assertNotComputing("reverse");
                return this.replace(this.$mobservable.values.reverse());
            };
            ObservableArray.prototype.sort = function (compareFn) {
                this.assertNotComputing("sort");
                return this.replace(this.$mobservable.values.sort.apply(this.$mobservable.values, arguments));
            };
            ObservableArray.prototype.remove = function (value) {
                this.assertNotComputing("remove");
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
            ObservableArray.prototype.assertNotComputing = function (funcName) {
                if (_.isComputingView()) {
                    console.error("mobservable.array: The method array." + funcName + " is not allowed to be used inside reactive views since it alters the state.");
                }
            };
            return ObservableArray;
        })(StubArray);
        _.ObservableArray = ObservableArray;
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
        var OBSERVABLE_ARRAY_BUFFER_SIZE = 0;
        var ENUMERABLE_PROPS = [];
        function createArrayBufferItem(index) {
            var prop = {
                enumerable: false,
                configurable: false,
                set: function (value) {
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
                        throw new Error("ObservableArray: Index out of bounds, " + index + " is larger than " + this.values.length);
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
/// <reference path="./index.ts" />
/// <reference path="./utils.ts" />
/// <reference path="./dnode.ts" />
/// <reference path="./observablearray.ts" />
/// <reference path="./api.ts" />
var mobservable;
(function (mobservable) {
    var _;
    (function (_) {
        function getDNode(thing, property) {
            if (!mobservable.isReactive(thing))
                throw new Error("[mobservable.getDNode] " + thing + " doesn't seem to be reactive");
            if (property !== undefined) {
                __mobservableTrackingStack.push([]);
                try {
                    thing[property];
                }
                finally {
                    var dnode = __mobservableTrackingStack.pop()[0];
                    if (!dnode)
                        throw new Error("[mobservable.getDNode] property '" + property + "' of '" + thing + "' doesn't seem to be a reactive property");
                    return dnode;
                }
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
            if (node instanceof _.ObservingDNode && node.observing.length)
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
/// <reference path="./dnode.ts" />
var mobservable;
(function (mobservable) {
    var _;
    (function (_) {
        _.NON_PURE_VIEW_ERROR = "[mobservable] It is not allowed to change the state during the computation of a reactive view.";
        var ObservableValue = (function (_super) {
            __extends(ObservableValue, _super);
            function ObservableValue(value, recurse, context) {
                _super.call(this, context);
                this.value = value;
                this.recurse = recurse;
                this.changeEvent = new _.SimpleEventEmitter();
                this._value = this.makeReferenceValueReactive(value);
            }
            ObservableValue.prototype.makeReferenceValueReactive = function (value) {
                if (this.recurse && (Array.isArray(value) || _.isPlainObject(value)))
                    return mobservable.makeReactive(value, {
                        context: this.context.object,
                        name: this.context.name
                    });
                return value;
            };
            ObservableValue.prototype.set = function (value) {
                if (_.isComputingView()) {
                    console.error(_.NON_PURE_VIEW_ERROR + (" (stack size is " + __mobservableTrackingStack.length + ")"));
                }
                if (value !== this._value) {
                    var oldValue = this._value;
                    this.markStale();
                    this._value = this.makeReferenceValueReactive(value);
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
        })(_.RootDNode);
        _.ObservableValue = ObservableValue;
    })(_ = mobservable._ || (mobservable._ = {}));
})(mobservable || (mobservable = {}));
/// <reference path="./observablevalue" />
var mobservable;
(function (mobservable) {
    var _;
    (function (_) {
        var ObservableView = (function (_super) {
            __extends(ObservableView, _super);
            function ObservableView(func, scope, context) {
                _super.call(this, context);
                this.func = func;
                this.scope = scope;
                this.isComputing = false;
                this.hasError = false;
                this.changeEvent = new _.SimpleEventEmitter();
            }
            ObservableView.prototype.get = function () {
                if (this.isComputing)
                    throw new Error("Cycle detected");
                if (this.isSleeping) {
                    if (_.isComputingView()) {
                        this.wakeUp();
                        this.notifyObserved();
                    }
                    else {
                        this.wakeUp();
                        this.tryToSleep();
                    }
                }
                else {
                    this.notifyObserved();
                }
                if (this.hasCycle)
                    throw new Error("Cycle detected");
                if (this.hasError) {
                    if (mobservable.logLevel > 0)
                        console.error(this + ": rethrowing caught exception to observer: " + this._value + (this._value.cause || ''));
                    throw this._value;
                }
                return this._value;
            };
            ObservableView.prototype.set = function () {
                throwingSetter();
            };
            ObservableView.prototype.compute = function () {
                var newValue;
                try {
                    if (this.isComputing)
                        throw new Error("[mobservable] Cycle detected");
                    this.isComputing = true;
                    newValue = this.func.call(this.scope);
                    this.hasError = false;
                }
                catch (e) {
                    this.hasError = true;
                    console.error("[mobservable] Caught error during computation: ", e);
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
            ObservableView.prototype.observe = function (listener, fireImmediately) {
                var _this = this;
                if (fireImmediately === void 0) { fireImmediately = false; }
                this.setRefCount(+1);
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
                    set: throwingSetter
                };
            };
            ObservableView.prototype.toString = function () {
                return "ComputedObservable[" + this.context.name + ":" + this._value + "]";
            };
            return ObservableView;
        })(_.ObservingDNode);
        _.ObservableView = ObservableView;
        function throwingSetter() {
            throw new Error("View functions do not accept new values");
        }
    })(_ = mobservable._ || (mobservable._ = {}));
})(mobservable || (mobservable = {}));
/// <reference path="./observablearray.ts" />
/// <reference path="./observableview.ts" />
/// <reference path="./index.ts" />
/// <reference path="./api.ts" />
/// <reference path="./utils.ts" />
var mobservable;
(function (mobservable) {
    var _;
    (function (_) {
        var ObservableObject = (function () {
            function ObservableObject(target, context) {
                this.target = target;
                this.context = context;
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
                this.keys = new _.ObservableArray([], false, {
                    object: target,
                    name: this.context.name + "[keys]"
                });
                Object.defineProperty(target, "$mobservable", {
                    enumerable: false,
                    configurable: false,
                    value: this
                });
            }
            ObservableObject.asReactive = function (target, context) {
                if (target.$mobservable)
                    return target.$mobservable;
                return new ObservableObject(target, context);
            };
            ObservableObject.prototype.set = function (propName, value, recurse) {
                if (this.keys.indexOf(propName) === -1)
                    this.defineReactiveProperty(propName, value, recurse);
                else
                    this.target[propName] = value;
            };
            ObservableObject.prototype.defineReactiveProperty = function (propName, value, recurse) {
                if (value instanceof _.AsReference) {
                    value = value.value;
                    recurse = false;
                }
                var context = {
                    object: this.context.object,
                    name: (this.context.name || "") + "." + propName
                };
                var descriptor;
                if (typeof value === "function" && value.length === 0 && recurse)
                    descriptor = new _.ObservableView(value, this.target, context).asPropertyDescriptor();
                else
                    descriptor = new _.ObservableValue(value, recurse, context).asPropertyDescriptor();
                Object.defineProperty(this.target, propName, descriptor);
            };
            return ObservableObject;
        })();
        _.ObservableObject = ObservableObject;
    })(_ = mobservable._ || (mobservable._ = {}));
})(mobservable || (mobservable = {}));
/// <reference path="./index.ts" />
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
            if (this.state !== nextState)
                return true;
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
        var target = componentClass.prototype || componentClass;
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
var mobservable;
(function (mobservable) {
    var _;
    (function (_) {
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
                    if (--Scheduler.inBatch === 0) {
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
 * This file basically works around all the typescript limitations that exist atm:
 * 1. not being able to generate an external (UMD) module from multiple files (thats why we have internal module)
 * 2. not being able to merge a default export declaration with non-default export declarations
 */
/// <reference path="./utils.ts" />
/// <reference path="./index.ts" />
/// <reference path="./api.ts" />
var forCompilerVerificationOnly = mobservable;
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define('mobservable', [], function () {
            return (factory());
        });
    }
    else if (typeof exports === 'object') {
        module.exports = factory();
    }
    else {
        root['mobservable'] = factory();
    }
}(this, function () {
    var m = mobservable.makeReactive;
    m['default'] = mobservable.makeReactive;
    for (var key in mobservable)
        if (mobservable.hasOwnProperty(key))
            m[key] = mobservable[key];
    return m;
}));
