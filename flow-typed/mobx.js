// @flow

export type Extras = {
    allowStateChanges: <T>(allowStateChanges: boolean, func: () => T) => T,
    getAtom: (thing: any, property?: string) => IDepTreeNode,
    getDebugName: (thing: any, property?: string) => string,
    getDependencyTree: (thing: any, property?: string) => IDependencyTree,
    getGlobalState: () => any,
    getObserverTree: (thing: any, property?: string) => IObserverTree,
    isComputingDerivation: () => boolean,
    isSpyEnabled: () => boolean,
    resetGlobalState: () => void,
    shareGlobalState: () => void,
    spyReport: (event: any) => boolean,
    spyReportEnd: (change?: any) => void,
    spyReportStart: (event: any) => void,
    setReactionScheduler: (fn: (f: () => void) => void) => void,
    onReactionError: (func: (error: Error) => void) => void
}

declare export var extras: Extras

export type IObservableMapInitialValues<V> = IMapEntries<V> | KeyValueMap<V> | IMap<string, V>

export interface IReactionOptions {
    context?: any,
    fireImmediately?: boolean,
    delay?: number,
    compareStructural?: boolean,
    name?: string
}

export interface IInterceptable<T> {
    interceptors: IInterceptor<T>[] | any,
    intercept(handler: IInterceptor<T>): Lambda
}

export type _ = {
    getAdministration: (thing: any, property?: string) => any,
    resetGlobalState: () => void
}

export type ITransformer<A, B> = (object: A) => B

export type IInterceptor<T> = (change: T) => T

export type IMapEntry<V> = [string, V]

export type IMapEntries<V> = IMapEntry<V>[]

export interface IMap<K, V> {
    clear(): void,
    delete(key: K): boolean,
    forEach(callbackfn: (value: V, index: K, map: IMap<K, V>) => void, thisArg?: any): void,
    get(key: K): V | any,
    has(key: K): boolean,
    set(key: K, value?: V): any,
    size: number
}

declare export function isObservableMap (x: any): boolean

declare type ISimpleEventListener = {
    (): void
}

export interface IComputedValueOptions<T> {
    compareStructural?: boolean,
    name?: string,
    setter?: (value: T) => void,
    context?: any
}

declare type IDerivationState = "NOT_TRACKING" | "UP_TO_DATE" | "POSSIBLY_STALE" | "STALE"
declare type PropertyDescriptor = any

export interface IComputed {
    <T>(func: () => T, setter?: (value: T) => void): IComputedValue<T>,
    <T>(func: () => T, options: IComputedValueOptions<T>): IComputedValue<T>,
    (target: Object, key: string, baseDescriptor?: PropertyDescriptor): void,
    struct(target: Object, key: string, baseDescriptor?: PropertyDescriptor): void
}

export interface IDependencyTree {
    name: string,
    dependencies?: IDependencyTree[]
}

export interface IObserverTree {
    name: string,
    observers?: IObserverTree[]
}

export interface IAtom {}

export interface IComputedValue<T> {
    get(): T,
    set(value: T): void,
    observe(listener: (newValue: T, oldValue: T) => void, fireImmediately?: boolean): Lambda
}

export interface IObservable {
    diffValue: number,
    lastAccessedBy: number,
    lowestObserverState: IDerivationState,
    isPendingUnobservation: boolean,
    observers: IDerivation[],
    observersIndexes: {},
    onBecomeUnobserved(): any
}

export interface IDepTreeNode {
    name: string,
    observing?: IObservable[]
}

export interface IDerivation {
    name: string,
    observing: IObservable[],
    newObserving: ?(IObservable[]),
    dependenciesState: IDerivationState,
    runId: number,
    unboundDepsCount: number,
    ___mapid: string,
    onBecomeStale(): any,
    recoverFromError(): any
}

export interface IReactionPublic {
    dispose: () => void
}

declare export class IListenable {
    changeListeners: any,
    observe(handler: (change: any, oldValue?: any) => void, fireImmediately?: boolean): Lambda
}

export interface IObservableArray<T> extends Array<T> {
    spliceWithArray(index: number, deleteCount?: number, newItems?: T[]): T[],
    observe(
        listener: (changeData: IArrayChange<T> | IArraySplice<T>) => void,
        fireImmediately?: boolean
    ): Lambda,
    intercept(handler: IInterceptor<IArrayWillChange<T> | IArrayWillSplice<T>>): Lambda,
    intercept(handler: IInterceptor<IArrayChange<T> | IArraySplice<T>>): Lambda, // TODO: remove in 4.0
    intercept<T>(handler: IInterceptor<IArrayChange<T> | IArraySplice<T>>): Lambda, // TODO: remove in 4.0
    clear(): T[],
    peek(): T[],
    replace(newItems: T[]): T[],
    find(
        predicate: (item: T, index: number, array: Array<T>) => boolean,
        thisArg?: any,
        fromIndex?: number
    ): T | any,
    findIndex(
        predicate: (item: T, index: number, array: Array<T>) => boolean,
        thisArg?: any,
        fromIndex?: number
    ): number,
    remove(value: T): boolean
}

export interface IArrayChange<T> {
    type: "update",
    object: IObservableArray<T>,
    index: number,
    newValue: T,
    oldValue: T
}

export interface IArraySplice<T> {
    type: "splice",
    object: IObservableArray<T>,
    index: number,
    added: T[],
    addedCount: number,
    removed: T[],
    removedCount: number
}

export interface IArrayWillChange<T> {
    type: "update",
    object: IObservableArray<T>,
    index: number,
    newValue: T
}

export interface IArrayWillSplice<T> {
    type: "splice",
    object: IObservableArray<T>,
    index: number,
    added: T[],
    removedCount: number
}

export type KeyValueMap<V> = {
    [key: string]: V
}

export interface IMapChange<T> {
    object: ObservableMap<T>,
    type: "update" | "add" | "delete",
    name: string,
    newValue?: any,
    oldValue?: any
}

export interface IMapWillChange<T> {
    object: ObservableMap<T>,
    type: "update" | "add" | "delete",
    name: string,
    newValue?: any
}

export interface IObservableObject {}

export interface IObjectChange {
    name: string,
    object: any,
    type: "update" | "add",
    oldValue?: any,
    newValue: any
}

export interface IObjectWillChange {
    object: any,
    type: "update" | "add",
    name: string,
    newValue: any
}

export interface IValueWillChange<T> {
    object: any,
    type: "update",
    newValue: T
}

export interface IValueDidChange<T> extends IValueWillChange<T> {
    oldValue: T | typeof undefined
}

export interface IObservableValue<T> {
    get(): T,
    set(value: T): void,
    intercept(handler: IInterceptor<IValueWillChange<T>>): Lambda,
    observe(listener: (change: IValueDidChange<T>) => void, fireImmediately?: boolean): Lambda
}

export interface IEnhancer<T> {
    (newValue: T, oldValue: T | void, name: string): T,
}

export interface IModifierDescriptor<T> {
    isMobxModifierDescriptor: boolean,
    initialValue: T | void,
    enhancer: IEnhancer<T>,
}

export interface IObservableFactory {
    // observable overloads
    (target: Object, key: string, baseDescriptor?: PropertyDescriptor): any,
    <T>(value: Array<T>): IObservableArray<T>,
    (value: string): IObservableValue<string>,
    (value: boolean): IObservableValue<boolean>,
    (value: number): IObservableValue<number>,
    (value: Date): IObservableValue<Date>,
    (value: RegExp): IObservableValue<RegExp>,
    (value: Function): IObservableValue<Function>,
    <T>(value: null | void): IObservableValue<T>,
    (value: null | void): IObservableValue<any>,
    (): IObservableValue<any>,
    <T>(value: IMap<string | number | boolean, T>): ObservableMap<T>,
    <T>(IModifierDescriptor<T>): T,
    <T: Object>(value: T): T,
    <T>(value: T): IObservableValue<T>,
    <T>(): IObservableValue<T>,
}

declare export class IObservableFactories {
    box<T>(value?: T, name?: string): IObservableValue<T>,
    shallowBox<T>(value?: T, name?: string): IObservableValue<T>,
    array<T>(initialValues?: T[], name?: string): IObservableArray<T>,
    shallowArray<T>(initialValues?: T[], name?: string): IObservableArray<T>,
    map<T>(initialValues?: IObservableMapInitialValues<T>, name?: string): ObservableMap<T>,
    shallowMap<T>(
        initialValues?: IObservableMapInitialValues<T>,
        name?: string
    ): ObservableMap<T>,
    object<T>(props: T, name?: string): T & IObservableObject,
    shallowObject<T>(props: T, name?: string): T & IObservableObject,
    ref(target: Object, property?: string, descriptor?: PropertyDescriptor): any,
    shallow(target: Object, property?: string, descriptor?: PropertyDescriptor): any,
    deep(target: Object, property?: string, descriptor?: PropertyDescriptor): any
}

export interface Iterator<T> {
    next(): {
        done: boolean,
        value?: T
    }
}

export interface Lambda {
    (): void,
    name?: string
}

export interface IActionFactory {
    (a1: any, a2?: any, a3?: any, a4?: any, a6?: any): any,
    bound(target: Object, propertyKey: string, descriptor?: PropertyDescriptor): void
}

declare export class ObservableMap<V> {
    $mobx: {},
    name: string,
    interceptors: any,
    changeListeners: any,
    constructor(initialData?: IMapEntries<V> | KeyValueMap<V>, valueModeFunc?: Function): this,
    has(key: string): boolean,
    set(key: string, value: V): void,
    delete(key: string): boolean,
    get(key: string): V,
    keys(): string[] & Iterator<string>,
    values(): V[] & Iterator<V>,
    entries(): IMapEntries<V> & Iterator<IMapEntry<V>>,
    forEach(
        callback: (value: V, key: string, object: KeyValueMap<V>) => void,
        thisArg?: any
    ): void,
    merge(other: ObservableMap<V> | KeyValueMap<V>): ObservableMap<V>,
    clear(): void,
    replace(other: ObservableMap<V> | KeyValueMap<V>): ObservableMap<V>,
    size: number,
    toJS(): KeyValueMap<V>,
    toJs(): KeyValueMap<V>,
    toJSON(): KeyValueMap<V>,
    toString(): string,
    observe(listener: (changes: IMapChange<V>) => void, fireImmediately?: boolean): Lambda,
    intercept(handler: IInterceptor<IMapWillChange<V>>): Lambda
}

declare export function extendShallowObservable(target: any): any

declare export function action(
    targetOrName: any,
    propertyKeyOrFuc?: any,
    descriptor?: PropertyDescriptor
): any
declare export function action<T>(name: string, func: T): T
declare export function action<T>(func: T): T
declare export function runInAction<T>(name: string, block: () => T, scope?: any): T
declare export function runInAction<T>(block: () => T, scope?: any): T
declare export function isAction(thing: any): boolean
declare export function autorun(
    nameOrFunction: string | ((r: IReactionPublic) => any),
    viewOrScope?: any,
    scope?: any
): any
declare export function when(name: string, cond: () => boolean, effect: Lambda, scope?: any): any
declare export function when(cond: () => boolean, effect: Lambda, scope?: any): any
declare export function autorunAsync(
    func: (r: IReactionPublic) => any,
    delay?: number,
    scope?: any
): any
declare export function reaction<T>(
    expression: (r: IReactionPublic) => T,
    effect: (arg: T, r: IReactionPublic) => void,
    fireImmediately?: boolean,
    delay?: number,
    scope?: any
): any

declare export function computed<T>(
    target: any,
    key?: string,
    baseDescriptor?: PropertyDescriptor
): any
declare export function createTransformer<A, B>(
    transformer: ITransformer<A, B>,
    onCleanup?: (resultObject: ?B | any, sourceObject?: A) => void
): ITransformer<A, B>
declare export function expr<T>(expr: () => T, scope?: any): T
declare export function extendObservable<A, B>(target: A, ...properties: B[]): A & B

declare export function intercept(object: Object, property: string, handler: IInterceptor<any>): Lambda

declare export function isComputed(value: any, property?: string): boolean

declare export function isObservable(value: any, property?: string): boolean

declare export var observable:
    IObservableFactory &
    IObservableFactories & {
        deep: {
            struct<T>(initialValue?: T): T
        },
        ref: {
            struct<T>(initialValue?: T): T
        }
}

declare export function observe<T>(
    value: IObservableValue<T> | IComputedValue<T>,
    listener: (change: IValueDidChange<T>) => void,
    fireImmediately?: boolean
): Lambda
declare export function observe<T>(
    observableArray: IObservableArray<T>,
    listener: (change: IArrayChange<T> | IArraySplice<T>) => void,
    fireImmediately?: boolean
): Lambda
declare export function observe<T>(
    observableMap: ObservableMap<T>,
    listener: (change: IMapChange<T>) => void,
    fireImmediately?: boolean
): Lambda
declare export function observe<T>(
    observableMap: ObservableMap<T>,
    property: string,
    listener: (change: IValueDidChange<T>) => void,
    fireImmediately?: boolean
): Lambda
declare export function observe(
    object: any,
    listener: (change: IObjectChange) => void,
    fireImmediately?: boolean
): Lambda
declare export function observe(
    object: any,
    property: string,
    listener: (change: IValueDidChange<any>) => void,
    fireImmediately?: boolean
): Lambda

declare export function toJS(source: any, detectCycles?: boolean, ___alreadySeen?: [any, any][]): any
declare export function toJSlegacy(
    source: any,
    detectCycles?: boolean,
    ___alreadySeen?: [any, any][]
): any
declare export function whyRun(thing?: any, prop?: string): string
declare export function useStrict(strict: boolean): void

declare export function isStrictModeEnabled(): boolean
declare export function untracked<T>(action: () => T): T

declare export function spy(listener: (change: any) => void): Lambda

declare export function transaction<T>(action: () => T, thisArg?: any, report?: boolean): T

declare export function asReference<T>(value: T): T
declare export function asStructure<T>(value: T): T
declare export function asFlat<T>(value: T): T
declare export function asMap<T>(data: KeyValueMap<T>, modifierFunc?: Function): ObservableMap<T>
declare export function isObservableArray(thing: any): boolean

declare export function map<V>(
    initialValues?: IMapEntries<V> | KeyValueMap<V>,
    valueModifier?: Function
): ObservableMap<V>

declare export function isObservableObject<T>(thing: T): boolean

declare export function isArrayLike(x: any): boolean

declare export class BaseAtom {
    name: string,
    isPendingUnobservation: boolean,
    observers: any[],
    observersIndexes: {},
    diffValue: number,
    lastAccessedBy: number,
    lowestObserverState: IDerivationState,
    constructor(name?: string): this,
    onBecomeUnobserved(): void,
    reportObserved(): void,
    reportChanged(): void,
    toString(): string
}

declare export class Atom {
    name: string,
    onBecomeObservedHandler: () => void,
    onBecomeUnobservedHandler: () => void,
    isPendingUnobservation: boolean,
    isBeingTracked: boolean,
    constructor(
        name?: string,
        onBecomeObservedHandler?: () => void,
        onBecomeUnobservedHandler?: () => void
    ): this,
    reportObserved(): boolean,
    onBecomeUnobserved(): void
}

declare export class Reaction {
    name: string,
    observing: any[],
    newObserving: any[],
    dependenciesState: IDerivationState,
    diffValue: number,
    runId: number,
    unboundDepsCount: number,
    ___mapid: string,
    isDisposed: boolean,
    _isScheduled: boolean,
    _isTrackPending: boolean,
    _isRunning: boolean,
    constructor(name: string, onInvalidate: () => void): this,
    onBecomeStale(): void,
    schedule(): void,
    isScheduled(): boolean,
    runReaction(): void,
    track(fn: () => void): void,
    recoverFromError(): void,
    dispose(): void,
    getDisposer(): Lambda & {
        $mosbservable: Reaction
    },
    toString(): string,
    whyRun(): string
}
