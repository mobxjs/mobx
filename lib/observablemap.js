var observablevalue_1 = require('./observablevalue');
var core_1 = require('./core');
var simpleeventemitter_1 = require('./simpleeventemitter');
var observablearray_1 = require('./observablearray');
var ObservableMap = (function () {
    function ObservableMap(initialData, valueModeFunc) {
        this.$mobservable = true;
        this._data = {};
        this._hasMap = {}; // hasMap, not hashMap >-).
        this._keys = new observablearray_1.ObservableArray(null, core_1.ValueMode.Reference, {
            name: ".keys()",
            object: this
        });
        this._events = new simpleeventemitter_1.default();
        this._valueMode = core_1.getValueModeFromModifierFunc(valueModeFunc);
        if (initialData)
            this.merge(initialData);
    }
    ObservableMap.prototype._has = function (key) {
        return typeof this._data[key] !== 'undefined';
    };
    ObservableMap.prototype.has = function (key) {
        this.assertValidKey(key);
        if (this._hasMap[key])
            return this._hasMap[key].get();
        return this._updateHasMapEntry(key, false).get();
    };
    ObservableMap.prototype.set = function (key, value) {
        var _this = this;
        this.assertValidKey(key);
        core_1.assertUnwrapped(value, "[mobservable.map.set] Expected unwrapped value to be inserted to key '" + key + "'. If you need to use modifiers pass them as second argument to the constructor");
        if (this._has(key)) {
            var oldValue = this._data[key]._value;
            var changed = this._data[key].set(value);
            if (changed) {
                this._events.emit({
                    type: "update",
                    object: this,
                    name: key,
                    oldValue: oldValue
                });
            }
        }
        else {
            core_1.transaction(function () {
                _this._data[key] = new observablevalue_1.ObservableValue(value, _this._valueMode, {
                    name: "." + key,
                    object: _this
                });
                _this._updateHasMapEntry(key, true);
                _this._keys.push(key);
            });
            this._events.emit({
                type: "add",
                object: this,
                name: key,
            });
        }
    };
    ObservableMap.prototype.delete = function (key) {
        var _this = this;
        this.assertValidKey(key);
        if (this._has(key)) {
            var oldValue = this._data[key]._value;
            core_1.transaction(function () {
                _this._keys.remove(key);
                _this._updateHasMapEntry(key, false);
                var observable = _this._data[key];
                observable.set(undefined);
                _this._data[key] = undefined;
            });
            this._events.emit({
                type: "delete",
                object: this,
                name: key,
                oldValue: oldValue
            });
        }
    };
    ObservableMap.prototype._updateHasMapEntry = function (key, value) {
        var entry = this._hasMap[key];
        if (entry) {
            entry.set(value);
        }
        else {
            //if (value === false && !isComputingView())
            //	return; // optimization; don't fill the hasMap if we are not observing
            entry = this._hasMap[key] = new observablevalue_1.ObservableValue(value, core_1.ValueMode.Reference, {
                name: ".(has)" + key,
                object: this
            });
        }
        return entry;
    };
    ObservableMap.prototype.get = function (key) {
        this.assertValidKey(key);
        if (this.has(key))
            return this._data[key].get();
        return undefined;
    };
    ObservableMap.prototype.keys = function () {
        return this._keys.slice();
    };
    ObservableMap.prototype.values = function () {
        return this.keys().map(this.get, this);
    };
    ObservableMap.prototype.entries = function () {
        var _this = this;
        return this.keys().map(function (key) { return [key, _this.get(key)]; });
    };
    ObservableMap.prototype.forEach = function (callback, thisArg) {
        var _this = this;
        this.keys().forEach(function (key) { return callback.call(thisArg, _this.get(key), key); });
    };
    /** Merge another object into this object, returns this. */
    ObservableMap.prototype.merge = function (other) {
        var _this = this;
        core_1.transaction(function () {
            if (other instanceof ObservableMap)
                other.keys().forEach(function (key) { return _this.set(key, other.get(key)); });
            else
                Object.keys(other).forEach(function (key) { return _this.set(key, other[key]); });
        });
        return this;
    };
    ObservableMap.prototype.clear = function () {
        var _this = this;
        core_1.transaction(function () {
            _this.keys().forEach(_this.delete, _this);
        });
    };
    ObservableMap.prototype.size = function () {
        return this._keys.length;
    };
    /**
     * Returns a shallow non observable object clone of this map.
     * Note that the values migth still be observable. For a deep clone use mobservable.toJSON.
     */
    ObservableMap.prototype.toJs = function () {
        var _this = this;
        var res = {};
        this.keys().forEach(function (key) { return res[key] = _this.get(key); });
        return res;
    };
    ObservableMap.prototype.assertValidKey = function (key) {
        if (key === null || key === undefined)
            throw new Error("[mobservable.map] Invalid key: '" + key + "'");
        if (typeof key !== "string" && typeof key !== "number")
            throw new Error("[mobservable.map] Invalid key: '" + key + "'");
    };
    ObservableMap.prototype.toString = function () {
        var _this = this;
        return "[mobservable.map { " + this.keys().map(function (key) { return (key + ": " + ("" + _this.get(key))); }).join(", ") + " }]";
    };
    /**
     * Observes this object. Triggers for the events 'add', 'update' and 'delete'.
     * See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/observe
     * for callback details
     */
    ObservableMap.prototype.observe = function (callback) {
        return this._events.on(callback);
    };
    return ObservableMap;
})();
exports.ObservableMap = ObservableMap;
