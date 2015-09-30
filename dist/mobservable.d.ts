// Type definitions for mobservable v0.6.10
// Project: https://mweststrate.github.io/mobservable
// Definitions by: Michel Weststrate <https://github.com/mweststrate/>
// Definitions: https://github.com/borisyankov/DefinitelyTyped


interface _IMobservableStatic {
    /**
     * Turns an object, array or function into a reactive structure.
     * @param value the value which should become observable.
     */
    makeReactive: IMakeReactive;

    /**
     * Extends an object with reactive capabilities.
     * @param target the object to which reactive properties should be added
     * @param properties the properties that should be added and made reactive
     * @returns targer
     */
    extendReactive<A extends Object, B extends Object>(target: A, properties: B): A & B;

    /**
     * Returns true if the provided value is reactive.
     * @param value object, function or array
     * @param propertyName if propertyName is specified, checkes whether value.propertyName is reactive.
     */
    isReactive(value: any, propertyName?:string): boolean;

    /**
     * Can be used in combination with makeReactive / extendReactive.
     * Enforces that a reference to 'value' is stored as property,
     * but that 'value' itself is not turned into something reactive.
     * Future assignments to the same property will inherit this behavior.
     * @param value initial value of the reactive property that is being defined.
     */
    asReference<T>(value: T): T;

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
    asStructure<T>(value: T): T;

    /**
     * Can be used in combination with makeReactive / extendReactive.
     * The value will be made reactive, but, if the value is an object or array,
     * children will not automatically be made reactive as well.
     */
    asFlat<T>(value: T): T;

    /**
     * ES6 / Typescript decorator which can to make class properties and getter functions reactive.
     */
    observable(target: Object, key: string):any; // decorator / annotation

    /**
     * Creates a reactive view and keeps it alive, so that the view is always
     * updated if one of the dependencies changes, even when the view is not further used by something else.
     * @param view The reactive view
     * @param scope (optional)
     * @returns disposer function, which can be used to stop the view from being updated in the future.
     */
    observe(view: Mobservable.Lambda, scope?: any): Mobservable.Lambda;
    
    /**
     * Deprecated, use mobservable.observe instead.
     */
    sideEffect(view: Mobservable.Lambda, scope?: any): Mobservable.Lambda;

    /**
     * Similar to 'observer', observes the given predicate until it returns true.
     * Once it returns true, the 'effect' function is invoked an the observation is cancelled.
     * @param predicate
     * @param effect
     * @param scope (optional)
     * @returns disposer function to prematurely end the observer.
     */
    observeUntil(predicate: ()=>boolean, effect: Mobservable.Lambda, scope?: any): Mobservable.Lambda;

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
    observeAsync<T>(view: () => T, effect: (latestValue : T ) => void, delay?:number, scope?: any): Mobservable.Lambda;


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
    expr<T>(expr:()=>T, scope?) : T;

    /**
     * During a transaction no views are updated until the end of the transaction.
     * The transaction will be run synchronously nonetheless.
     * @param action a function that updates some reactive state
     * @returns any value that was returned by the 'action' parameter.
     */
    transaction<T>(action: ()=>T): T;

    /**
     * Converts a reactive structure into a non-reactive structure.
     * Basically a deep-clone.
     */
    toJSON<T>(value: T): T;

    /**
     * Sets the reporting level Defaults to 1. Use 0 for production or 2 for increased verbosity.
     */
    logLevel:  number;

    /**
     * If strict is enabled, views are not allowed to modify the state.
     * This is a recommended practice, as it makes reasoning about your application simpler.
     */
    strict: boolean;

    extras: {
        getDependencyTree(thing:any, property?:string): Mobservable.IDependencyTree;

        getObserverTree(thing:any, property?:string): Mobservable.IObserverTree;

        trackTransitions(extensive?:boolean, onReport?:(lines:Mobservable.ITransitionEvent) => void) : Mobservable.Lambda;
    }
}

interface IMakeReactive {
    <T>(value: T[], name?:string): Mobservable.IObservableArray<T>;
    <T>(value: ()=>T, nameOrScope?: string | Object, name?: string): Mobservable.IObservableValue<T>;
    <T extends string|number|boolean|Date|RegExp|Function|void>(value: T, name?:string): Mobservable.IObservableValue<T>;
    <T extends Object>(value: T, name?: string): T;
}

interface IMobservableStatic extends _IMobservableStatic, IMakeReactive {
}

declare module Mobservable {
    interface IMakeReactiveOptions {
        as?:  string /* "auto" | "reference" | TODO:  see #8 "structure" */
        scope?:  Object,
        context?: Object,
        recurse?:  boolean;
        name?: string;
        // protected:  boolean TODO:  see #9
    }

    export interface IContextInfoStruct {
        object: Object;
        name: string;
    }

    export type IContextInfo = IContextInfoStruct | string;

    interface Lambda {
        (): void;
        name?: string;
    }

    interface IObservable {
        observe(callback: (...args: any[])=>void, fireImmediately?: boolean): Lambda;
    }

    interface IObservableValue<T> extends IObservable {
        (): T;
        (value: T):void;
        observe(callback: (newValue: T, oldValue: T)=>void, fireImmediately?: boolean): Lambda;
    }

    interface IObservableArray<T> extends IObservable, Array<T> {
        spliceWithArray(index: number, deleteCount?: number, newItems?: T[]): T[];
        observe(listener: (changeData: IArrayChange<T>|IArraySplice<T>)=>void, fireImmediately?: boolean): Lambda;
        clear(): T[];
        replace(newItems: T[]): T[];
        find(predicate: (item: T,index: number,array: IObservableArray<T>)=>boolean,thisArg?: any,fromIndex?: number): T;
        remove(value: T): boolean;
    }

    interface IArrayChange<T> {
        type:  string; // Always:  'update'
        object:  IObservableArray<T>;
        index:  number;
        oldValue:  T;
    }

    interface IArraySplice<T> {
        type:  string; // Always:  'splice'
        object:  IObservableArray<T>;
        index:  number;
        removed:  T[];
        addedCount:  number;
    }

    interface IDependencyTree {
        id: number;
        name: string;
        context: any;
        dependencies?: IDependencyTree[];
    }

    interface IObserverTree {
        id: number;
        name: string;
        context: any;
        observers?: IObserverTree[];
        listeners?: number; // amount of functions manually attached using an .observe method
    }

    interface ITransitionEvent {
        id: number;
        name: string;
        context: Object;
        state: string;
        changed: boolean;
        newValue: string;
    }
}

declare module "mobservable" {
	var m : IMobservableStatic;
	export = m;
}