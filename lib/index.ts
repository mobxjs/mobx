/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */

/// <refererence path="./scheduler.ts" />
/// <refererence path="./utils.ts" />
/// <refererence path="./simpleeventemitter.ts" />
/// <refererence path="./dnode.ts" />
/// <refererence path="./observablevalue.ts" />
/// <refererence path="./observablearray.ts" />
/// <refererence path="./watch.ts" />
/// <refererence path="./computedobservable.ts" />
/// <refererence path="./reactjs.ts" />
/// <refererence path="./umd.ts" />
/// <refererence path="./api.ts" />

namespace mobservable {

    export type Lambda = Mobservable.Lambda;

    export function value<T>(value:T[]): Mobservable.IObservableArray<T>;
    export function value<T>(value?:T|{():T}, scope?:Object): Mobservable.IObservableValue<T>;
    export function value(value?, scope?:Object):any {
        if (Array.isArray(value))
            return array(value);
        if (typeof value === "function")
            return computed(value, scope);
        return reference(value);
    }

    export function props(target, properties?, initialValue?) {
        switch(arguments.length) {
            case 0:
                throw new Error("Not enough arguments");
            case 1:
                return props(target, target); // mix target properties into itself
            case 2:
                for(var key in properties)
                    props(target, key, properties[key]);
                break;
            case 3:
                var isArray = Array.isArray(initialValue);
                var observable = value(initialValue, target);
                Object.defineProperty(target, properties, {
                    get: isArray
                        ? function() { return observable; }
                        : observable,
                    set: isArray
                        ? function(newValue) { (<Mobservable.IObservableArray<any>><any>observable).replace(newValue) }
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
        if (Array.isArray(source) || source instanceof _.ObservableArray)
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
            else if (value instanceof _.ObservableValue)
                return value.get();
            else if (typeof value === "function" && value.impl) {
                if (value.impl instanceof _.ObservableValue)
                    return value()
                else if (value.impl instanceof _.ObservableArray)
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
        var observer = new _.ComputedObservable((() => object[key]), object);
        var disposer = observer.observe(listener, invokeImmediately);

        if ((<any>observer).dependencyState.observing.length === 0)
            throw new Error(`mobservable.observeProperty: property '${key}' of '${object} doesn't seem to be observable. Did you define it as observable using @observable or mobservable.props? You might try to use the .observe() method instead.`);

        return _.once(() => {
            disposer();
            (<any>observer).dependencyState.dispose(); // clean up
        });
    }

    export var debugLevel = 0;

}
