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
// DNode[][], stack of: list of DNode's being observed by the currently ongoing computation
if (global.__mobservableTrackingStack)
    throw new Error("[mobservable] An incompatible version of mobservable is already loaded.");
global.__mobservableViewStack = [];
var mobservableId = 0;
function checkIfStateIsBeingModifiedDuringView(context) {
    if (core_1.getStrict() === true && isComputingView()) {
        // TODO: add url with detailed error subscription / best practice here:
        var ts = global.__mobservableViewStack;
        throw new Error("[mobservable] It is not allowed to change the state during the computation of a reactive view. Should the data you are trying to modify actually be a view? \nUse 'mobservable.extras.withStrict(false, block)' to allow changes to be made inside views (unrecommended).\nView name: " + context.name + ".\nCurrent stack size is " + ts.length + ", active view: \"" + ts[ts.length - 1].toString() + "\".");
    }
}
exports.checkIfStateIsBeingModifiedDuringView = checkIfStateIsBeingModifiedDuringView;
/**
    * The state of some node in the dependency tree that is created for all views.
    */
(function (NodeState) {
    NodeState[NodeState["STALE"] = 0] = "STALE";
    NodeState[NodeState["PENDING"] = 1] = "PENDING";
    NodeState[NodeState["READY"] = 2] = "READY";
})(exports.NodeState || (exports.NodeState = {}));
var NodeState = exports.NodeState;
;
/**
    * A root node in the dependency graph. This node can be observed by others, but doesn't observe anything itself.
    * These nodes are used to store 'state'.
    */
var DataNode = (function () {
    function DataNode(context) {
        this.id = ++mobservableId;
        this.state = NodeState.READY;
        this.observers = []; // nodes that are dependent on this node. Will be notified when our state change
        this.isDisposed = false; // ready to be garbage collected. Nobody is observing or ever will observe us
        this.externalRefenceCount = 0; // nr of 'things' that depend on us, excluding other DNode's. If > 0, this node will not go to sleep
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
            return; // stale or pending; recalculation already scheduled, we're fine..
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
        var ts = global.__mobservableViewStack, l = ts.length;
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
exports.DataNode = DataNode;
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
                scheduler_1.schedule(function () {
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
        var _this = this;
        this.trackDependencies();
        if (extras_1.transitionTracker)
            extras_1.reportTransition(this, "PENDING");
        var hasError = true;
        try {
            var stateDidChange;
            core_1.withStrict(this.externalRefenceCount === 0, function () {
                stateDidChange = _this.compute();
            });
            hasError = false;
        }
        finally {
            if (hasError)
                // TODO: merge with computable view, use this.func.toString
                console.error("[mobservable.view '" + this.context.name + "'] There was an uncaught error during the computation of " + this.toString());
            // TODO: merge with computable view, so this is correct:
            this.isComputing = false;
            this.bindDependencies();
            this.markReady(stateDidChange);
        }
    };
    ViewNode.prototype.compute = function () {
        throw "Abstract!";
    };
    ViewNode.prototype.trackDependencies = function () {
        this.prevObserving = this.observing;
        this.observing = [];
        global.__mobservableViewStack[global.__mobservableViewStack.length] = this;
    };
    ViewNode.prototype.bindDependencies = function () {
        global.__mobservableViewStack.length -= 1;
        var _a = utils_1.quickDiff(this.observing, this.prevObserving), added = _a[0], removed = _a[1];
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
exports.ViewNode = ViewNode;
function stackDepth() {
    return global.__mobservableViewStack.length;
}
exports.stackDepth = stackDepth;
function isComputingView() {
    return global.__mobservableViewStack.length > 0;
}
exports.isComputingView = isComputingView;
var core_1 = require('./core');
var extras_1 = require('./extras');
var utils_1 = require('./utils');
var scheduler_1 = require('./scheduler');
