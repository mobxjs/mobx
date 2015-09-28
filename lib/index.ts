/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */

namespace mobservable {

    export type Lambda = Mobservable.Lambda;

    export function makeReactive(v:any, scopeOrName?:string | any, name?: string) {
        if (isReactive(v))
            return v;

        const opts = _.isPlainObject(scopeOrName) ? scopeOrName : {};
        let [mode, value] = _.getValueModeFromValue(v, _.ValueMode.Recursive);

        if (opts.recurse === false) {
            console.warn("[mobservable.makeReactive] option 'recurse: false' is deprecated, use 'mobservable.asFlat' instead");
            mode = _.ValueMode.Flat;
        } else if (opts.as === "reference") {
            console.warn("[mobservable.makeReactive] option 'as: \"reference\"' is deprecated, use 'mobservable.asReference' instead");
            mode = _.ValueMode.Reference;
        }

        const sourceType = mode === _.ValueMode.Reference ? _.ValueType.Reference : _.getTypeOfValue(value);
        const scope = opts.scope || (scopeOrName && typeof scopeOrName === "object" ? scopeOrName : null);
        const context = {
            name: name || opts.name,
            object: opts.context || opts.scope
        };

        switch(sourceType) {
            case _.ValueType.Reference:
            case _.ValueType.ComplexObject:
                return _.toGetterSetterFunction(new _.ObservableValue(value, mode, context));
            case _.ValueType.ComplexFunction:
                throw new Error("[mobservable.makeReactive] Creating reactive functions from functions with multiple arguments is currently not supported, see https://github.com/mweststrate/mobservable/issues/12");
            case _.ValueType.ViewFunction:
                if (!context.name)
                    context.name = value.name;
                return _.toGetterSetterFunction(new _.ObservableView(value, opts.scope || opts.context, context, mode === _.ValueMode.Structure));
            case _.ValueType.Array:
            case _.ValueType.PlainObject:
                return _.makeChildReactive(value, mode, context);
        }
        throw "Illegal State";
    }

    export function asReference(value) {
        return new _.AsReference(value);
    }

    export function asStructure(value) {
        return new _.AsStructure(value);
    }

    export function asFlat(value) {
        return new _.AsFlat(value);
    }

    export function isReactive(value):boolean {
        if (value === null || value === undefined)
            return false;
        return !!value.$mobservable;
    }

    export function sideEffect(func:Lambda, scope?:any):Lambda {
        console.warn(`[mobservable.sideEffect] 'sideEffect' has been renamed to 'observe' and will be removed in a later version.`);
        return observe(func, scope);
    }

    export function observe(view:Lambda, scope?:any):Lambda {
        var [mode, unwrappedView] = _.getValueModeFromValue(view, _.ValueMode.Recursive);
        const observable = new _.ObservableView(unwrappedView, scope, {
            object: scope,
            name: view.name
        }, mode === _.ValueMode.Structure);
        observable.setRefCount(+1);

        const disposer = _.once(() => {
            observable.setRefCount(-1);
        });
        if (logLevel >= 2 && observable.observing.length === 0)
            console.warn(`[mobservable.observe] not a single observable was used inside the observing function. This observer is now a no-op.`);
        (<any>disposer).$mobservable = observable;
        return disposer;
    }

    export function observeUntil(predicate: ()=>boolean, effect: Mobservable.Lambda, scope?: any): Mobservable.Lambda {
        const disposer = observe(() => {
            if (predicate.call(scope)) {
                disposer();
                effect.call(scope);
            }
        });
        return disposer;
    }

    export function observeAsync<T>(view: () => T, effect: (latestValue : T ) => void, delay:number = 1, scope?: any): Lambda {
        var latestValue: T = undefined;
        var timeoutHandle;

        const disposer = observe(() => {
            latestValue = view.call(scope);
            if (!timeoutHandle) {
                timeoutHandle = setTimeout(() => {
                    effect.call(scope, latestValue);
                    timeoutHandle = null;
                }, delay);
            }
        });

        return _.once(() => {
            disposer();
            if (timeoutHandle)
                clearTimeout(timeoutHandle);
        });
    }

    export function when(predicate: ()=>boolean, effect: Mobservable.Lambda, scope?: any): Mobservable.Lambda {
        console.error("[mobservable.when] deprecated, please use 'mobservable.observeUntil'");
        return observeUntil(predicate, effect, scope);
    }

    export function expr<T>(expr: () => void, scope?):T {
        if (!_.isComputingView())
            throw new Error("[mobservable.expr] 'expr' can only be used inside a computed value.");
        return makeReactive(expr, { scope : scope }) ();
    }

    export function extendReactive(target:Object, properties:Object, context?:Mobservable.IContextInfoStruct):Object {
        return _.extendReactive(target, properties, _.ValueMode.Recursive, context); // No other mode makes sense..?
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
    export function observable(target:Object, key:string, baseDescriptor?) {
        // observable annotations are invoked on the prototype, not on actual instances,
        // so upon invocation, determine the 'this' instance, and define a property on the
        // instance as well (that hides the propotype property)
        const isDecoratingProperty = baseDescriptor && !baseDescriptor.hasOwnProperty("value");
        const descriptor:PropertyDescriptor = baseDescriptor || {};
        const baseValue = isDecoratingProperty ? descriptor.get : descriptor.value; 

        if (!isDecoratingProperty && typeof baseValue === "function")
            throw new Error(`@observable functions are deprecated. Use @observable on a getter function if you want to create a view, or wrap the value in 'asReference' if you want to store a value (found on member '${key}').`);
        if (isDecoratingProperty) {
            if (typeof baseValue !== "function")
                throw new Error(`@observable expects a getter function if used on a property (found on member '${key}').`);
            if (descriptor.set)
                throw new Error(`@observable properties cannot have a setter (found on member '${key}').`);
            if (baseValue.length !== 0)
                throw new Error(`@observable getter functions should not take arguments (found on member '${key}').`);
        }

        descriptor.configurable = true;
        descriptor.enumerable = true;
        delete descriptor.value;
        delete descriptor.writable;
        descriptor.get = function() {
            _.ObservableObject.asReactive(this, null, _.ValueMode.Recursive).set(key, baseValue);
            return this[key];
        };
        descriptor.set = isDecoratingProperty 
            ? _.throwingViewSetter
            : function(value) { 
                _.ObservableObject.asReactive(this, null, _.ValueMode.Recursive).set(key, value); 
            }
        ;

        if (!isDecoratingProperty) {
            Object.defineProperty(target, key, descriptor);
        }
    }

    /**
     * Basically, a deep clone, so that no reactive property will exist anymore.
     * Doesn't follow references.
     */
    export function toJSON(source) {
        if (!source)
            return source;
        if (Array.isArray(source) || source instanceof _.ObservableArray)
            return source.map(toJSON);
        if (typeof source === "object" && _.isPlainObject(source)) {
            var res = {};
            for (var key in source) if (source.hasOwnProperty(key))
                res[key] = toJSON(source[key]);
            return res;
        }
        return source;
    }

    export function toJson(source) {
        console.warn("mobservable.toJson is deprecated, use mobservable.toJSON instead");
        return toJSON(source);
    }

    export function transaction<T>(action:()=>T):T {
        return _.Scheduler.batch(action);
    }

    /**
        Evaluates func and return its results. Watch tracks all observables that are used by 'func'
        and invokes 'onValidate' whenever func *should* update.
        Returns  a tuplde [return value of func, disposer]. The disposer can be used to abort the watch early.
    */
    export function observeUntilInvalid<T>(func:()=>T, onInvalidate:Lambda, context?:Mobservable.IContextInfo):[T,Lambda, any] {
        console.warn("mobservable.observeUntilInvalid is deprecated and will be removed in 0.7");
        var hasRun = false;
        var result;
        var disposer = observe(() => {
            if (!hasRun) {
                hasRun = true;
                result = func();
            } else {
                onInvalidate();
            }
        });
        return [result, disposer, disposer['$mobservable']];
    }

    export var logLevel = 1; // 0 = production, 1 = development, 2 = debugging

    export var strict = true;

    setTimeout(function() {
        if (logLevel > 0)
            console.info(`Welcome to mobservable. Current logLevel = ${logLevel}. Change mobservable.logLevel according to your needs: 0 = production, 1 = development, 2 = debugging. Strict mode is ${strict ? 'enabled' : 'disabled'}.`);
    }, 1);

    export namespace _ {
        export enum ValueType { Reference, PlainObject, ComplexObject, Array, ViewFunction, ComplexFunction }

        export enum ValueMode {
            Recursive, // If the value is an plain object, it will be made reactive, and so will all its future children.
            Reference, // Treat this value always as a reference, without any further processing.
            Structure, // Similar to recursive. However, this structure can only exist of plain arrays and objects.
                       // No observers will be triggered if a new value is assigned (to a part of the tree) that deeply equals the old value.
            Flat       // If the value is an plain object, it will be made reactive, and so will all its future children.
        }

        export function getTypeOfValue(value): ValueType {
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

        export function extendReactive(target, properties, mode:_.ValueMode, context: Mobservable.IContextInfoStruct):Object {
            var meta = _.ObservableObject.asReactive(target, context, mode);
            for(var key in properties) if (properties.hasOwnProperty(key)) {
                meta.set(key, properties[key]);
            }
            return target;
        }

        export function toGetterSetterFunction<T>(observable: _.ObservableValue<T>|_.ObservableView<T>):Mobservable.IObservableValue<T> {
            var f:any = function(value?) {
                if (arguments.length > 0)
                    observable.set(value);
                else
                    return observable.get();
            };
            f.$mobservable = observable;
            f.observe = function(listener, fire) {
                return observable.observe(listener, fire);
            }
            f.toString = function() {
                return observable.toString();
            }
            return f;
        }

        export class AsReference {
            constructor(public value:any) {
                assertUnwrapped(value, "Modifiers are not allowed to be nested");
            }
        }

        export class AsStructure {
            constructor(public value:any) {
                assertUnwrapped(value, "Modifiers are not allowed to be nested");
            }
        }

        export class AsFlat {
            constructor(public value:any) {
                assertUnwrapped(value, "Modifiers are not allowed to be nested");
            }
        }

        export function getValueModeFromValue(value:any, defaultMode:ValueMode): [ValueMode, any] {
            if (value instanceof AsReference)
                return [ValueMode.Reference, value.value];
            if (value instanceof AsStructure)
                return [ValueMode.Structure, value.value];
            if (value instanceof AsFlat)
                return [ValueMode.Flat, value.value];
            return [defaultMode, value];
        }

        export function makeChildReactive(value, parentMode:ValueMode, context) {
            let childMode: ValueMode;
            if (isReactive(value))
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
                    [childMode, value] = getValueModeFromValue(value, ValueMode.Recursive);
                    break;
                default:
                    throw "Illegal State";
            }

            if (Array.isArray(value))
                return new _.ObservableArray(<[]> value.slice(), childMode, context);
            if (isPlainObject(value))
                return _.extendReactive(value, value, childMode, context);
            return value;
        }

        export function assertUnwrapped(value, message) {
            if (value instanceof AsReference || value instanceof AsStructure || value instanceof AsFlat)
                throw new Error(`[mobservable] asStructure / asReference / asFlat cannot be used here. ${message}`);
        }
    }
}
