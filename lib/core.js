/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
var dnode_1 = require('./dnode');
var utils_1 = require('./utils');
var observablevalue_1 = require('./observablevalue');
var observableview_1 = require('./observableview');
var observablearray_1 = require('./observablearray');
var observableobject_1 = require('./observableobject');
var observablemap_1 = require('./observablemap');
var scheduler_1 = require('./scheduler');
var dnode_2 = require('./dnode');
function observable(v, keyOrScope) {
    if (typeof arguments[1] === "string")
        return observableDecorator.apply(null, arguments);
    switch (arguments.length) {
        case 0:
            throw new Error("[mobservable.observable] Please provide at least one argument.");
        case 1:
            break;
        case 2:
            if (typeof v === "function")
                break;
            throw new Error("[mobservable.observable] Only one argument expected.");
        default:
            throw new Error("[mobservable.observable] Too many arguments. Please provide exactly one argument, or a function and a scope.");
    }
    if (isObservable(v))
        return v;
    var _a = getValueModeFromValue(v, ValueMode.Recursive), mode = _a[0], value = _a[1];
    var sourceType = mode === ValueMode.Reference ? ValueType.Reference : getTypeOfValue(value);
    switch (sourceType) {
        case ValueType.Reference:
        case ValueType.ComplexObject:
            return toGetterSetterFunction(new observablevalue_1.ObservableValue(value, mode, null));
        case ValueType.ComplexFunction:
            throw new Error("[mobservable.observable] To be able to make a function reactive it shoul dnot have arguments. If you need an observable reference to a function, use `observable(asReference(f))`");
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
/**
 * Creates a map, similar to ES6 maps (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map),
 * yet observable.
 */
function map(initialValues, valueModifier) {
    return new observablemap_1.ObservableMap(initialValues, valueModifier);
}
exports.map = map;
/**
    * Can be used in combination with makeReactive / extendReactive.
    * Enforces that a reference to 'value' is stored as property,
    * but that 'value' itself is not turned into something reactive.
    * Future assignments to the same property will inherit this behavior.
    * @param value initial value of the reactive property that is being defined.
    */
function asReference(value) {
    // unsound typecast, but in combination with makeReactive, the end result should be of the correct type this way
    // e.g: makeReactive({ x : asReference(number)}) -> { x : number }
    return new AsReference(value);
}
exports.asReference = asReference;
/**
    * Can be used in combination with makeReactive / extendReactive.
    * Enforces that values that are deeply equalled identical to the previous are considered to unchanged.
    * (the default equality used by mobservable is reference equality).
    * Values that are still reference equal, but not deep equal, are considered to be changed.
    * asStructure can only be used incombinations with arrays or objects.
    * It does not support cyclic structures.
    * Future assignments to the same property will inherit this behavior.
    * @param value initial value of the reactive property that is being defined.
    */
function asStructure(value) {
    return new AsStructure(value);
}
exports.asStructure = asStructure;
/**
    * Can be used in combination with makeReactive / extendReactive.
    * The value will be made reactive, but, if the value is an object or array,
    * children will not automatically be made reactive as well.
    */
function asFlat(value) {
    return new AsFlat(value);
}
exports.asFlat = asFlat;
/**
    * Returns true if the provided value is reactive.
    * @param value object, function or array
    * @param propertyName if propertyName is specified, checkes whether value.propertyName is reactive.
    */
function isObservable(value) {
    if (value === null || value === undefined)
        return false;
    return !!value.$mobservable || value instanceof dnode_2.DataNode;
}
exports.isObservable = isObservable;
/**
    * Creates a reactive view and keeps it alive, so that the view is always
    * updated if one of the dependencies changes, even when the view is not further used by something else.
    * @param view The reactive view
    * @param scope (optional)
    * @returns disposer function, which can be used to stop the view from being updated in the future.
    */
function autorun(view, scope) {
    var _a = getValueModeFromValue(view, ValueMode.Recursive), mode = _a[0], unwrappedView = _a[1];
    if (typeof unwrappedView !== "function")
        throw new Error("[mobservable.autorun] expects a function");
    if (unwrappedView.length !== 0)
        throw new Error("[mobservable.autorun] expects a function without arguments");
    var observable = new observableview_1.ObservableView(unwrappedView, scope, {
        object: scope || view,
        name: view.name
    }, mode === ValueMode.Structure);
    observable.setRefCount(+1);
    var disposer = utils_1.once(function () {
        observable.setRefCount(-1);
    });
    disposer.$mobservable = observable;
    return disposer;
}
exports.autorun = autorun;
/**
    * Similar to 'observer', observes the given predicate until it returns true.
    * Once it returns true, the 'effect' function is invoked an the observation is cancelled.
    * @param predicate
    * @param effect
    * @param scope (optional)
    * @returns disposer function to prematurely end the observer.
    */
function autorunUntil(predicate, effect, scope) {
    var disposer = autorun(function () {
        if (predicate.call(scope)) {
            disposer();
            effect.call(scope);
        }
    });
    return disposer;
}
exports.autorunUntil = autorunUntil;
/**
    * Once the view triggers, effect will be scheduled in the background.
    * If observer triggers multiple times, effect will still be triggered only once, so it achieves a similar effect as transaction.
    * This might be useful for stuff that is expensive and doesn't need to happen synchronously; such as server communication.
    * Afther the effect has been fired, it can be scheduled again if the view is triggered in the future.
    *
    * @param view to observe. If it returns a value, the latest returned value will be passed into the scheduled effect.
    * @param the effect that will be executed, a fixed amount of time after the first trigger of 'view'.
    * @param delay, optional. After how many milleseconds the effect should fire.
    * @param scope, optional, the 'this' value of 'view' and 'effect'.
    */
function autorunAsync(view, effect, delay, scope) {
    if (delay === void 0) { delay = 1; }
    var latestValue = undefined;
    var timeoutHandle;
    var disposer = autorun(function () {
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
exports.autorunAsync = autorunAsync;
/**
    * expr can be used to create temporarily views inside views.
    * This can be improved to improve performance if a value changes often, but usually doesn't affect the outcome of an expression.
    *
    * In the following example the expression prevents that a component is rerender _each time_ the selection changes;
    * instead it will only rerenders when the current todo is (de)selected.
    *
    * reactiveComponent((props) => {
    *     const todo = props.todo;
    *     const isSelected = mobservable.expr(() => props.viewState.selection === todo);
    *     return <div className={isSelected ? "todo todo-selected" : "todo"}>{todo.title}</div>
    * });
    *
    */
function expr(expr, scope) {
    if (!dnode_1.isComputingView())
        console.warn("[mobservable.expr] 'expr' should only be used inside other reactive functions.");
    return observable(expr, scope)();
}
exports.expr = expr;
/**
    * Extends an object with reactive capabilities.
    * @param target the object to which reactive properties should be added
    * @param properties the properties that should be added and made reactive
    * @returns targer
    */
function extendObservable(target, properties, context) {
    if (target instanceof observablemap_1.ObservableMap || properties instanceof observablemap_1.ObservableMap)
        throw new Error("[mobservable.extendObservable] 'extendObservable' should not be used on maps, use map.merge instead");
    return extendObservableHelper(target, properties, ValueMode.Recursive, context);
}
exports.extendObservable = extendObservable;
/**
    * ES6 / Typescript decorator which can to make class properties and getter functions reactive.
    * Use this annotation to wrap properties of an object in an observable, for example:
    * class OrderLine {
    *   @observable amount = 3;
    *   @observable price = 2;
    *   @observable total() {
    *      return this.amount * this.price;
    *   }
    * }
    */
function observableDecorator(target, key, baseDescriptor) {
    if (arguments.length < 2 || arguments.length > 3)
        throw new Error("[mobservable.@observable] A decorator expects 2 or 3 arguments, got: " + arguments.length);
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
        var _this = this;
        // the getter might create a reactive property lazily, so this might even happen during a view.
        withStrict(false, function () {
            observableobject_1.ObservableObject.asReactive(_this, null, ValueMode.Recursive).set(key, baseValue);
        });
        return this[key];
    };
    descriptor.set = isDecoratingGetter
        ? observableview_1.throwingViewSetter(key)
        : function (value) {
            observableobject_1.ObservableObject.asReactive(this, null, ValueMode.Recursive).set(key, typeof value === "function" ? asReference(value) : value);
        };
    if (!baseDescriptor) {
        Object.defineProperty(target, key, descriptor); // For typescript
    }
    else {
        return descriptor;
    }
}
/**
    * Basically, a deep clone, so that no reactive property will exist anymore.
    * Doesn't follow references.
    */
function toJSON(source) {
    if (!source)
        return source;
    if (Array.isArray(source) || source instanceof observablearray_1.ObservableArray)
        return source.map(toJSON);
    if (source instanceof observablemap_1.ObservableMap) {
        var res_1 = {};
        source.forEach(function (value, key) { return res_1[key] = value; });
        return res_1;
    }
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
/**
    * During a transaction no views are updated until the end of the transaction.
    * The transaction will be run synchronously nonetheless.
    * @param action a function that updates some reactive state
    * @returns any value that was returned by the 'action' parameter.
    */
function transaction(action) {
    return scheduler_1.transaction(action);
}
exports.transaction = transaction;
/**
    * If strict is enabled, views are not allowed to modify the state.
    * This is a recommended practice, as it makes reasoning about your application simpler.
    */
var strict = false;
function getStrict() {
    return strict;
}
exports.getStrict = getStrict;
function withStrict(newStrict, func) {
    var baseStrict = strict;
    strict = newStrict;
    try {
        func();
    }
    finally {
        strict = baseStrict;
    }
}
exports.withStrict = withStrict;
/**
 * Internal methods
 */
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
    // No observers will be triggered if a new value is assigned (to a part of the tree) that deeply equals the old value.
    ValueMode[ValueMode["Flat"] = 3] = "Flat"; // If the value is an plain object, it will be made reactive, and so will all its future children.
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
    return ValueType.Reference; // safe default, only refer by reference..
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
function getValueModeFromModifierFunc(func) {
    if (func === asReference)
        return ValueMode.Reference;
    else if (func === asStructure)
        return ValueMode.Structure;
    else if (func === asFlat)
        return ValueMode.Flat;
    else if (func !== undefined)
        throw new Error("[mobservable] Cannot determine value mode from function. Please pass in one of these: mobservable.asReference, mobservable.asStructure or mobservable.asFlat, got: " + func);
    return ValueMode.Recursive;
}
exports.getValueModeFromModifierFunc = getValueModeFromModifierFunc;
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
        return observablearray_1.createObservableArray(value.slice(), childMode, context);
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
