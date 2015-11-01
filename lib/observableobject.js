var core_1 = require('./core');
var observableview_1 = require('./observableview');
var observablevalue_1 = require('./observablevalue');
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
            observable = new observableview_1.ObservableView(value, this.target, context, false);
        else if (value instanceof core_1.AsStructure && typeof value.value === "function" && value.value.length === 0)
            observable = new observableview_1.ObservableView(value.value, this.target, context, true);
        else
            observable = new observablevalue_1.ObservableValue(value, this.mode, context);
        this.values[propName] = observable;
        Object.defineProperty(this.target, propName, {
            configurable: true,
            enumerable: observable instanceof observablevalue_1.ObservableValue,
            get: function () {
                return this.$mobservable ? this.$mobservable.values[propName].get() : undefined;
            },
            set: function (newValue) {
                this.$mobservable.values[propName].set(newValue);
            }
        });
    };
    return ObservableObject;
})();
exports.ObservableObject = ObservableObject;
