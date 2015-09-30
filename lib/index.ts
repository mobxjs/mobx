/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */

import {Lambda, IObservableArray, IObservableValue, IContextInfoStruct, IContextInfo} from './interfaces';
import {isPlainObject, once} from './utils';
import * as _ from './core';
import {ObservableValue} from './observablevalue';
import {ObservableView, throwingViewSetter} from './observableview';
import {ObservableArray} from './observablearray';
import {ObservableObject} from './observableobject';
import {batch} from './scheduler';
import {isComputingView} from './dnode';

/**
    * Turns an object, array or function into a reactive structure.
    * @param value the value which should become observable.
    */
export function makeReactive<T>(value: T[], name?:string): IObservableArray<T>;
export function makeReactive<T>(value: ()=>T, nameOrScope?: string | Object, name?: string): IObservableValue<T>;
export function makeReactive<T extends string|number|boolean|Date|RegExp|Function|void>(value: T, name?:string): IObservableValue<T>;
export function makeReactive<T extends Object>(value: T, name?: string): T;
export function makeReactive(v:any, scopeOrName?:string | any, name?: string) {
    if (isReactive(v))
        return v;

    const opts = isPlainObject(scopeOrName) ? scopeOrName : {};
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
            return _.toGetterSetterFunction(new ObservableValue(value, mode, context));
        case _.ValueType.ComplexFunction:
            throw new Error("[mobservable.makeReactive] Creating reactive functions from functions with multiple arguments is currently not supported, see https://github.com/mweststrate/mobservable/issues/12");
        case _.ValueType.ViewFunction:
            if (!context.name)
                context.name = value.name;
            return _.toGetterSetterFunction(new ObservableView(value, opts.scope || opts.context, context, mode === _.ValueMode.Structure));
        case _.ValueType.Array:
        case _.ValueType.PlainObject:
            return _.makeChildReactive(value, mode, context);
    }
    throw "Illegal State";
}

/**
    * Can be used in combination with makeReactive / extendReactive.
    * Enforces that a reference to 'value' is stored as property,
    * but that 'value' itself is not turned into something reactive.
    * Future assignments to the same property will inherit this behavior.
    * @param value initial value of the reactive property that is being defined.
    */
export function asReference<T>(value:T):T {
    // unsound typecast, but in combination with makeReactive, the end result should be of the correct type this way
    // e.g: makeReactive({ x : asReference(number)}) -> { x : number }
    return <T><any> new _.AsReference(value);
}

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
export function asStructure<T>(value:T):T {
    return <T><any>new _.AsStructure(value);
}

/**
    * Can be used in combination with makeReactive / extendReactive.
    * The value will be made reactive, but, if the value is an object or array,
    * children will not automatically be made reactive as well.
    */
export function asFlat<T>(value:T):T {
    return <T><any> new _.AsFlat(value);
}

/**
    * Returns true if the provided value is reactive.
    * @param value object, function or array
    * @param propertyName if propertyName is specified, checkes whether value.propertyName is reactive.
    */
export function isReactive(value):boolean {
    if (value === null || value === undefined)
        return false;
    return !!value.$mobservable;
}

/**
    * Deprecated, use mobservable.observe instead.
    */
export function sideEffect(func:Lambda, scope?:any):Lambda {
    console.warn(`[mobservable.sideEffect] 'sideEffect' has been renamed to 'observe' and will be removed in a later version.`);
    return observe(func, scope);
}

/**
    * Creates a reactive view and keeps it alive, so that the view is always
    * updated if one of the dependencies changes, even when the view is not further used by something else.
    * @param view The reactive view
    * @param scope (optional)
    * @returns disposer function, which can be used to stop the view from being updated in the future.
    */
export function observe(view:Lambda, scope?:any):Lambda {
    var [mode, unwrappedView] = _.getValueModeFromValue(view, _.ValueMode.Recursive);
    const observable = new ObservableView(unwrappedView, scope, {
        object: scope,
        name: view.name
    }, mode === _.ValueMode.Structure);
    observable.setRefCount(+1);

    const disposer = once(() => {
        observable.setRefCount(-1);
    });
    if (logLevel >= 2 && observable.observing.length === 0)
        console.warn(`[mobservable.observe] not a single observable was used inside the observing function. This observer is now a no-op.`);
    (<any>disposer).$mobservable = observable;
    return disposer;
}

/**
    * Similar to 'observer', observes the given predicate until it returns true.
    * Once it returns true, the 'effect' function is invoked an the observation is cancelled.
    * @param predicate
    * @param effect
    * @param scope (optional)
    * @returns disposer function to prematurely end the observer.
    */
export function observeUntil(predicate: ()=>boolean, effect: Lambda, scope?: any): Lambda {
    const disposer = observe(() => {
        if (predicate.call(scope)) {
            disposer();
            effect.call(scope);
        }
    });
    return disposer;
}

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

    return once(() => {
        disposer();
        if (timeoutHandle)
            clearTimeout(timeoutHandle);
    });
}

export function when(predicate: ()=>boolean, effect: Lambda, scope?: any): Lambda {
    console.error("[mobservable.when] deprecated, please use 'mobservable.observeUntil'");
    return observeUntil(predicate, effect, scope);
}

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
export function expr<T>(expr: () => T, scope?):T {
    if (!isComputingView())
        throw new Error("[mobservable.expr] 'expr' can only be used inside a computed value.");
    return makeReactive(expr, scope) ();
}

/**
    * Extends an object with reactive capabilities.
    * @param target the object to which reactive properties should be added
    * @param properties the properties that should be added and made reactive
    * @returns targer
    */
export function extendReactive<A extends Object, B extends Object>(target: A, properties: B, context?: IContextInfoStruct): A & B {
    return <A & B> _.extendReactive(target, properties, _.ValueMode.Recursive, context); // No other mode makes sense..?
}

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
        ObservableObject.asReactive(this, null, _.ValueMode.Recursive).set(key, baseValue);
        return this[key];
    };
    descriptor.set = isDecoratingProperty 
        ? throwingViewSetter
        : function(value) { 
            ObservableObject.asReactive(this, null, _.ValueMode.Recursive).set(key, value); 
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
    if (Array.isArray(source) || source instanceof ObservableArray)
        return source.map(toJSON);
    if (typeof source === "object" && isPlainObject(source)) {
        var res = {};
        for (var key in source) if (source.hasOwnProperty(key))
            res[key] = toJSON(source[key]);
        return res;
    }
    return source;
}

/**
    * Converts a reactive structure into a non-reactive structure.
    * Basically a deep-clone.
    */
export function toJson(source) {
    console.warn("mobservable.toJson is deprecated, use mobservable.toJSON instead");
    return toJSON(source);
}

/**
    * During a transaction no views are updated until the end of the transaction.
    * The transaction will be run synchronously nonetheless.
    * @param action a function that updates some reactive state
    * @returns any value that was returned by the 'action' parameter.
    */
export function transaction<T>(action:()=>T):T {
    return batch(action);
}

/**
    Evaluates func and return its results. Watch tracks all observables that are used by 'func'
    and invokes 'onValidate' whenever func *should* update.
    Returns  a tuplde [return value of func, disposer]. The disposer can be used to abort the watch early.
*/
export function observeUntilInvalid<T>(func:()=>T, onInvalidate:Lambda, context?: IContextInfo):[T,Lambda, any] {
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

/**
    * Sets the reporting level Defaults to 1. Use 0 for production or 2 for increased verbosity.
    */
export var logLevel = 1; // 0 = production, 1 = development, 2 = debugging

/**
    * If strict is enabled, views are not allowed to modify the state.
    * This is a recommended practice, as it makes reasoning about your application simpler.
    */
export var strict = true;

setTimeout(function() {
    if (logLevel > 0)
        console.info(`Welcome to mobservable. Current logLevel = ${logLevel}. Change mobservable.logLevel according to your needs: 0 = production, 1 = development, 2 = debugging. Strict mode is ${strict ? 'enabled' : 'disabled'}.`);
}, 1);

