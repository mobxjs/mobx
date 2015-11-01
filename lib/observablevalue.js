var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
var dnode_1 = require('./dnode');
var simpleeventemitter_1 = require('./simpleeventemitter');
var core_1 = require('./core');
var utils_1 = require('./utils');
var ObservableValue = (function (_super) {
    __extends(ObservableValue, _super);
    function ObservableValue(value, mode, context) {
        _super.call(this, context);
        this.value = value;
        this.mode = mode;
        this.changeEvent = new simpleeventemitter_1.default();
        var _a = core_1.getValueModeFromValue(value, core_1.ValueMode.Recursive), childmode = _a[0], unwrappedValue = _a[1];
        // If the value mode is recursive, modifiers like 'structure', 'reference', or 'flat' could apply
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
        return changed;
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
    ObservableValue.prototype.toString = function () {
        return "Observable[" + this.context.name + ":" + this._value + "]";
    };
    return ObservableValue;
})(dnode_1.DataNode);
exports.ObservableValue = ObservableValue;
