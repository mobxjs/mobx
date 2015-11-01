import { Lambda, IObservableArray, IObservableValue, IContextInfoStruct } from './interfaces';
import { ObservableValue } from './observablevalue';
import { ObservableView } from './observableview';
import { ObservableMap, KeyValueMap } from './observablemap';
/**
    * Turns an object, array or function into a reactive structure.
    * @param value the value which should become observable.
    */
export declare function observable(target: Object, key: string, baseDescriptor?: PropertyDescriptor): any;
export declare function observable<T>(value: T[]): IObservableArray<T>;
export declare function observable<T, S extends Object>(value: () => T, thisArg?: S): IObservableValue<T>;
export declare function observable<T extends string | number | boolean | Date | RegExp | Function | void>(value: T): IObservableValue<T>;
export declare function observable<T extends Object>(value: T): T;
/**
 * Creates a map, similar to ES6 maps (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map),
 * yet observable.
 */
export declare function map<V>(initialValues?: KeyValueMap<V>, valueModifier?: Function): ObservableMap<V>;
/**
    * Can be used in combination with makeReactive / extendReactive.
    * Enforces that a reference to 'value' is stored as property,
    * but that 'value' itself is not turned into something reactive.
    * Future assignments to the same property will inherit this behavior.
    * @param value initial value of the reactive property that is being defined.
    */
export declare function asReference<T>(value: T): T;
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
export declare function asStructure<T>(value: T): T;
/**
    * Can be used in combination with makeReactive / extendReactive.
    * The value will be made reactive, but, if the value is an object or array,
    * children will not automatically be made reactive as well.
    */
export declare function asFlat<T>(value: T): T;
/**
    * Returns true if the provided value is reactive.
    * @param value object, function or array
    * @param propertyName if propertyName is specified, checkes whether value.propertyName is reactive.
    */
export declare function isObservable(value: any): boolean;
/**
    * Creates a reactive view and keeps it alive, so that the view is always
    * updated if one of the dependencies changes, even when the view is not further used by something else.
    * @param view The reactive view
    * @param scope (optional)
    * @returns disposer function, which can be used to stop the view from being updated in the future.
    */
export declare function autorun(view: Lambda, scope?: any): Lambda;
/**
    * Similar to 'observer', observes the given predicate until it returns true.
    * Once it returns true, the 'effect' function is invoked an the observation is cancelled.
    * @param predicate
    * @param effect
    * @param scope (optional)
    * @returns disposer function to prematurely end the observer.
    */
export declare function autorunUntil(predicate: () => boolean, effect: Lambda, scope?: any): Lambda;
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
export declare function autorunAsync<T>(view: () => T, effect: (latestValue: T) => void, delay?: number, scope?: any): Lambda;
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
export declare function expr<T>(expr: () => T, scope?: any): T;
/**
    * Extends an object with reactive capabilities.
    * @param target the object to which reactive properties should be added
    * @param properties the properties that should be added and made reactive
    * @returns targer
    */
export declare function extendObservable<A extends Object, B extends Object>(target: A, properties: B, context?: IContextInfoStruct): A & B;
/**
    * Basically, a deep clone, so that no reactive property will exist anymore.
    * Doesn't follow references.
    */
export declare function toJSON(source: any): any;
/**
    * During a transaction no views are updated until the end of the transaction.
    * The transaction will be run synchronously nonetheless.
    * @param action a function that updates some reactive state
    * @returns any value that was returned by the 'action' parameter.
    */
export declare function transaction<T>(action: () => T): T;
export declare function getStrict(): boolean;
export declare function withStrict(newStrict: boolean, func: Lambda): void;
/**
 * Internal methods
 */
export declare enum ValueType {
    Reference = 0,
    PlainObject = 1,
    ComplexObject = 2,
    Array = 3,
    ViewFunction = 4,
    ComplexFunction = 5,
}
export declare enum ValueMode {
    Recursive = 0,
    Reference = 1,
    Structure = 2,
    Flat = 3,
}
export declare function getTypeOfValue(value: any): ValueType;
export declare function extendObservableHelper(target: any, properties: any, mode: ValueMode, context: IContextInfoStruct): Object;
export declare function toGetterSetterFunction<T>(observable: ObservableValue<T> | ObservableView<T>): IObservableValue<T>;
export declare class AsReference {
    value: any;
    constructor(value: any);
}
export declare class AsStructure {
    value: any;
    constructor(value: any);
}
export declare class AsFlat {
    value: any;
    constructor(value: any);
}
export declare function getValueModeFromValue(value: any, defaultMode: ValueMode): [ValueMode, any];
export declare function getValueModeFromModifierFunc(func?: Function): ValueMode;
export declare function makeChildObservable(value: any, parentMode: ValueMode, context: any): any;
export declare function assertUnwrapped(value: any, message: any): void;
