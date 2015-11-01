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
var dnode_1 = require('./dnode');
var simpleeventemitter_1 = require('./simpleeventemitter');
var utils_1 = require('./utils');
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
        this.changeEvent = new simpleeventemitter_1.default();
    }
    ObservableView.prototype.get = function () {
        if (this.isComputing)
            throw new Error("[mobservable.view '" + this.context.name + "'] Cycle detected");
        if (this.isSleeping) {
            if (dnode_1.isComputingView()) {
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
        return this._value;
    };
    ObservableView.prototype.set = function (x) {
        throwingViewSetter(this.context.name)();
    };
    ObservableView.prototype.compute = function () {
        // this cycle detection mechanism is primarily for lazy computed values; other cycles are already detected in the dependency tree
        if (this.isComputing)
            throw new Error("[mobservable.view '" + this.context.name + "'] Cycle detected");
        this.isComputing = true;
        var newValue = this.func.call(this.scope);
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
        this.setRefCount(+1); // awake
        if (fireImmediately)
            listener(this.get(), undefined);
        var disposer = this.changeEvent.on(listener);
        return utils_1.once(function () {
            _this.setRefCount(-1);
            disposer();
        });
    };
    ObservableView.prototype.toString = function () {
        return "ComputedObservable[" + this.context.name + ":" + this._value + "] " + this.func.toString();
    };
    return ObservableView;
})(dnode_1.ViewNode);
exports.ObservableView = ObservableView;
