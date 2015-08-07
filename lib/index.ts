/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */

/// <refererence path="./utils.ts" />
/// <refererence path="./scheduler.ts" />
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

    enum ValueType { Reference, PlainObject, ComplexObject, Array, ViewFunction, ComplexFunction }

    export function makeReactive(value:any, opts?:Mobservable.IMakeReactiveOptions) {
        if (isReactive(value))
            return value;

        opts = opts || {};
        if (value instanceof _.AsReference) {
            value = value.value;
            opts.as = "reference";
        }
        const recurse = opts.recurse !== false;
        const sourceType = opts.as === "reference" ? ValueType.Reference : getTypeOfValue(value);
        
        switch(sourceType) {
            case ValueType.Reference:
            case ValueType.ComplexObject:
                return _.makeReactiveReference(value, false);
            case ValueType.ComplexFunction:
                throw new Error("[mobservable:error] Creating reactive functions from functions with multiple arguments is currently not supported, see https://github.com/mweststrate/mobservable/issues/12");
            case ValueType.ViewFunction:
                return new _.ComputedObservable(value, opts.scope).createGetterSetter();
            case ValueType.Array:
                return new _.ObservableArray(<[]>value, recurse);
            case ValueType.PlainObject:
                return _.extendReactive({}, value, recurse);
        }
        throw "Illegal State";
    }
    
    function getTypeOfValue(value): ValueType {
        if (value === null || value === undefined)
            return ValueType.Reference;
        if (typeof value === "function")
            return value.length ? ValueType.ComplexFunction : ValueType.ViewFunction;
        if (Array.isArray(value) || value instanceof _.ObservableArray)
            return ValueType.Array;
        if (typeof value == 'object')
            return _.isPlainObject(value) ? ValueType.PlainObject : ValueType.ComplexObject;
        return ValueType.Reference; // safe default, only refer by reference..
    }
    
    export function asReference(value) {
        return new _.AsReference(value);
    }
    
    export function isReactive(value):boolean {
        if (value === null || value === undefined)
            return false;
        switch(typeof value) {
            case "array":
            case "object":
            case "function":
                return value.__isReactive === true;
        }
        return false;
    }
    
    export function sideEffect(func:Lambda, scope?):Lambda {
        const observable = new _.ComputedObservable(func, scope);
        const disposer = observable.observe(_.noop);
        if (observable.dependencyState.observing.length === 0)
            _.warn(`mobservable.sideEffect: not a single observable was used inside the side-effect function. Side-effect would be a no-op.`);
        return disposer;
    }

    export function extendReactive(target:Object, properties:Object) {
        _.extendReactive(target, properties, true);
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
                var observable = this.key = new _.ComputedObservable(baseValue, this).createGetterSetter();
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
                    _.defineReactiveProperty(this, key, undefined, true);
                    return this[key];
                },
                set: function(value) {
                    _.defineReactiveProperty(this, key, value, true);
                }
            });
        }
    }

    /**
     * Basically, a deep clone, so that no reactive property will exist anymore
     */
    export function toJson(source) {
        if (!source)
            return source;
        if (Array.isArray(source) || source instanceof _.ObservableArray)
            return source.map(toJson);
        if (typeof source === "object") {
            // TODO: only for plain objects, otherwise return reference?
            var res = {};
            for (var key in source) if (source.hasOwnProperty(key))
                res[key] = toJson(source[key]);
            return res;
        }
        return source;
    }

    export function transaction<T>(action:()=>T):T {
        return _.Scheduler.batch(action);
    }

    /**
        Evaluates func and return its results. Watch tracks all observables that are used by 'func'
        and invokes 'onValidate' whenever func *should* update.
        Returns  a tuplde [return value of func, disposer]. The disposer can be used to abort the watch early.
    */
    export function observeUntilInvalid<T>(func:()=>T, onInvalidate:Lambda):[T,Lambda] {
        var watch = new _.WatchedExpression(func, onInvalidate);
        return [watch.value, () => watch.dispose()];
    }

    export var debugLevel = 0;
    
    export namespace _ {
        export function extendReactive(target, properties, recurse: boolean) {
            markReactive(target);
            for(var key in properties)
                defineReactiveProperty(target, key, properties[key], recurse);
            return target;
        }
        
        export function defineReactiveProperty(target, name, value, recurse) {
            let type;
            if (value instanceof AsReference) {
                value = value.value;
                type = ValueType.Reference;
                recurse = false;
            } else {
                type = getTypeOfValue(value);
            }
            
            let observable: Mobservable.IObservableValue<any>;
            switch(type) {
                case ValueType.Reference:
                case ValueType.ComplexObject:
                    observable = makeReactiveReference(value, false);
                    break;
                case ValueType.ViewFunction:
                    observable = new ComputedObservable(value, target).createGetterSetter();
                    break;
                case ValueType.ComplexFunction:
                    _.warn("Storing reactive functions in objects is not supported yet, please use flag 'recurse:false' or wrap the function in 'asReference'");
                    observable = makeReactiveReference(value, false);
                case ValueType.Array:
                case ValueType.PlainObject:
                    observable = makeReactiveReference(value, recurse);
                default: "Illegal state";
            }

            Object.defineProperty(target, name, {
                get: observable,
                set: observable,
                enumerable: true,
                configurable: false
            });
            return target;
        }
        
        export function makeReactiveArrayItem(value) {
            if (isReactive(value))
                return value;
            if (value instanceof AsReference)
                return value = value.value;

           switch(getTypeOfValue(value)) {
                case ValueType.Reference:
                case ValueType.ComplexObject:
                    return value;
                case ValueType.ViewFunction:
                case ValueType.ComplexFunction:
                    _.warn("Storing reactive functions in arrays is not supported, please use flag 'recurse:false' or wrap the function in 'asReference'");
                    return value;
                case ValueType.Array:
                    return new _.ObservableArray(<[]>value, true);
                case ValueType.PlainObject:
                    return _.extendReactive({}, value, true);
            }
            throw "Illegal State";
        }
        
        // this functions might be a candidate for root level exposure
        export function makeReactiveReference<T>(value : T, recurse: boolean) : Mobservable.IObservableValue<T> {
            return new ObservableValue(value, recurse).createGetterSetter();
        }
        
        export function markReactive(value) {
            Object.defineProperty(value, "__isReactive", {
                enumerable: false,
                value: true
            });
        }
        
        export class AsReference {
            constructor(public value:any) {
                
            }
        }
    }
}
