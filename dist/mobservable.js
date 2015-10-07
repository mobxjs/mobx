(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["mobservable"] = factory();
	else
		root["mobservable"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	function __export(m) {
	    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
	}
	var core = __webpack_require__(1);
	var dnode_1 = __webpack_require__(2);
	var utils_1 = __webpack_require__(7);
	var extras_1 = __webpack_require__(3);
	var simpleeventemitter_1 = __webpack_require__(6);
	__export(__webpack_require__(11));
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = core.observable;
	var core_1 = __webpack_require__(1);
	exports.isObservable = core_1.isObservable;
	exports.observable = core_1.observable;
	exports.extendObservable = core_1.extendObservable;
	exports.asReference = core_1.asReference;
	exports.asFlat = core_1.asFlat;
	exports.asStructure = core_1.asStructure;
	exports.observe = core_1.observe;
	exports.observeUntil = core_1.observeUntil;
	exports.observeAsync = core_1.observeAsync;
	exports.expr = core_1.expr;
	exports.transaction = core_1.transaction;
	exports.toJSON = core_1.toJSON;
	exports.logLevel = core_1.logLevel;
	exports.strict = core_1.strict;
	Object.defineProperties(module.exports, {
	    strict: {
	        enumerable: true,
	        get: function () { return core.strict; },
	        set: function (v) { return core.strict = v; }
	    },
	    logLevel: {
	        enumerable: true,
	        get: function () { return core.logLevel; },
	        set: function (v) { return core.logLevel = v; }
	    }
	});
	exports._ = {
	    isComputingView: dnode_1.isComputingView,
	    quickDiff: utils_1.quickDiff
	};
	exports.extras = {
	    getDNode: extras_1.getDNode,
	    getDependencyTree: extras_1.getDependencyTree,
	    getObserverTree: extras_1.getObserverTree,
	    trackTransitions: extras_1.trackTransitions,
	    SimpleEventEmitter: simpleeventemitter_1.default
	};


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * mobservable
	 * (c) 2015 - Michel Weststrate
	 * https://github.com/mweststrate/mobservable
	 */
	var dnode_1 = __webpack_require__(2);
	var utils_1 = __webpack_require__(7);
	var observablevalue_1 = __webpack_require__(9);
	var observableview_1 = __webpack_require__(5);
	var observablearray_1 = __webpack_require__(8);
	var observableobject_1 = __webpack_require__(4);
	var scheduler_1 = __webpack_require__(10);
	function observable(v, keyOrScope) {
	    if (typeof arguments[1] === "string")
	        return observableDecorator.apply(null, arguments);
	    if (isObservable(v))
	        return v;
	    var _a = getValueModeFromValue(v, ValueMode.Recursive), mode = _a[0], value = _a[1];
	    var sourceType = mode === ValueMode.Reference ? ValueType.Reference : getTypeOfValue(value);
	    switch (sourceType) {
	        case ValueType.Reference:
	        case ValueType.ComplexObject:
	            return toGetterSetterFunction(new observablevalue_1.ObservableValue(value, mode, null));
	        case ValueType.ComplexFunction:
	            throw new Error("[mobservable.makeReactive] Creating reactive functions from functions with multiple arguments is currently not supported, see https://github.com/mweststrate/mobservable/issues/12");
	        case ValueType.ViewFunction: {
	            var context = {
	                name: value.name,
	                object: value
	            };
	            return toGetterSetterFunction(new observableview_1.ObservableView(value, keyOrScope, context, mode === ValueMode.Structure));
	        }
	        case ValueType.Array:
	        case ValueType.PlainObject:
	            return makeChildObservable(value, mode, null);
	    }
	    throw "Illegal State";
	}
	exports.observable = observable;
	function asReference(value) {
	    return new AsReference(value);
	}
	exports.asReference = asReference;
	function asStructure(value) {
	    return new AsStructure(value);
	}
	exports.asStructure = asStructure;
	function asFlat(value) {
	    return new AsFlat(value);
	}
	exports.asFlat = asFlat;
	function isObservable(value) {
	    if (value === null || value === undefined)
	        return false;
	    return !!value.$mobservable;
	}
	exports.isObservable = isObservable;
	function observe(view, scope) {
	    var _a = getValueModeFromValue(view, ValueMode.Recursive), mode = _a[0], unwrappedView = _a[1];
	    var observable = new observableview_1.ObservableView(unwrappedView, scope, {
	        object: scope || view,
	        name: view.name
	    }, mode === ValueMode.Structure);
	    observable.setRefCount(+1);
	    var disposer = utils_1.once(function () {
	        observable.setRefCount(-1);
	    });
	    if (exports.logLevel >= 2 && observable.observing.length === 0)
	        console.warn("[mobservable.observe] not a single observable was used inside the observing function. This observer is now a no-op.");
	    disposer.$mobservable = observable;
	    return disposer;
	}
	exports.observe = observe;
	function observeUntil(predicate, effect, scope) {
	    var disposer = observe(function () {
	        if (predicate.call(scope)) {
	            disposer();
	            effect.call(scope);
	        }
	    });
	    return disposer;
	}
	exports.observeUntil = observeUntil;
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
	    return utils_1.once(function () {
	        disposer();
	        if (timeoutHandle)
	            clearTimeout(timeoutHandle);
	    });
	}
	exports.observeAsync = observeAsync;
	function expr(expr, scope) {
	    if (!dnode_1.isComputingView())
	        throw new Error("[mobservable.expr] 'expr' can only be used inside a computed value.");
	    return observable(expr, scope)();
	}
	exports.expr = expr;
	function extendObservable(target, properties, context) {
	    return extendObservableHelper(target, properties, ValueMode.Recursive, context);
	}
	exports.extendObservable = extendObservable;
	function observableDecorator(target, key, baseDescriptor) {
	    // - In typescript, observable annotations are invoked on the prototype, not on actual instances,
	    // so upon invocation, determine the 'this' instance, and define a property on the
	    // instance as well (that hides the propotype property)
	    // - In typescript, the baseDescriptor is empty for attributes without initial value
	    // - In babel, the initial value is passed as the closure baseDiscriptor.initializer' 
	    var isDecoratingGetter = baseDescriptor && baseDescriptor.hasOwnProperty("get");
	    var descriptor = {};
	    var baseValue = undefined;
	    if (baseDescriptor) {
	        if (baseDescriptor.hasOwnProperty('get'))
	            baseValue = baseDescriptor.get;
	        else if (baseDescriptor.hasOwnProperty('value'))
	            baseValue = baseDescriptor.value;
	        else if (baseDescriptor.initializer) {
	            baseValue = baseDescriptor.initializer();
	            if (typeof baseValue === "function")
	                baseValue = asReference(baseValue);
	        }
	    }
	    if (!target || typeof target !== "object")
	        throw new Error("The @observable decorator can only be used on objects");
	    if (isDecoratingGetter) {
	        if (typeof baseValue !== "function")
	            throw new Error("@observable expects a getter function if used on a property (in member: '" + key + "').");
	        if (descriptor.set)
	            throw new Error("@observable properties cannot have a setter (in member: '" + key + "').");
	        if (baseValue.length !== 0)
	            throw new Error("@observable getter functions should not take arguments (in member: '" + key + "').");
	    }
	    descriptor.configurable = true;
	    descriptor.enumerable = true;
	    descriptor.get = function () {
	        var baseStrict = exports.strict;
	        exports.strict = false;
	        observableobject_1.ObservableObject.asReactive(this, null, ValueMode.Recursive).set(key, baseValue);
	        exports.strict = baseStrict;
	        return this[key];
	    };
	    descriptor.set = isDecoratingGetter
	        ? observableview_1.throwingViewSetter(key)
	        : function (value) {
	            observableobject_1.ObservableObject.asReactive(this, null, ValueMode.Recursive).set(key, typeof value === "function" ? asReference(value) : value);
	        };
	    if (!baseDescriptor) {
	        Object.defineProperty(target, key, descriptor);
	    }
	    else {
	        return descriptor;
	    }
	}
	function toJSON(source) {
	    if (!source)
	        return source;
	    if (Array.isArray(source) || source instanceof observablearray_1.ObservableArray)
	        return source.map(toJSON);
	    if (typeof source === "object" && utils_1.isPlainObject(source)) {
	        var res = {};
	        for (var key in source)
	            if (source.hasOwnProperty(key))
	                res[key] = toJSON(source[key]);
	        return res;
	    }
	    return source;
	}
	exports.toJSON = toJSON;
	function transaction(action) {
	    return scheduler_1.transaction(action);
	}
	exports.transaction = transaction;
	exports.logLevel = 1;
	exports.strict = true;
	setTimeout(function () {
	    if (exports.logLevel > 0)
	        console.info("Welcome to mobservable. Current logLevel = " + exports.logLevel + ". Change mobservable.logLevel according to your needs: 0 = production, 1 = development, 2 = debugging. Strict mode is " + (exports.strict ? 'enabled' : 'disabled') + ".");
	}, 1);
	(function (ValueType) {
	    ValueType[ValueType["Reference"] = 0] = "Reference";
	    ValueType[ValueType["PlainObject"] = 1] = "PlainObject";
	    ValueType[ValueType["ComplexObject"] = 2] = "ComplexObject";
	    ValueType[ValueType["Array"] = 3] = "Array";
	    ValueType[ValueType["ViewFunction"] = 4] = "ViewFunction";
	    ValueType[ValueType["ComplexFunction"] = 5] = "ComplexFunction";
	})(exports.ValueType || (exports.ValueType = {}));
	var ValueType = exports.ValueType;
	(function (ValueMode) {
	    ValueMode[ValueMode["Recursive"] = 0] = "Recursive";
	    ValueMode[ValueMode["Reference"] = 1] = "Reference";
	    ValueMode[ValueMode["Structure"] = 2] = "Structure";
	    ValueMode[ValueMode["Flat"] = 3] = "Flat";
	})(exports.ValueMode || (exports.ValueMode = {}));
	var ValueMode = exports.ValueMode;
	function getTypeOfValue(value) {
	    if (value === null || value === undefined)
	        return ValueType.Reference;
	    if (typeof value === "function")
	        return value.length ? ValueType.ComplexFunction : ValueType.ViewFunction;
	    if (Array.isArray(value) || value instanceof observablearray_1.ObservableArray)
	        return ValueType.Array;
	    if (typeof value == 'object')
	        return utils_1.isPlainObject(value) ? ValueType.PlainObject : ValueType.ComplexObject;
	    return ValueType.Reference;
	}
	exports.getTypeOfValue = getTypeOfValue;
	function extendObservableHelper(target, properties, mode, context) {
	    var meta = observableobject_1.ObservableObject.asReactive(target, context, mode);
	    for (var key in properties)
	        if (properties.hasOwnProperty(key)) {
	            meta.set(key, properties[key]);
	        }
	    return target;
	}
	exports.extendObservableHelper = extendObservableHelper;
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
	exports.toGetterSetterFunction = toGetterSetterFunction;
	var AsReference = (function () {
	    function AsReference(value) {
	        this.value = value;
	        assertUnwrapped(value, "Modifiers are not allowed to be nested");
	    }
	    return AsReference;
	})();
	exports.AsReference = AsReference;
	var AsStructure = (function () {
	    function AsStructure(value) {
	        this.value = value;
	        assertUnwrapped(value, "Modifiers are not allowed to be nested");
	    }
	    return AsStructure;
	})();
	exports.AsStructure = AsStructure;
	var AsFlat = (function () {
	    function AsFlat(value) {
	        this.value = value;
	        assertUnwrapped(value, "Modifiers are not allowed to be nested");
	    }
	    return AsFlat;
	})();
	exports.AsFlat = AsFlat;
	function getValueModeFromValue(value, defaultMode) {
	    if (value instanceof AsReference)
	        return [ValueMode.Reference, value.value];
	    if (value instanceof AsStructure)
	        return [ValueMode.Structure, value.value];
	    if (value instanceof AsFlat)
	        return [ValueMode.Flat, value.value];
	    return [defaultMode, value];
	}
	exports.getValueModeFromValue = getValueModeFromValue;
	function makeChildObservable(value, parentMode, context) {
	    var childMode;
	    if (isObservable(value))
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
	        return new observablearray_1.ObservableArray(value.slice(), childMode, context);
	    if (utils_1.isPlainObject(value))
	        return extendObservableHelper(value, value, childMode, context);
	    return value;
	    var _a;
	}
	exports.makeChildObservable = makeChildObservable;
	function assertUnwrapped(value, message) {
	    if (value instanceof AsReference || value instanceof AsStructure || value instanceof AsFlat)
	        throw new Error("[mobservable] asStructure / asReference / asFlat cannot be used here. " + message);
	}
	exports.assertUnwrapped = assertUnwrapped;


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

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
	var globalScope = (function () { return this; })();
	if (globalScope.__mobservableTrackingStack)
	    throw new Error("[mobservable] An incompatible version of mobservable is already loaded.");
	globalScope.__mobservableViewStack = [];
	var mobservableId = 0;
	function checkIfStateIsBeingModifiedDuringView(context) {
	    if (isComputingView() && core_1.strict === true) {
	        var ts = __mobservableViewStack;
	        throw new Error("[mobservable] It is not allowed to change the state during the computation of a reactive view if 'mobservable.strict' mode is enabled:\nShould the data you are trying to modify actually be a view?\nView name: " + context.name + ".\nCurrent stack size is " + ts.length + ", active view: \"" + ts[ts.length - 1].toString() + "\".");
	    }
	}
	exports.checkIfStateIsBeingModifiedDuringView = checkIfStateIsBeingModifiedDuringView;
	(function (NodeState) {
	    NodeState[NodeState["STALE"] = 0] = "STALE";
	    NodeState[NodeState["PENDING"] = 1] = "PENDING";
	    NodeState[NodeState["READY"] = 2] = "READY";
	})(exports.NodeState || (exports.NodeState = {}));
	var NodeState = exports.NodeState;
	;
	var DataNode = (function () {
	    function DataNode(context) {
	        this.id = ++mobservableId;
	        this.state = NodeState.READY;
	        this.observers = [];
	        this.isDisposed = false;
	        this.externalRefenceCount = 0;
	        if (!context)
	            context = { name: undefined, object: undefined };
	        if (!context.name)
	            context.name = "[m#" + this.id + "]";
	        this.context = context;
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
	            return;
	        this.state = NodeState.STALE;
	        if (extras_1.transitionTracker)
	            extras_1.reportTransition(this, "STALE");
	        this.notifyObservers();
	    };
	    DataNode.prototype.markReady = function (stateDidActuallyChange) {
	        if (this.state === NodeState.READY)
	            return;
	        this.state = NodeState.READY;
	        if (extras_1.transitionTracker)
	            extras_1.reportTransition(this, "READY", true, this["_value"]);
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
	exports.DataNode = DataNode;
	var ViewNode = (function (_super) {
	    __extends(ViewNode, _super);
	    function ViewNode() {
	        _super.apply(this, arguments);
	        this.isSleeping = true;
	        this.hasCycle = false;
	        this.observing = [];
	        this.prevObserving = null;
	        this.dependencyChangeCount = 0;
	        this.dependencyStaleCount = 0;
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
	                scheduler_1.schedule(function () {
	                    if (_this.dependencyChangeCount > 0)
	                        _this.computeNextState();
	                    else
	                        _this.markReady(false);
	                    _this.dependencyChangeCount = 0;
	                });
	            }
	        }
	    };
	    ViewNode.prototype.computeNextState = function () {
	        this.trackDependencies();
	        if (extras_1.transitionTracker)
	            extras_1.reportTransition(this, "PENDING");
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
	        if (this.observing.length === 0 && core_1.logLevel > 1 && !this.isDisposed) {
	            console.error("[mobservable] You have created a view function that doesn't observe any values, did you forget to make its dependencies observable?");
	        }
	        var _a = utils_1.quickDiff(this.observing, this.prevObserving), added = _a[0], removed = _a[1];
	        this.prevObserving = null;
	        this.hasCycle = false;
	        for (var i = 0, l = added.length; i < l; i++) {
	            var dependency = added[i];
	            if (dependency instanceof ViewNode && dependency.findCycle(this)) {
	                this.hasCycle = true;
	                this.observing.splice(this.observing.indexOf(added[i]), 1);
	                dependency.hasCycle = true;
	            }
	            else {
	                added[i].addObserver(this);
	            }
	        }
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
	exports.ViewNode = ViewNode;
	function stackDepth() {
	    return __mobservableViewStack.length;
	}
	exports.stackDepth = stackDepth;
	function isComputingView() {
	    return __mobservableViewStack.length > 0;
	}
	exports.isComputingView = isComputingView;
	var core_1 = __webpack_require__(1);
	var extras_1 = __webpack_require__(3);
	var utils_1 = __webpack_require__(7);
	var scheduler_1 = __webpack_require__(10);


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	var dnode_1 = __webpack_require__(2);
	var observableobject_1 = __webpack_require__(4);
	var simpleeventemitter_1 = __webpack_require__(6);
	var utils_1 = __webpack_require__(7);
	var core_1 = __webpack_require__(1);
	function getDNode(thing, property) {
	    if (!core_1.isObservable(thing))
	        throw new Error("[mobservable.getDNode] " + thing + " doesn't seem to be reactive");
	    if (property !== undefined) {
	        var o = thing.$mobservable;
	        var dnode = o.values && o.values[property];
	        if (!dnode)
	            throw new Error("[mobservable.getDNode] property '" + property + "' of '" + thing + "' doesn't seem to be a reactive property");
	        return dnode;
	    }
	    if (thing.$mobservable) {
	        if (thing.$mobservable instanceof observableobject_1.ObservableObject)
	            throw new Error("[mobservable.getDNode] missing properties parameter. Please specify a property of '" + thing + "'.");
	        return thing.$mobservable;
	    }
	    throw new Error("[mobservable.getDNode] " + thing + " doesn't seem to be reactive");
	}
	exports.getDNode = getDNode;
	function reportTransition(node, state, changed, newValue) {
	    if (changed === void 0) { changed = false; }
	    if (newValue === void 0) { newValue = null; }
	    exports.transitionTracker.emit({
	        id: node.id,
	        name: node.context.name,
	        context: node.context.object,
	        state: state,
	        changed: changed,
	        newValue: newValue
	    });
	}
	exports.reportTransition = reportTransition;
	exports.transitionTracker = null;
	function getDependencyTree(thing, property) {
	    return nodeToDependencyTree(getDNode(thing, property));
	}
	exports.getDependencyTree = getDependencyTree;
	function nodeToDependencyTree(node) {
	    var result = {
	        id: node.id,
	        name: node.context.name,
	        context: node.context.object || null
	    };
	    if (node instanceof dnode_1.ViewNode && node.observing.length)
	        result.dependencies = utils_1.unique(node.observing).map(nodeToDependencyTree);
	    return result;
	}
	function getObserverTree(thing, property) {
	    return nodeToObserverTree(getDNode(thing, property));
	}
	exports.getObserverTree = getObserverTree;
	function nodeToObserverTree(node) {
	    var result = {
	        id: node.id,
	        name: node.context.name,
	        context: node.context.object || null
	    };
	    if (node.observers.length)
	        result.observers = utils_1.unique(node.observers).map(nodeToObserverTree);
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
	    if (!exports.transitionTracker)
	        exports.transitionTracker = new simpleeventemitter_1.default();
	    var reporter = onReport
	        ? function (line) {
	            if (extensive || line.changed)
	                onReport(line);
	        }
	        : createConsoleReporter(extensive);
	    var disposer = exports.transitionTracker.on(reporter);
	    return utils_1.once(function () {
	        disposer();
	        if (exports.transitionTracker.listeners.length === 0)
	            exports.transitionTracker = null;
	    });
	}
	exports.trackTransitions = trackTransitions;


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	var core_1 = __webpack_require__(1);
	var observableview_1 = __webpack_require__(5);
	var observablevalue_1 = __webpack_require__(9);
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
	            this.target[propName] = value;
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
	            observable = new observableview_1.ObservableView(value, this.target, context, false);
	        else if (value instanceof core_1.AsStructure && typeof value.value === "function" && value.value.length === 0)
	            observable = new observableview_1.ObservableView(value.value, this.target, context, true);
	        else
	            observable = new observablevalue_1.ObservableValue(value, this.mode, context);
	        this.values[propName] = observable;
	        Object.defineProperty(this.target, propName, observable.asPropertyDescriptor());
	    };
	    return ObservableObject;
	})();
	exports.ObservableObject = ObservableObject;


/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

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
	var dnode_1 = __webpack_require__(2);
	var simpleeventemitter_1 = __webpack_require__(6);
	var core_1 = __webpack_require__(1);
	var utils_1 = __webpack_require__(7);
	function throwingViewSetter(name) {
	    return function () {
	        throw new Error("[mobservable.view '" + name + "'] View functions do not accept new values");
	    };
	}
	exports.throwingViewSetter = throwingViewSetter;
	var ObservableView = (function (_super) {
	    __extends(ObservableView, _super);
	    function ObservableView(func, scope, context, compareStructural) {
	        _super.call(this, context);
	        this.func = func;
	        this.scope = scope;
	        this.compareStructural = compareStructural;
	        this.isComputing = false;
	        this.hasError = false;
	        this.changeEvent = new simpleeventemitter_1.default();
	    }
	    ObservableView.prototype.get = function () {
	        if (this.isComputing)
	            throw new Error("[mobservable.view '" + this.context.name + "'] Cycle detected");
	        if (this.isSleeping) {
	            if (dnode_1.isComputingView()) {
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
	            throw new Error("[mobservable.view '" + this.context.name + "'] Cycle detected");
	        if (this.hasError) {
	            if (core_1.logLevel > 0)
	                console.error("[mobservable.view '" + this.context.name + "'] Rethrowing caught exception to observer: " + this._value + (this._value.cause || ''));
	            throw this._value;
	        }
	        return this._value;
	    };
	    ObservableView.prototype.set = function () {
	        throwingViewSetter(this.context.name)();
	    };
	    ObservableView.prototype.compute = function () {
	        var newValue;
	        try {
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
	        var changed = this.compareStructural ? !utils_1.deepEquals(newValue, this._value) : newValue !== this._value;
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
	        this.setRefCount(+1);
	        if (fireImmediately)
	            listener(this.get(), undefined);
	        var disposer = this.changeEvent.on(listener);
	        return utils_1.once(function () {
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
	            set: throwingViewSetter(this.context.name)
	        };
	    };
	    ObservableView.prototype.toString = function () {
	        return "ComputedObservable[" + this.context.name + ":" + this._value + "] " + this.func.toString();
	    };
	    return ObservableView;
	})(dnode_1.ViewNode);
	exports.ObservableView = ObservableView;


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	var utils_1 = __webpack_require__(7);
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
	        return utils_1.once(function () {
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
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = SimpleEventEmitter;


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * mobservable
	 * (c) 2015 - Michel Weststrate
	 * https://github.com/mweststrate/mobservable
	 */
	var observablearray_1 = __webpack_require__(8);
	function once(func) {
	    var invoked = false;
	    return function () {
	        if (invoked)
	            return;
	        invoked = true;
	        return func.apply(this, arguments);
	    };
	}
	exports.once = once;
	function unique(list) {
	    var res = [];
	    list.forEach(function (item) {
	        if (res.indexOf(item) === -1)
	            res.push(item);
	    });
	    return res;
	}
	exports.unique = unique;
	function isPlainObject(value) {
	    return value !== null && typeof value == 'object' && Object.getPrototypeOf(value) === Object.prototype;
	}
	exports.isPlainObject = isPlainObject;
	function deepEquals(a, b) {
	    if (a === null && b === null)
	        return true;
	    if (a === undefined && b === undefined)
	        return true;
	    var aIsArray = Array.isArray(a) || a instanceof observablearray_1.ObservableArray;
	    if (aIsArray !== (Array.isArray(b) || b instanceof observablearray_1.ObservableArray)) {
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
	exports.deepEquals = deepEquals;
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
	exports.quickDiff = quickDiff;


/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

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
	var dnode_1 = __webpack_require__(2);
	var simpleeventemitter_1 = __webpack_require__(6);
	var core_1 = __webpack_require__(1);
	var utils_1 = __webpack_require__(7);
	var StubArray = (function () {
	    function StubArray() {
	    }
	    return StubArray;
	})();
	exports.StubArray = StubArray;
	StubArray.prototype = [];
	var ObservableArrayAdministration = (function (_super) {
	    __extends(ObservableArrayAdministration, _super);
	    function ObservableArrayAdministration(array, mode, context) {
	        _super.call(this, context ? context : { name: undefined, object: undefined });
	        this.array = array;
	        this.mode = mode;
	        this.values = [];
	        this.changeEvent = new simpleeventemitter_1.default();
	        if (!this.context.object)
	            this.context.object = array;
	    }
	    return ObservableArrayAdministration;
	})(dnode_1.DataNode);
	exports.ObservableArrayAdministration = ObservableArrayAdministration;
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
	        this.updateLength(length, lengthDelta);
	        this.notifySplice(index, res, newItems);
	        return res;
	        var _a;
	    };
	    ObservableArray.prototype.makeReactiveArrayItem = function (value) {
	        core_1.assertUnwrapped(value, "Array values cannot have modifiers");
	        return core_1.makeChildObservable(value, this.$mobservable.mode, {
	            object: this.$mobservable.context.object,
	            name: this.$mobservable.context.name + "[x]"
	        });
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
	        dnode_1.checkIfStateIsBeingModifiedDuringView(this.$mobservable.context);
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
	    ObservableArray.prototype.toJSON = function () {
	        this.$mobservable.notifyObserved();
	        return this.$mobservable.values.slice();
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
	exports.ObservableArray = ObservableArray;
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
	            core_1.assertUnwrapped(value, "Modifiers cannot be used on array values. For non-reactive array values use makeReactive(asFlat(array)).");
	            if (index < this.$mobservable.values.length) {
	                var oldValue = this.$mobservable.values[index];
	                var changed = this.$mobservable.mode === core_1.ValueMode.Structure ? !utils_1.deepEquals(oldValue, value) : oldValue !== value;
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


/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var dnode_1 = __webpack_require__(2);
	var simpleeventemitter_1 = __webpack_require__(6);
	var core_1 = __webpack_require__(1);
	var utils_1 = __webpack_require__(7);
	var ObservableValue = (function (_super) {
	    __extends(ObservableValue, _super);
	    function ObservableValue(value, mode, context) {
	        _super.call(this, context);
	        this.value = value;
	        this.mode = mode;
	        this.changeEvent = new simpleeventemitter_1.default();
	        var _a = core_1.getValueModeFromValue(value, core_1.ValueMode.Recursive), childmode = _a[0], unwrappedValue = _a[1];
	        if (this.mode === core_1.ValueMode.Recursive)
	            this.mode = childmode;
	        this._value = this.makeReferenceValueReactive(unwrappedValue);
	    }
	    ObservableValue.prototype.makeReferenceValueReactive = function (value) {
	        return core_1.makeChildObservable(value, this.mode, this.context);
	    };
	    ObservableValue.prototype.set = function (newValue) {
	        core_1.assertUnwrapped(newValue, "Modifiers cannot be used on non-initial values.");
	        dnode_1.checkIfStateIsBeingModifiedDuringView(this.context);
	        var changed = this.mode === core_1.ValueMode.Structure ? !utils_1.deepEquals(newValue, this._value) : newValue !== this._value;
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
	})(dnode_1.DataNode);
	exports.ObservableValue = ObservableValue;


/***/ },
/* 10 */
/***/ function(module, exports) {

	var inBatch = 0;
	var tasks = [];
	function schedule(func) {
	    if (inBatch < 1)
	        func();
	    else
	        tasks[tasks.length] = func;
	}
	exports.schedule = schedule;
	function runPostBatchActions() {
	    var i = 0;
	    while (tasks.length) {
	        try {
	            for (; i < tasks.length; i++)
	                tasks[i]();
	            tasks = [];
	        }
	        catch (e) {
	            console.error("Failed to run scheduled action, the action has been dropped from the queue: " + e, e);
	            tasks.splice(0, i + 1);
	        }
	    }
	}
	function transaction(action) {
	    inBatch += 1;
	    try {
	        return action();
	    }
	    finally {
	        if (--inBatch === 0) {
	            inBatch += 1;
	            runPostBatchActions();
	            inBatch -= 1;
	        }
	    }
	}
	exports.transaction = transaction;


/***/ },
/* 11 */
/***/ function(module, exports) {

	

/***/ }
/******/ ])
});
;