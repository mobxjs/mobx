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
var utils_1 = require('./utils');
var dnode_1 = require('./dnode');
var simpleeventemitter_1 = require('./simpleeventemitter');
var core_1 = require('./core');
// Workaround to make sure ObservableArray extends Array
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
    ObservableArrayAdministration.prototype.getLength = function () {
        this.notifyObserved();
        return this.values.length;
    };
    ObservableArrayAdministration.prototype.setLength = function (newLength) {
        if (typeof newLength !== "number" || newLength < 0)
            throw new Error("[mobservable.array] Out of range: " + newLength);
        var currentLength = this.values.length;
        if (newLength === currentLength)
            return;
        else if (newLength > currentLength)
            this.spliceWithArray(currentLength, 0, new Array(newLength - currentLength));
        else
            this.spliceWithArray(newLength, currentLength - newLength);
    };
    // adds / removes the necessary numeric properties to this object
    ObservableArrayAdministration.prototype.updateLength = function (oldLength, delta) {
        if (delta < 0) {
            dnode_1.checkIfStateIsBeingModifiedDuringView(this.context);
            for (var i = oldLength + delta; i < oldLength; i++)
                delete this.array[i]; // bit faster but mem inefficient: 
        }
        else if (delta > 0) {
            dnode_1.checkIfStateIsBeingModifiedDuringView(this.context);
            if (oldLength + delta > OBSERVABLE_ARRAY_BUFFER_SIZE)
                reserveArrayBuffer(oldLength + delta);
            // funny enough, this is faster than slicing ENUMERABLE_PROPS into defineProperties, and faster as a temporarily map
            for (var i = oldLength, end = oldLength + delta; i < end; i++)
                Object.defineProperty(this.array, i, ENUMERABLE_PROPS[i]);
        }
    };
    ObservableArrayAdministration.prototype.spliceWithArray = function (index, deleteCount, newItems) {
        var _this = this;
        var length = this.values.length;
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
        this.updateLength(length, lengthDelta); // create or remove new entries
        var res = (_a = this.values).splice.apply(_a, [index, deleteCount].concat(newItems));
        this.notifySplice(index, res, newItems);
        return res;
        var _a;
    };
    ObservableArrayAdministration.prototype.makeReactiveArrayItem = function (value) {
        core_1.assertUnwrapped(value, "Array values cannot have modifiers");
        return core_1.makeChildObservable(value, this.mode, {
            object: this.context.object,
            name: this.context.name + "[x]"
        });
    };
    ObservableArrayAdministration.prototype.notifyChildUpdate = function (index, oldValue) {
        this.notifyChanged();
        // conform: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe
        this.changeEvent.emit({ object: this.array, type: 'update', index: index, oldValue: oldValue });
    };
    ObservableArrayAdministration.prototype.notifySplice = function (index, deleted, added) {
        if (deleted.length === 0 && added.length === 0)
            return;
        this.notifyChanged();
        // conform: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe
        this.changeEvent.emit({ object: this.array, type: 'splice', index: index, addedCount: added.length, removed: deleted });
    };
    ObservableArrayAdministration.prototype.notifyChanged = function () {
        this.markStale();
        this.markReady(true);
    };
    return ObservableArrayAdministration;
})(dnode_1.DataNode);
exports.ObservableArrayAdministration = ObservableArrayAdministration;
function createObservableArray(initialValues, mode, context) {
    return new ObservableArray(initialValues, mode, context);
}
exports.createObservableArray = createObservableArray;
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
        return this.$mobservable.spliceWithArray(0, this.$mobservable.values.length, newItems);
    };
    ObservableArray.prototype.toJSON = function () {
        this.$mobservable.notifyObserved();
        return this.$mobservable.values.slice();
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
                return this.$mobservable.spliceWithArray(index);
            case 2:
                return this.$mobservable.spliceWithArray(index, deleteCount);
        }
        return this.$mobservable.spliceWithArray(index, deleteCount, newItems);
    };
    ObservableArray.prototype.push = function () {
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i - 0] = arguments[_i];
        }
        this.$mobservable.spliceWithArray(this.$mobservable.values.length, 0, items);
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
        this.$mobservable.spliceWithArray(0, 0, items);
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
    return ObservableArray;
})(StubArray);
exports.ObservableArray = ObservableArray;
/**
 * We don't want those to show up in `for (var key in ar)` ...
 */
utils_1.makeNonEnumerable(ObservableArray.prototype, [
    "constructor",
    "clear",
    "find",
    "observe",
    "pop",
    "push",
    "remove",
    "replace",
    "reverse",
    "shift",
    "sort",
    "splice",
    "split",
    "toJSON",
    "toLocaleString",
    "toString",
    "unshift"
]);
Object.defineProperty(ObservableArray.prototype, "length", {
    enumerable: false,
    configurable: true,
    get: function () {
        return this.$mobservable.getLength();
    },
    set: function (newLength) {
        this.$mobservable.setLength(newLength);
    }
});
/**
 * Wrap function from prototype
 */
[
    "concat",
    "every",
    "filter",
    "forEach",
    "indexOf",
    "join",
    "lastIndexOf",
    "map",
    "reduce",
    "reduceRight",
    "slice",
    "some",
].forEach(function (funcName) {
    var baseFunc = Array.prototype[funcName];
    Object.defineProperty(ObservableArray.prototype, funcName, {
        configurable: false,
        writable: true,
        enumerable: false,
        value: function () {
            this.$mobservable.notifyObserved();
            return baseFunc.apply(this.$mobservable.values, arguments);
        }
    });
});
/**
    * This array buffer contains two lists of properties, so that all arrays
    * can recycle their property definitions, which significantly improves performance of creating
    * properties on the fly.
    */
var OBSERVABLE_ARRAY_BUFFER_SIZE = 0;
var ENUMERABLE_PROPS = [];
function createArrayBufferItem(index) {
    var prop = ENUMERABLE_PROPS[index] = {
        enumerable: true,
        configurable: true,
        set: function (value) {
            var impl = this.$mobservable;
            var values = impl.values;
            core_1.assertUnwrapped(value, "Modifiers cannot be used on array values. For non-reactive array values use makeReactive(asFlat(array)).");
            if (index < values.length) {
                dnode_1.checkIfStateIsBeingModifiedDuringView(impl.context);
                var oldValue = values[index];
                var changed = impl.mode === core_1.ValueMode.Structure ? !utils_1.deepEquals(oldValue, value) : oldValue !== value;
                if (changed) {
                    values[index] = impl.makeReactiveArrayItem(value);
                    impl.notifyChildUpdate(index, oldValue);
                }
            }
            else if (index === values.length)
                this.push(impl.makeReactiveArrayItem(value));
            else
                throw new Error("[mobservable.array] Index out of bounds, " + index + " is larger than " + values.length);
        },
        get: function () {
            var impl = this.$mobservable;
            if (impl && index < impl.values.length) {
                impl.notifyObserved();
                return impl.values[index];
            }
            return undefined;
        }
    };
    Object.defineProperty(ObservableArray.prototype, "" + index, {
        enumerable: false,
        configurable: true,
        get: prop.get,
        set: prop.set
    });
}
function reserveArrayBuffer(max) {
    for (var index = OBSERVABLE_ARRAY_BUFFER_SIZE; index < max; index++)
        createArrayBufferItem(index);
    OBSERVABLE_ARRAY_BUFFER_SIZE = max;
}
reserveArrayBuffer(1000);
