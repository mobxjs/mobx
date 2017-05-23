declare module 'mobx' {
  declare type extras = {
    allowStateChanges: <T>(allowStateChanges: boolean, func: () => T) => T,
    getAtom: (thing: any, property?: string) => IDepTreeNode,
    getDebugName: (thing: any, property?: string) => string,
    getDependencyTree: (thing: any, property?: string) => IDependencyTree,
    getGlobalState: () => any;
    getObserverTree: (thing: any, property?: string) => IObserverTree,
    isComputingDerivation: () => boolean,
    isSpyEnabled: () => boolean,
    resetGlobalState: () => void,
    shareGlobalState: () => void;
    spyReport: (event: any) => boolean,
    spyReportEnd: (change?: any) => void,
    spyReportStart: (event: any) => void,
    setReactionScheduler: (fn: (f: () => void) => void) => void
  }

  declare type IObservableMapInitialValues<V> = IMapEntries<V> | IKeyValueMap<V> | IMap<string, V>;

  declare interface IReactionOptions {
    context?: any;
    fireImmediately?: boolean;
    delay?: number;
    compareStructural?: boolean;
    name?: string;
  }

  declare interface IInterceptable<T> {
    interceptors: IInterceptor<T>[] | any;
    intercept(handler: IInterceptor<T>): Lambda;
  }

  declare type _ = {
    getAdministration: (thing: any, property?: string) => any;
    resetGlobalState: () => void;
  };

  declare type ITransformer<A, B> = (object: A) => B;

  declare type IInterceptor<T> = (change: T) => T;

  declare type IMapEntry<V> = [string, V];

  declare type IMapEntries<V> = IMapEntry<V>[];

  declare interface IMap<K, V> {
  	clear(): void;
  	delete(key: K): boolean;
  	forEach(callbackfn: (value: V, index: K, map: IMap<K, V>) => void, thisArg?: any): void;
  	get(key: K): V | any;
  	has(key: K): boolean;
  	set(key: K, value?: V): any;
    size: number;
  }

  declare type isObservableMap = (x: any) => boolean;

  declare type ISimpleEventListener = {
    (): void;
  };

  declare interface IComputedValueOptions<T> {
  	compareStructural?: boolean;
  	name?: string;
  	setter?: (value: T) => void;
  	context?: any;
  }

  declare type IDerivationState = 'NOT_TRACKING' | 'UP_TO_DATE' | 'POSSIBLY_STALE' | 'STALE'
  declare type PropertyDescriptor = any

  declare interface IComputed {
  	<T>(func: () => T, setter?: (value: T) => void): IComputedValue<T>;
  	<T>(func: () => T, options: IComputedValueOptions<T>): IComputedValue<T>;
  	(target: Object, key: string, baseDescriptor?: PropertyDescriptor): void;
  	struct(target: Object, key: string, baseDescriptor?: PropertyDescriptor): void;
  }

  declare interface IDependencyTree {
    name: string;
    dependencies?: IDependencyTree[];
  }

  declare interface IObserverTree {
    name: string;
    observers?: IObserverTree[];
  }

  declare interface IAtom {

  }

  declare interface IComputedValue<T> {
    get(): T;
    set(value: T): void;
    observe(
      listener: (newValue: T, oldValue: T) => void, fireImmediately?: boolean
    ): Lambda;
  }

  declare interface IObservable {
    diffValue: number;
    lastAccessedBy: number;
    lowestObserverState: IDerivationState;
    isPendingUnobservation: boolean;
    observers: IDerivation[];
    observersIndexes: {};
    onBecomeUnobserved(): any;
  }

  declare interface IDepTreeNode {
    name: string;
    observing?: IObservable[];
  }

  declare interface IDerivation  {
    name: string;
    observing: IObservable[];
    newObserving: ?IObservable[];
    dependenciesState: IDerivationState;
    runId: number;
    unboundDepsCount: number;
    ___mapid: string;
    onBecomeStale(): any;
    recoverFromError(): any;
  }

  declare interface IReactionPublic {
    dispose: () => void;
  }

  declare interface IListenable {
    changeListeners: any;
    observe(
      handler: (change: any, oldValue?: any) => void, fireImmediately?: boolean
    ): Lambda;
  }

  declare interface IObservableArray<T> extends Array<T> {
    spliceWithArray(index: number, deleteCount?: number, newItems?: T[]): T[];
    observe(
      listener: (changeData: IArrayChange<T> | IArraySplice<T>) => void, fireImmediately?: boolean
    ): Lambda;
    intercept(handler: IInterceptor<IArrayChange<T> | IArraySplice<T>>): Lambda;
    intercept<T>(handler: IInterceptor<IArrayChange<T> | IArraySplice<T>>): Lambda; // TODO: remove in 4.0
    clear(): T[];
    peek(): T[];
    replace(newItems: T[]): T[];
    find(
      predicate: (item: T, index: number, array: Array<T>) => boolean, thisArg?: any, fromIndex?: number
    ): T | any;
    findIndex(
      predicate: (item: T, index: number, array: Array<T>) => boolean, thisArg?: any, fromIndex?: number
    ): number;
    remove(value: T): boolean;
  }

  declare interface IArrayChange<T> {
    type: 'update';
    object: IObservableArray<T>;
    index: number;
    newValue: T;
    oldValue: T;
  }

  declare interface IArraySplice<T> {
    type: 'splice';
    object: IObservableArray<T>;
    index: number;
    added: T[];
    addedCount: number;
    removed: T[];
    removedCount: number;
  }

  declare interface IArrayWillChange<T> {
    type: 'update';
    object: IObservableArray<T>;
    index: number;
    newValue: T;
  }

  declare interface IArrayWillSplice<T> {
    type: 'splice';
    object: IObservableArray<T>;
    index: number;
    added: T[];
    removedCount: number;
  }

  declare interface IKeyValueMap<V> {
    [key: string]: V;
  }

  declare interface IMapChange<T> {
    object: ObservableMap<T>;
    type: 'update' | 'add' | 'delete';
    name: string;
    newValue?: any;
    oldValue?: any;
  }

  declare interface IMapWillChange<T> {
    object: ObservableMap<T>;
    type: 'update' | 'add' | 'delete';
    name: string;
    newValue?: any;
  }

  declare interface IObservableObject {}

  declare interface IObjectChange {
    name: string;
    object: any;
    type: 'update' | 'add';
    oldValue?: any;
    newValue: any;
  }

  declare interface IObjectWillChange {
    object: any;
    type: 'update' | 'add';
    name: string;
    newValue: any;
  }

  declare interface IValueWillChange<T> {
    object: any;
    type: 'update';
    newValue: T;
  }

  declare interface IObservableValue<T> {
    get(): T;
    set(value: T): void;
    intercept(handler: IInterceptor<IValueWillChange<T>>): Lambda;
    observe(
      listener: (newValue: T, oldValue: T) => void, fireImmediately?: boolean
    ): Lambda;
  }

  declare interface IObservableFactory {
  	(value: any, key?: string, baseDescriptor?: PropertyDescriptor): any;
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
    ref(target: Object, property?: string, descriptor?: PropertyDescriptor): any;
    shallow(target: Object, property?: string, descriptor?: PropertyDescriptor): any;
    deep(target: Object, property?: string, descriptor?: PropertyDescriptor): any;
  }

  declare interface Iterator<T> {
    next(): {
      done: boolean,
      value?: T
    };
  }

  declare interface Lambda {
    (): void;
    name?: string;
  }

  declare interface IActionFactory {
    (a1: any, a2?: any, a3?: any, a4?: any, a6?: any): any;
    bound(target: Object, propertyKey: string, descriptor?: PropertyDescriptor): void;
  }

  declare class ObservableMap<V> {
    $mobx: {};
    name: string;
    interceptors: any;
    changeListeners: any;
    constructor(initialData?: IMapEntries<V> | IKeyValueMap<V>, valueModeFunc?: Function): this;
    has(key: string): boolean;
    set(key: string, value: V): void;
    delete(key: string): boolean;
    get(key: string): V;
    keys(): string[] & Iterator<string>;
    values(): V[] & Iterator<V>;
    entries(): IMapEntries<V> & Iterator<IMapEntry<V>>;
    forEach(
      callback: (value: V, key: string, object: IKeyValueMap<V>) => void, thisArg?: any
    ): void;
    merge(other: ObservableMap<V> | IKeyValueMap<V>): ObservableMap<V>;
    clear(): void;
    replace(other: ObservableMap<V> | IKeyValueMap<V>): ObservableMap<V>;
    size: number;
    toJS(): IKeyValueMap<V>;
    toJs(): IKeyValueMap<V>;
    toJSON(): IKeyValueMap<V>;
    toString(): string;
    observe(listener: (changes: IMapChange<V>) => void, fireImmediately?: boolean): Lambda;
    intercept(handler: IInterceptor<IMapWillChange<V>>): Lambda
  }

  declare function extendShallowObservable(target: any): any;

  declare function action(targetOrName: any, propertyKeyOrFuc?: any, descriptor?: PropertyDescriptor): any;
  declare function action<T>(name: string, func: T): T;
  declare function action<T>(func: T): T;
  declare function runInAction<T>(name: string, block: () => T, scope?: any): T;
  declare function runInAction<T>(block: () => T, scope?: any): T;
  declare function isAction(thing: any): boolean;
  declare function autorun(nameOrFunction: string | (r: IReactionPublic) => any, viewOrScope?: any, scope?: any): any;
  declare function when(name: string, cond:() => boolean, effect: Lambda, scope?: any): any
  declare function when(cond:() => boolean, effect: Lambda, scope?: any): any
  declare function autorunAsync(func: (r: IReactionPublic) => any, delay?: number, scope?: any): any
  declare function reaction<T>(
    expression: (r: IReactionPublic) => T, effect: (arg: T, r: IReactionPublic) => void, fireImmediately?: boolean, delay?: number, scope?: any
  ): any

  declare function computed<T>(target: any, key?: string, baseDescriptor?: PropertyDescriptor): any
  declare function createTransformer<A, B>(
    transformer: ITransformer<A, B>, onCleanup?: (resultObject: ?B | any, sourceObject?: A) => void
  ): ITransformer<A, B>
  declare function expr<T>(expr: () => T, scope?: any): T
  declare function extendObservable<A, B>(target: A, ...properties: B[]): A & B


  declare function intercept(object: Object, property: string, handler: IInterceptor<any>): Lambda;

  declare function isComputed(value: any, property?: string): boolean

  declare function isObservable(value: any, property?: string): boolean

  declare function observable<T>(value: T): any

  declare function observe(
    object: any, property: string, listener: (newValue: any, oldValue?: any) => void, fireImmediately?: boolean
  ): Lambda

  declare function toJS(source: any, detectCycles?: boolean, ___alreadySeen?: [any, any][]): any
  declare function toJSlegacy(source: any, detectCycles?: boolean, ___alreadySeen?: [any, any][]): any
  declare function whyRun(thing?: any, prop?: string): string
  declare function useStrict(strict: boolean): any

  declare function isStrictModeEnabled(): boolean
  declare function untracked<T>(action: () => T): T

  declare function spy(listener: (change: any) => void): Lambda

  declare function transaction<T>(action: () => T, thisArg?: any, report?: boolean): T

  declare function asReference<T>(value: T): T
  declare function asStructure<T>(value: T): T
  declare function asFlat<T>(value: T): T
  declare function asMap<T>(data: IKeyValueMap<T>, modifierFunc?: Function): ObservableMap<T>
  declare function isObservableArray(thing: any): boolean

  declare function map<V>(
    initialValues?: IMapEntries<V> | IKeyValueMap<V>, valueModifier?: Function
  ): ObservableMap<V>

  declare function isObservableObject<T>(thing: T): boolean

  declare function isArrayLike(x: any): boolean

  declare class BaseAtom {
    name: string;
    isPendingUnobservation: boolean;
    observers: any[];
    observersIndexes: {};
    diffValue: number;
    lastAccessedBy: number;
    lowestObserverState: IDerivationState;
    constructor(name?: string): this;
    onBecomeUnobserved(): void;
    reportObserved(): void;
    reportChanged(): void;
    toString(): string
  }

  declare class Atom {
    name: string;
    onBecomeObservedHandler: () => void;
    onBecomeUnobservedHandler: () => void;
    isPendingUnobservation: boolean;
    isBeingTracked: boolean;
    constructor(name?: string, onBecomeObservedHandler?: () => void, onBecomeUnobservedHandler?: () => void): this;
    reportObserved(): boolean;
    onBecomeUnobserved(): void
  }

  declare class Reaction {
    name: string;
    observing: any[];
    newObserving: any[];
    dependenciesState: IDerivationState;
    diffValue: number;
    runId: number;
    unboundDepsCount: number;
    ___mapid: string;
    isDisposed: boolean;
    _isScheduled: boolean;
    _isTrackPending: boolean;
    _isRunning: boolean;
    constructor(name: string, onInvalidate: () => void): this;
    onBecomeStale(): void;
    schedule(): void;
    isScheduled(): boolean;
    runReaction(): void;
    track(fn: () => void): void;
    recoverFromError(): void;
    dispose(): void;
    getDisposer(): Lambda & {
      $mosbservable: Reaction
    };
    toString(): string;
    whyRun(): string
  }
}
