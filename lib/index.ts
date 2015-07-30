/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
 
/// <refererence path="./scheduler" />
/// <refererence path="./utils" />
/// <refererence path="./simpleeventemitter" />
/// <refererence path="./dnode" />
/// <refererence path="./observablevalue" />
/// <refererence path="./observablearray" />
/// <refererence path="./computedobservable" />
/// <refererence path="./reactjs" />

namespace mobservable {
    
    export function createObservable<T>(value:T[]): IObservableArray<T>;
    export function createObservable<T>(value?:T|{():T}, scope?:Object): IObservableValue<T>;
    export function createObservable(value?, scope?:Object):any {
        if (Array.isArray(value))
            return new ObservableArray(value);
        if (typeof value === "function")
            return computed(value, scope);
        return primitive(value);
    }
    
    
    export var value = createObservable;
    
    export function reference(value?) {
        return new ObservableValue(value).createGetterSetter();
    }
    export var primitive = reference;
    
    export function computed<T>(func:()=>void, scope?) {
        return new ComputedObservable(func, scope).createGetterSetter();
    }
    
    export function expr<T>(expr:()=>void, scope?) {
        if (DNode.trackingStack.length === 0)
            throw new Error("mobservable.expr can only be used inside a computed observable. Probably mobservable.computed should be used instead of .expr");
        return new ComputedObservable(expr, scope).get();
    }
    
    export function sideEffect(func:Lambda, scope?):Lambda {
        return computed(func, scope).observe(noop);
    }
    
    export function array<T>(values?:T[]): ObservableArray<T> {
        return new ObservableArray(values);
    }
    
    export function props(target, props?, value?) {
        switch(arguments.length) {
            case 0:
                throw new Error("Not enough arguments");
            case 1:
                return props(target, target); // mix target properties into itself
            case 2:
                for(var key in props)
                    props(target, key, props[key]);
                break;
            case 3:
                var isArray = Array.isArray(value);
                var observable = value(value, target);
                Object.defineProperty(target, props, {
                    get: isArray
                        ? function() { return observable; }
                        : observable,
                    set: isArray
                        ? function(newValue) { (<IObservableArray<any>><any>observable).replace(newValue) }
                        : observable,
                    enumerable: true,
                    configurable: false
                });
                break;
        }
        return target;
    }
    
    export function fromJson(source) {
        function convertValue(value) {
            if (!value)
                return value;
            if (typeof value === "object") // array or object
                return fromJson(value);
            return value;
        }
    
        if (source) {
            if (Array.isArray(source))
                return array(source.map(convertValue));
            if (typeof source === "object") {
                var obj = {};
                for(var key in source) if (source.hasOwnProperty(key))
                    obj[key] = convertValue(source[key]);
                return props(obj);
            }
        }
        throw new Error(`mobservable.fromJson expects object or array, got: '${source}'`);
    }
    
    export function toJson(source) {
        if (!source)
            return source;
        if (Array.isArray(source) || source instanceof ObservableArray)
            return source.map(toJson);
        if (typeof source === "object") {
            var res = {};
            for (var key in source) if (source.hasOwnProperty(key))
                res[key] = toJson(source[key]);
            return res;
        }
        return source;
    }
    
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
    export function observable(target:Object, key:string, descriptor?) {
        var baseValue = descriptor ? descriptor.value : null;
        // observable annotations are invoked on the prototype, not on actual instances,
        // so upon invocation, determine the 'this' instance, and define a property on the
        // instance as well (that hides the propotype property)
        if (typeof baseValue === "function") {
            delete descriptor.value;
            delete descriptor.writable;
            descriptor.configurable = true;
            descriptor.get = function() {
                var observable = this.key = computed(baseValue, this);
                return observable;
            };
            descriptor.set = function () {
                console.trace();
                throw new Error("It is not allowed to reassign observable functions");
            };
        } else {
            Object.defineProperty(target, key, {
                configurable: true, enumberable:true,
                get: function() {
                    props(this, key, undefined);
                    return this[key];
                },
                set: function(value) {
                    props(this, key, value);
                }
            });
        }
    }
    
    /**
     * Inverse function of `props` and `array`, given an (observable) array, returns a plain,
     * non observable version. (non recursive), or given an object with observable properties, returns a clone
     * object with plain properties.
     *
     * Any other value will be returned as is.
     */
    export function toPlainValue(value:any):any {
        if (value) {
            if (value instanceof Array)
                return value.slice();
            else if (value instanceof ObservableValue)
                return value.get();
            else if (typeof value === "function" && value.impl) {
                if (value.impl instanceof ObservableValue)
                    return value()
                else if (value.impl instanceof ObservableArray)
                    return value().slice();
            }
            else if (typeof value === "object") {
                var res = {};
                for (var key in value)
                    res[key] = toPlainValue(value[key]);
                return res;
            }
        }
        return value;
    }
    
    /**
        Can be used to observe observable properties that are created using the `observable` annotation,
        `defineObservableProperty` or `initializeObservableProperties`.
        (Since properties do not expose an .observe method themselves).
    */
    export function observeProperty(object:Object, key:string, listener:(...args:any[])=>void, invokeImmediately = false):Lambda {
        if (!object)
            throw new Error(`Cannot observe property of '${object}'`);
        if (!(key in object))
            throw new Error(`Object '${object}' has no property '${key}'.`);
        if (!listener || typeof listener !== "function")
            throw new Error("Third argument to mobservable.observeProperty should be a function");
    
        // wrap with observable function
        var observer = new ComputedObservable((() => object[key]), object);
        var disposer = observer.observe(listener, invokeImmediately);
    
        if ((<any>observer).dependencyState.observing.length === 0)
            throw new Error(`mobservable.observeProperty: property '${key}' of '${object} doesn't seem to be observable. Did you define it as observable using @observable or mobservable.props? You might try to use the .observe() method instead.`);
    
        return once(() => {
            disposer();
            (<any>observer).dependencyState.dispose(); // clean up
        });
    }
    
    /**
        Evaluates func and return its results. Watch tracks all observables that are used by 'func'
        and invokes 'onValidate' whenever func *should* update.
        Returns  a tuplde [return value of func, disposer]. The disposer can be used to abort the watch early.
    */
    export function watch<T>(func:()=>T, onInvalidate:Lambda):[T,Lambda] {
        var watch = new WatchedExpression(func, onInvalidate);
        return [watch.value, () => watch.dispose()];
    }
    
    export function batch<T>(action:()=>T):T {
        return Scheduler.batch(action);
    }
    
    export var debugLevel = 0;
    
}

/*    export var m:IMObservableStatic = <IMObservableStatic> function(value, scope?) {
        return createObservable(value,scope);
    };
*/

/*
    // For testing purposes only;
    (<any>m).quickDiff = quickDiff;
    (<any>m).stackDepth = () => DNode.trackingStack.length;

*/

/* typescript does not support UMD modules yet, lets do it ourselves... */
/*(declare var define;
declare var exports;
declare var module;

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD.
        define('mobservable', [], function () {
            return (factory());
        });
    } else if (typeof exports === 'object') {
        // CommonJS like
        module.exports = factory();
    } else {
        // register global
        root['mobservable'] = factory();
    }
}(this, function () {
    return mobservable.m;
}));
*/