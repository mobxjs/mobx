export { IAtom, Atom, BaseAtom };
export { IObservable, IDepTreeNode };
export { Reaction, IReactionPublic, IReactionDisposer };
export { IDerivation, untracked, IDerivationState };
export { useStrict, isStrictModeEnabled, IAction };
export { spy };
export { IComputedValue };
export { asReference, asFlat, asStructure, asMap };
export { IModifierDescriptor, IEnhancer, isModifierDescriptor };
export { IInterceptable, IInterceptor };
export { IListenable };
export { IObjectWillChange, IObjectChange, IObservableObject, isObservableObject };
export { IValueDidChange, IValueWillChange, IObservableValue, isObservableValue as isBoxedObservable };
export { IObservableArray, IArrayWillChange, IArrayWillSplice, IArrayChange, IArraySplice, isObservableArray };
export { IKeyValueMap, ObservableMap, IMapEntries, IMapEntry, IMapWillChange, IMapChange, IMapChangeUpdate, IMapChangeAdd, IMapChangeBase, IMapChangeDelete, isObservableMap, map, IObservableMapInitialValues, IMap };
export { transaction };
export { observable, IObservableFactory, IObservableFactories };
export { computed, IComputed, IComputedValueOptions };
export { isObservable };
export { isComputed };
export { extendObservable, extendShallowObservable };
export { observe };
export { intercept };
export { autorun, autorunAsync, when, reaction, IReactionOptions };
export { action, isAction, runInAction, IActionFactory };
export { expr };
export { toJS };
export { ITransformer, createTransformer };
export { whyRun };
export { Lambda, isArrayLike };
export { Iterator };
export { IObserverTree, IDependencyTree };
export declare const extras: {
    allowStateChanges: <T>(allowStateChanges: boolean, func: () => T) => T;
    deepEqual: (a: any, b: any) => any;
    getAtom: (thing: any, property?: string) => IDepTreeNode;
    getDebugName: (thing: any, property?: string) => string;
    getDependencyTree: (thing: any, property?: string) => IDependencyTree;
    getAdministration: (thing: any, property?: string) => any;
    getGlobalState: () => any;
    getObserverTree: (thing: any, property?: string) => IObserverTree;
    isComputingDerivation: () => boolean;
    isSpyEnabled: () => boolean;
    onReactionError: (handler: (error: any, derivation: IDerivation) => void) => () => void;
    reserveArrayBuffer: (max: number) => void;
    resetGlobalState: () => void;
    shareGlobalState: () => void;
    spyReport: (event: any) => void;
    spyReportEnd: (change?: any) => void;
    spyReportStart: (event: any) => void;
    setReactionScheduler: (fn: (f: () => void) => void) => void;
};
interface IActionFactory {
    <A1, R, T extends (a1: A1) => R>(fn: T): T & IAction;
    <A1, A2, R, T extends (a1: A1, a2: A2) => R>(fn: T): T & IAction;
    <A1, A2, A3, R, T extends (a1: A1, a2: A2, a3: A3) => R>(fn: T): T & IAction;
    <A1, A2, A3, A4, R, T extends (a1: A1, a2: A2, a3: A3, a4: A4) => R>(fn: T): T & IAction;
    <A1, A2, A3, A4, A5, R, T extends (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => R>(fn: T): T & IAction;
    <A1, A2, A3, A4, A5, A6, R, T extends (a1: A1, a2: A2, a3: A3, a4: A4, a6: A6) => R>(fn: T): T & IAction;
    <A1, R, T extends (a1: A1) => R>(name: string, fn: T): T & IAction;
    <A1, A2, R, T extends (a1: A1, a2: A2) => R>(name: string, fn: T): T & IAction;
    <A1, A2, A3, R, T extends (a1: A1, a2: A2, a3: A3) => R>(name: string, fn: T): T & IAction;
    <A1, A2, A3, A4, R, T extends (a1: A1, a2: A2, a3: A3, a4: A4) => R>(name: string, fn: T): T & IAction;
    <A1, A2, A3, A4, A5, R, T extends (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => R>(name: string, fn: T): T & IAction;
    <A1, A2, A3, A4, A5, A6, R, T extends (a1: A1, a2: A2, a3: A3, a4: A4, a6: A6) => R>(name: string, fn: T): T & IAction;
    <T extends Function>(fn: T): T & IAction;
    <T extends Function>(name: string, fn: T): T & IAction;
    (customName: string): (target: Object, key: string, baseDescriptor?: PropertyDescriptor) => void;
    (target: Object, propertyKey: string, descriptor?: PropertyDescriptor): void;
    bound<A1, R, T extends (a1: A1) => R>(fn: T): T & IAction;
    bound<A1, A2, R, T extends (a1: A1, a2: A2) => R>(fn: T): T & IAction;
    bound<A1, A2, A3, R, T extends (a1: A1, a2: A2, a3: A3) => R>(fn: T): T & IAction;
    bound<A1, A2, A3, A4, R, T extends (a1: A1, a2: A2, a3: A3, a4: A4) => R>(fn: T): T & IAction;
    bound<A1, A2, A3, A4, A5, R, T extends (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => R>(fn: T): T & IAction;
    bound<A1, A2, A3, A4, A5, A6, R, T extends (a1: A1, a2: A2, a3: A3, a4: A4, a6: A6) => R>(fn: T): T & IAction;
    bound<T extends Function>(fn: T): T & IAction;
    bound<T extends Function>(name: string, fn: T): T & IAction;
    bound(target: Object, propertyKey: string, descriptor?: PropertyDescriptor): void;
}
declare var action: IActionFactory;
declare function runInAction<T>(block: () => T, scope?: any): T;
declare function runInAction<T>(name: string, block: () => T, scope?: any): T;
declare function isAction(thing: any): boolean;
declare function autorun(view: (r: IReactionPublic) => void, scope?: any): IReactionDisposer;
declare function autorun(name: string, view: (r: IReactionPublic) => void, scope?: any): IReactionDisposer;
declare function when(name: string, predicate: () => boolean, effect: Lambda, scope?: any): IReactionDisposer;
declare function when(predicate: () => boolean, effect: Lambda, scope?: any): Lambda;
declare function autorunAsync(name: string, func: (r: IReactionPublic) => void, delay?: number, scope?: any): IReactionDisposer;
declare function autorunAsync(func: (r: IReactionPublic) => void, delay?: number, scope?: any): IReactionDisposer;
interface IReactionOptions {
    context?: any;
    fireImmediately?: boolean;
    delay?: number;
    compareStructural?: boolean;
    struct?: boolean;
    name?: string;
}
declare function reaction<T>(expression: (r: IReactionPublic) => T, effect: (arg: T, r: IReactionPublic) => void, opts?: IReactionOptions): IReactionDisposer;
declare function reaction<T>(expression: (r: IReactionPublic) => T, effect: (arg: T, r: IReactionPublic) => void, fireImmediately?: boolean): IReactionDisposer;
interface IComputedValueOptions<T> {
    compareStructural?: boolean;
    struct?: boolean;
    name?: string;
    setter?: (value: T) => void;
    context?: any;
}
interface IComputed {
    <T>(func: () => T, setter?: (value: T) => void): IComputedValue<T>;
    <T>(func: () => T, options: IComputedValueOptions<T>): IComputedValue<T>;
    (target: Object, key: string | symbol, baseDescriptor?: PropertyDescriptor): void;
    struct(target: Object, key: string | symbol, baseDescriptor?: PropertyDescriptor): void;
}
declare var computed: IComputed;
declare type ITransformer<A, B> = (object: A) => B;
declare function createTransformer<A, B>(transformer: ITransformer<A, B>, onCleanup?: (resultObject: B | undefined, sourceObject?: A) => void): ITransformer<A, B>;
declare function expr<T>(expr: () => T, scope?: any): T;
declare function extendObservable<A extends Object, B extends Object>(target: A, ...properties: B[]): A & B;
declare function extendShallowObservable<A extends Object, B extends Object>(target: A, ...properties: B[]): A & B;
interface IDependencyTree {
    name: string;
    dependencies?: IDependencyTree[];
}
interface IObserverTree {
    name: string;
    observers?: IObserverTree[];
}
declare function intercept<T>(value: IObservableValue<T>, handler: IInterceptor<IValueWillChange<T>>): Lambda;
declare function intercept<T>(observableArray: IObservableArray<T>, handler: IInterceptor<IArrayWillChange<T> | IArrayWillSplice<T>>): Lambda;
declare function intercept<T>(observableMap: ObservableMap<T>, handler: IInterceptor<IMapWillChange<T>>): Lambda;
declare function intercept<T>(observableMap: ObservableMap<T>, property: string, handler: IInterceptor<IValueWillChange<T>>): Lambda;
declare function intercept(object: Object, handler: IInterceptor<IObjectWillChange>): Lambda;
declare function intercept(object: Object, property: string, handler: IInterceptor<IValueWillChange<any>>): Lambda;
declare function isComputed(value: any, property?: string): boolean;
declare function isObservable(value: any, property?: string): boolean;
interface IObservableFactory {
    <T>(): IObservableValue<T>;
    <T>(wrapped: IModifierDescriptor<T>): T;
    (target: Object, key: string, baseDescriptor?: PropertyDescriptor): any;
    <T>(value: T[]): IObservableArray<T>;
    (value: string): IObservableValue<string>;
    (value: boolean): IObservableValue<boolean>;
    (value: number): IObservableValue<number>;
    (value: Date): IObservableValue<Date>;
    (value: RegExp): IObservableValue<RegExp>;
    (value: Function): IObservableValue<Function>;
    <T>(value: null | undefined): IObservableValue<T>;
    (value: null | undefined): IObservableValue<any>;
    (): IObservableValue<any>;
    <T>(value: IMap<string | number | boolean, T>): ObservableMap<T>;
    <T extends Object>(value: T): T & IObservableObject;
    <T>(value: T): IObservableValue<T>;
}
declare class IObservableFactories {
    box<T>(value?: T, name?: string): IObservableValue<T>;
    shallowBox<T>(value?: T, name?: string): IObservableValue<T>;
    array<T>(initialValues?: T[], name?: string): IObservableArray<T>;
    shallowArray<T>(initialValues?: T[], name?: string): IObservableArray<T>;
    map<T>(initialValues?: IObservableMapInitialValues<T>, name?: string): ObservableMap<T>;
    shallowMap<T>(initialValues?: IObservableMapInitialValues<T>, name?: string): ObservableMap<T>;
    object<T>(props: T, name?: string): T & IObservableObject;
    shallowObject<T>(props: T, name?: string): T & IObservableObject;
    ref(target: Object, property: string, descriptor?: PropertyDescriptor): any;
    ref<T>(initialValue: T): T;
    shallow(target: Object, property: string, descriptor?: PropertyDescriptor): any;
    shallow<T>(initialValues: T[]): IObservableArray<T>;
    shallow<T>(initialValues: IMap<string | number | boolean, T>): ObservableMap<T>;
    shallow<T extends Object>(value: T): T;
    deep(target: Object, property: string, descriptor?: PropertyDescriptor): any;
    deep<T>(initialValues: T[]): IObservableArray<T>;
    deep<T>(initialValues: IMap<string | number | boolean, T>): ObservableMap<T>;
    deep<T>(initialValue: T): T;
    struct(target: Object, property: string, descriptor?: PropertyDescriptor): any;
    struct<T>(initialValues: T[]): IObservableArray<T>;
    struct<T>(initialValues: IMap<string | number | boolean, T>): ObservableMap<T>;
    struct<T>(initialValue: T): T;
}
declare var observable: IObservableFactory & IObservableFactories & {
    deep: {
        struct<T>(initialValue?: T): T;
    };
    ref: {
        struct<T>(initialValue?: T): T;
    };
};
declare function observe<T>(value: IObservableValue<T> | IComputedValue<T>, listener: (change: IValueDidChange<T>) => void, fireImmediately?: boolean): Lambda;
declare function observe<T>(observableArray: IObservableArray<T>, listener: (change: IArrayChange<T> | IArraySplice<T>) => void, fireImmediately?: boolean): Lambda;
declare function observe<T>(observableMap: ObservableMap<T>, listener: (change: IMapChange<T>) => void, fireImmediately?: boolean): Lambda;
declare function observe<T>(observableMap: ObservableMap<T>, property: string, listener: (change: IValueDidChange<T>) => void, fireImmediately?: boolean): Lambda;
declare function observe(object: Object, listener: (change: IObjectChange) => void, fireImmediately?: boolean): Lambda;
declare function observe(object: Object, property: string, listener: (change: IValueDidChange<any>) => void, fireImmediately?: boolean): Lambda;
declare function toJS<T>(source: T, detectCycles?: boolean): T;
declare function toJS(source: any, detectCycles?: boolean): any;
declare function toJS(source: any, detectCycles: boolean, __alreadySeen: [any, any][]): any;
declare function transaction<T>(action: () => T, thisArg?: any): T;
declare function whyRun(thing?: any, prop?: string): string;
interface IAction {
    originalFn: Function;
    isMobxAction: boolean;
}
declare function useStrict(strict: boolean): any;
declare function isStrictModeEnabled(): boolean;
interface IAtom extends IObservable {
}
declare class BaseAtom implements IAtom {
    name: string;
    isPendingUnobservation: boolean;
    observers: any[];
    observersIndexes: {};
    diffValue: number;
    lastAccessedBy: number;
    lowestObserverState: IDerivationState;
    constructor(name?: string);
    onBecomeUnobserved(): void;
    reportObserved(): void;
    reportChanged(): void;
    toString(): string;
}
declare class Atom extends BaseAtom implements IAtom {
    name: string;
    onBecomeObservedHandler: () => void;
    onBecomeUnobservedHandler: () => void;
    isPendingUnobservation: boolean;
    isBeingTracked: boolean;
    constructor(name?: string, onBecomeObservedHandler?: () => void, onBecomeUnobservedHandler?: () => void);
    reportObserved(): boolean;
    onBecomeUnobserved(): void;
}
interface IComputedValue<T> {
    get(): T;
    set(value: T): void;
    observe(listener: (change: IValueDidChange<T>) => void, fireImmediately?: boolean): Lambda;
}
declare enum IDerivationState {
    NOT_TRACKING = -1,
    UP_TO_DATE = 0,
    POSSIBLY_STALE = 1,
    STALE = 2,
}
interface IDerivation extends IDepTreeNode {
    observing: IObservable[];
    newObserving: null | IObservable[];
    dependenciesState: IDerivationState;
    runId: number;
    unboundDepsCount: number;
    __mapid: string;
    onBecomeStale(): any;
}
declare function untracked<T>(action: () => T): T;
interface IDepTreeNode {
    name: string;
    observing?: IObservable[];
}
interface IObservable extends IDepTreeNode {
    diffValue: number;
    lastAccessedBy: number;
    lowestObserverState: IDerivationState;
    isPendingUnobservation: boolean;
    observers: IDerivation[];
    observersIndexes: {};
    onBecomeUnobserved(): any;
}
interface IReactionPublic {
    dispose(): void;
}
interface IReactionDisposer {
    (): void;
    $mobx: Reaction;
    onError(handler: (error: any, derivation: IDerivation) => void): any;
}
declare class Reaction implements IDerivation, IReactionPublic {
    name: string;
    private onInvalidate;
    observing: IObservable[];
    newObserving: IObservable[];
    dependenciesState: IDerivationState;
    diffValue: number;
    runId: number;
    unboundDepsCount: number;
    __mapid: string;
    isDisposed: boolean;
    _isScheduled: boolean;
    _isTrackPending: boolean;
    _isRunning: boolean;
    errorHandler: (error: any, derivation: IDerivation) => void;
    constructor(name: string, onInvalidate: () => void);
    onBecomeStale(): void;
    schedule(): void;
    isScheduled(): boolean;
    runReaction(): void;
    track(fn: () => void): void;
    reportExceptionInDerivation(error: any): void;
    dispose(): void;
    getDisposer(): IReactionDisposer;
    toString(): string;
    whyRun(): string;
}
declare function spy(listener: (change: any) => void): Lambda;
declare type IInterceptor<T> = (change: T) => T | null;
interface IInterceptable<T> {
    interceptors: IInterceptor<T>[] | null;
    intercept(handler: IInterceptor<T>): Lambda;
}
interface IListenable {
    changeListeners: Function[] | null;
    observe(handler: (change: any, oldValue?: any) => void, fireImmediately?: boolean): Lambda;
}
declare function asReference<T>(value: T): T;
declare function asStructure<T>(value: T): T;
declare function asFlat<T>(value: T): T;
declare function asMap(): ObservableMap<any>;
declare function asMap<T>(): ObservableMap<T>;
declare function asMap<T>(entries: IMapEntries<T>): ObservableMap<T>;
declare function asMap<T>(data: IKeyValueMap<T>): ObservableMap<T>;
interface IEnhancer<T> {
    (newValue: T, oldValue: T | undefined, name: string): T;
}
interface IModifierDescriptor<T> {
    isMobxModifierDescriptor: boolean;
    initialValue: T | undefined;
    enhancer: IEnhancer<T>;
}
declare function isModifierDescriptor(thing: any): thing is IModifierDescriptor<any>;
interface IObservableArray<T> extends Array<T> {
    spliceWithArray(index: number, deleteCount?: number, newItems?: T[]): T[];
    observe(listener: (changeData: IArrayChange<T> | IArraySplice<T>) => void, fireImmediately?: boolean): Lambda;
    intercept(handler: IInterceptor<IArrayChange<T> | IArraySplice<T>>): Lambda;
    intercept<T>(handler: IInterceptor<IArrayChange<T> | IArraySplice<T>>): Lambda;
    clear(): T[];
    peek(): T[];
    replace(newItems: T[]): T[];
    find(predicate: (item: T, index: number, array: IObservableArray<T>) => boolean, thisArg?: any, fromIndex?: number): T;
    remove(value: T): boolean;
    move(fromIndex: number, toIndex: number): void;
}
interface IArrayChange<T> {
    type: "update";
    object: IObservableArray<T>;
    index: number;
    newValue: T;
    oldValue: T;
}
interface IArraySplice<T> {
    type: "splice";
    object: IObservableArray<T>;
    index: number;
    added: T[];
    addedCount: number;
    removed: T[];
    removedCount: number;
}
interface IArrayWillChange<T> {
    type: "update";
    object: IObservableArray<T>;
    index: number;
    newValue: T;
}
interface IArrayWillSplice<T> {
    type: "splice";
    object: IObservableArray<T>;
    index: number;
    added: T[];
    removedCount: number;
}
declare function isObservableArray(thing: any): thing is IObservableArray<any>;
interface IMap<K, V> {
    clear(): void;
    delete(key: K): boolean;
    forEach(callbackfn: (value: V, index: K, map: IMap<K, V>) => void, thisArg?: any): void;
    get(key: K): V | undefined;
    has(key: K): boolean;
    set(key: K, value?: V): this;
    readonly size: number;
}
interface IKeyValueMap<V> {
    [key: string]: V;
}
declare type IMapEntry<V> = [string, V];
declare type IMapEntries<V> = IMapEntry<V>[];
declare type IMapChange<T> = IMapChangeUpdate<T> | IMapChangeAdd<T> | IMapChangeDelete<T>;
interface IMapChangeBase<T> {
    object: ObservableMap<T>;
    name: string;
}
interface IMapChangeUpdate<T> extends IMapChangeBase<T> {
    type: "update";
    newValue: T;
    oldValue: T;
}
interface IMapChangeAdd<T> extends IMapChangeBase<T> {
    type: "add";
    newValue: T;
}
interface IMapChangeDelete<T> extends IMapChangeBase<T> {
    type: "delete";
    oldValue: T;
}
interface IMapWillChange<T> {
    object: ObservableMap<T>;
    type: "update" | "add" | "delete";
    name: string;
    newValue?: T;
}
declare type IObservableMapInitialValues<V> = IMapEntries<V> | IKeyValueMap<V> | IMap<string, V>;
declare class ObservableMap<V> implements IInterceptable<IMapWillChange<V>>, IListenable, IMap<string, V> {
    enhancer: IEnhancer<V>;
    name: string;
    $mobx: {};
    private _data;
    private _hasMap;
    private _keys;
    interceptors: any;
    changeListeners: any;
    constructor(initialData?: IObservableMapInitialValues<V>, enhancer?: IEnhancer<V>, name?: string);
    private _has(key);
    has(key: string): boolean;
    set(key: string, value?: V | undefined): this;
    delete(key: string): boolean;
    private _updateHasMapEntry(key, value);
    private _updateValue(name, newValue);
    private _addValue(name, newValue);
    get(key: string): V | undefined;
    keys(): string[] & Iterator<string>;
    values(): V[] & Iterator<V>;
    entries(): IMapEntries<V> & Iterator<IMapEntry<V>>;
    forEach(callback: (value: V, key: string, object: IMap<string, V>) => void, thisArg?: any): void;
    merge(other: ObservableMap<V> | IKeyValueMap<V> | any): ObservableMap<V>;
    clear(): void;
    replace(values: ObservableMap<V> | IKeyValueMap<V> | any): ObservableMap<V>;
    readonly size: number;
    toJS(): IKeyValueMap<V>;
    toJSON(): IKeyValueMap<V>;
    private isValidKey(key);
    private assertValidKey(key);
    toString(): string;
    observe(listener: (changes: IMapChange<V>) => void, fireImmediately?: boolean): Lambda;
    intercept(handler: IInterceptor<IMapWillChange<V>>): Lambda;
}
declare function map<V>(initialValues?: IObservableMapInitialValues<V>): ObservableMap<V>;
declare var isObservableMap: (thing: any) => thing is ObservableMap<any>;
interface IObservableObject {
    "observable-object": IObservableObject;
}
interface IObjectChange {
    name: string;
    object: any;
    type: "update" | "add";
    oldValue?: any;
    newValue: any;
}
interface IObjectWillChange {
    object: any;
    type: "update" | "add";
    name: string;
    newValue: any;
}
declare function isObservableObject(thing: any): thing is IObservableObject;
interface IValueWillChange<T> {
    object: any;
    type: "update";
    newValue: T;
}
interface IValueDidChange<T> extends IValueWillChange<T> {
    oldValue: T | undefined;
}
interface IObservableValue<T> {
    get(): T;
    set(value: T): void;
    intercept(handler: IInterceptor<IValueWillChange<T>>): Lambda;
    observe(listener: (change: IValueDidChange<T>) => void, fireImmediately?: boolean): Lambda;
}
declare var isObservableValue: (x: any) => x is IObservableValue<any>;
interface Iterator<T> {
    next(): {
        done: boolean;
        value?: T;
    };
}
interface Lambda {
    (): void;
    name?: string;
}
declare function isArrayLike(x: any): x is Array<any> | IObservableArray<any>;
