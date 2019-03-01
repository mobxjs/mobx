// @flow

export type IObservableMapInitialValues<K, V> = IMapEntries<K, V> | KeyValueMap<V> | IMap<K, V>

export interface IMobxConfigurationOptions {
    +enforceActions?: boolean | "strict" | "never" | "always" | "observed",
    computedRequiresReaction?: boolean,
    isolateGlobalState?: boolean,
    disableErrorBoundaries?: boolean,
    arrayBuffer?: number,
    reactionScheduler?: (f: () => void) => void
}

declare export function configure(options: IMobxConfigurationOptions): void

export interface IAutorunOptions {
    delay?: number,
    name?: string,
    scheduler?: (callback: () => void) => any,
    onError?: (error: any) => void
}

export interface IReactionOptions extends IAutorunOptions {
    fireImmediately?: boolean,
    equals?: IEqualsComparer<any>
}

export interface IInterceptable<T> {
    interceptors: IInterceptor<T>[] | any,
    intercept(handler: IInterceptor<T>): Lambda
}

export type IEqualsComparer<T> = (a: T, b: T) => boolean

export type IInterceptor<T> = (change: T) => T

export type IMapEntry<K, V> = [K, V]

export type IMapEntries<K, V> = IMapEntry<K, V>[]

export interface IMap<K, V> {
    clear(): void,
    delete(key: K): boolean,
    forEach(callbackfn: (value: V, index: K, map: IMap<K, V>) => void, thisArg?: any): void,
    get(key: K): V | any,
    has(key: K): boolean,
    set(key: K, value?: V): any,
    size: number
}

declare export function isObservableMap(x: any): boolean

export interface IComputedValueOptions<T> {
    get?: () => T,
    set?: (value: T) => void,
    name?: string,
    equals?: IEqualsComparer<T>,
    context?: any
}

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

export interface IAtom {
    reportObserved: () => void,
    reportChanged: () => void
}

export interface IComputedValue<T> {
    get(): T,
    set(value: T): void,
    observe(listener: (newValue: T, oldValue: T) => void, fireImmediately?: boolean): Lambda
}

export interface IObservable {}

export interface IDepTreeNode {
    name: string,
    observing?: IObservable[]
}

export interface IDerivation {
    name: string
}

export interface IReactionPublic {
    dispose: () => void,
    trace: (enterBreakPoint?: boolean) => void
}

declare export class IListenable {
    observe(handler: (change: any, oldValue?: any) => void, fireImmediately?: boolean): Lambda
}

export interface IObservableArray<T> extends Array<T> {
    spliceWithArray(index: number, deleteCount?: number, newItems?: T[]): T[],
    observe(
        listener: (changeData: IArrayChange<T> | IArraySplice<T>) => void,
        fireImmediately?: boolean
    ): Lambda,
    intercept(handler: IInterceptor<IArrayWillChange<T> | IArrayWillSplice<T>>): Lambda,
    intercept(handler: IInterceptor<IArrayChange<T> | IArraySplice<T>>): Lambda,
    intercept<T>(handler: IInterceptor<IArrayChange<T> | IArraySplice<T>>): Lambda,
    clear(): T[],
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

export interface IMapChange<K, T> {
    object: ObservableMap<K, T>,
    type: "update" | "add" | "delete",
    name: K,
    newValue?: any,
    oldValue?: any
}

export interface IMapWillChange<K, T> {
    object: ObservableMap<K, T>,
    type: "update" | "add" | "delete",
    name: K,
    newValue?: any
}

export interface IObservableObject {}

export interface IObjectChange {
    name: string,
    object: any,
    type: "update" | "add" | "remove",
    oldValue?: any,
    newValue: any
}

export interface IObjectWillChange {
    object: any,
    type: "update" | "add" | "remove",
    name: string,
    newValue: any
}

export interface IValueWillChange<T> {
    object: any,
    type: "update",
    newValue: T
}

export interface IValueDidChange<T> extends IValueWillChange<T> {
    oldValue: ?T
}

export interface IObservableValue<T> {
    get(): T,
    set(value: T): void,
    intercept(handler: IInterceptor<IValueWillChange<T>>): Lambda,
    observe(listener: (change: IValueDidChange<T>) => void, fireImmediately?: boolean): Lambda
}

export interface IEnhancer<T> {
    (newValue: T, oldValue: T | void, name: string): T
}

export interface IObservableFactory {
    // observable overloads
    (target: Object, key: string, baseDescriptor?: PropertyDescriptor): any,
    <T>(value: Array<T>): IObservableArray<T>,
    <T>(value: null | void): IObservableValue<T>,
    (value: null | void): IObservableValue<any>,
    <T>(value: IMap<string | number | boolean, T>): ObservableMap<T>,
    <T: Object>(value: T): T
}

export type IObservableDecorator = {
    (target: Object, property: string, descriptor?: PropertyDescriptor): void,
    enhancer: IEnhancer<any>
}

export type CreateObservableOptions = {
    name?: string,
    deep?: boolean,
    defaultDecorator?: IObservableDecorator
}

declare export class IObservableFactories {
    box<T>(value?: T, options?: CreateObservableOptions): IObservableValue<T>,
    array<T>(initialValues?: T[], options?: CreateObservableOptions): IObservableArray<T>,
    map<K, V>(
        initialValues?: IObservableMapInitialValues<K, V>,
        options?: CreateObservableOptions
    ): ObservableMap<K, V>,
    object<T>(props: T, options?: CreateObservableOptions): T & IObservableObject,
    ref(target: Object, property?: string, descriptor?: PropertyDescriptor): IObservableDecorator,
    shallow(
        target: Object,
        property?: string,
        descriptor?: PropertyDescriptor
    ): IObservableDecorator,
    deep(target: Object, property?: string, descriptor?: PropertyDescriptor): IObservableDecorator
}

export interface Lambda {
    (): void,
    name?: string
}

export interface IActionFactory {
    (a1: any, a2?: any, a3?: any, a4?: any, a6?: any): any,
    bound(target: Object, propertyKey: string, descriptor?: PropertyDescriptor): void
}

declare export class ObservableMap<K, V> {
    constructor(initialData?: IMapEntries<K, V> | KeyValueMap<V>, valueModeFunc?: Function): this,
    has(key: K): boolean,
    set(key: K, value: V): void,
    delete(key: K): boolean,
    get(key: K): V,
    keys(): Iterator<K>,
    values(): Iterator<V>,
    entries(): IMapEntries<K, V> & Iterator<IMapEntry<K, V>>,
    forEach(callback: (value: V, key: K, object: KeyValueMap<K, V>) => void, thisArg?: any): void,
    merge(other: ObservableMap<K, V> | KeyValueMap<K, V>): ObservableMap<K, V>,
    clear(): void,
    replace(other: ObservableMap<K, V> | KeyValueMap<K, V>): ObservableMap<K, V>,
    size: number,
    toJS(): Map<K, V>,
    toPOJO(): KeyValueMap<V>,
    toJSON(): KeyValueMap<V>,
    toString(): string,
    observe(listener: (changes: IMapChange<K, V>) => void, fireImmediately?: boolean): Lambda,
    intercept(handler: IInterceptor<IMapWillChange<K, V>>): Lambda
}

declare export function action(
    targetOrName: any,
    propertyKeyOrFuc?: any,
    descriptor?: PropertyDescriptor
): any
declare export function action<T>(name: string, func: T): T
declare export function action<T>(func: T): T

declare export function runInAction<T>(name: string, block: () => T): T
declare export function runInAction<T>(block: () => T): T
declare export function isAction(thing: any): boolean
declare export function autorun(
    nameOrFunction: string | ((r: IReactionPublic) => any),
    options?: IAutorunOptions
): any
declare export function reaction<T>(
    expression: (r: IReactionPublic) => T,
    effect: (arg: T, r: IReactionPublic) => void,
    opts?: IReactionOptions
): () => void

export interface IWhenOptions {
    name?: string,
    timeout?: number,
    onError?: (error: any) => void
}

declare export function when(
    cond: () => boolean,
    effect: Lambda,
    options?: IWhenOptions
): () => void
declare export function when(cond: () => boolean, options?: IWhenOptions): Promise<any>

declare export function computed<T>(
    target: any,
    key?: string,
    baseDescriptor?: PropertyDescriptor
): any

declare export function extendObservable<A, B>(
    target: A,
    properties: B,
    decorators?: any,
    options?: any
): A & B

declare export function intercept(
    object: Object,
    property: string,
    handler: IInterceptor<any>
): Lambda

declare export function isComputed(value: any): boolean
declare export function isComputedProp(value: any, property: string): boolean

declare export function isObservable(value: any): boolean
declare export function isObservableProp(value: any, property: string): boolean

declare export var comparer: {
    identity: IEqualsComparer<any>,
    structural: IEqualsComparer<any>,
    default: IEqualsComparer<any>
}

declare export var observable: IObservableFactory &
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
declare export function observe<K, T>(
    observableMap: ObservableMap<K, T>,
    listener: (change: IMapChange<K, T>) => void,
    fireImmediately?: boolean
): Lambda
declare export function observe<K, T>(
    observableMap: ObservableMap<K, T>,
    property: string,
    listener: (change: IValueDidChange<K, T>) => void,
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

export interface ToJSOptions {
    detectCycles?: boolean,
    exportMapsAsObjects?: boolean
}

declare export function toJS<T>(source: T, options?: ToJSOptions): T

declare export function untracked<T>(action: () => T): T

declare export function spy(listener: (change: any) => void): Lambda

declare export function transaction<T>(action: () => T, thisArg?: any, report?: boolean): T

declare export function isObservableArray(thing: any): boolean

declare export function isObservableObject<T>(thing: T): boolean

declare export function isArrayLike(x: any): boolean

declare export class Reaction {
    name: string,
    isDisposed: boolean,
    constructor(name: string, onInvalidate: () => void): this,
    schedule(): void,
    isScheduled(): boolean,
    track(fn: () => void): void,
    dispose(): void,
    getDisposer(): Lambda & {
        $mosbservable: Reaction
    },
    toString(): string,
    trace(enterBreakPoint?: boolean): void
}

declare export function createAtom(
    name: string,
    onBecomeObservedHandler?: () => void,
    onBecomeUnobservedHandler?: () => void
): IAtom

declare export function decorate<T>(target: T, decorators: any): T

declare export function flow<T>(fn: (...args: any[]) => T): (...args: any[]) => Promise<T>
declare export function flow<T>(
    name: string,
    fn: (...args: any[]) => T
): (...args: any[]) => Promise<T>

declare export function keys<K>(map: ObservableMap<K, any>): K[]
declare export function keys(obj: any): string[]

declare export function values<K, T>(map: ObservableMap<K, T>): T[]
declare export function values<T>(ar: IObservableArray<T>): T[]
declare export function values(obj: any): any[]

declare export function set<V>(obj: ObservableMap<string, V>, values: { [key: string]: V }): void
declare export function set<K, V>(obj: ObservableMap<K, V>, key: K, value: V): void
declare export function set<T>(obj: IObservableArray<T>, index: number, value: T): void
declare export function set(obj: any, values: { [key: string]: any }): void
declare export function set(obj: any, key: string, value: any): void

declare export function remove<K, V>(obj: ObservableMap<K, V>, key: K): void
declare export function remove<T>(obj: IObservableArray<T>, index: number): void
declare export function remove(obj: any, key: string): void

declare export function has<K>(obj: ObservableMap<K, any>, key: K): boolean
declare export function has<T>(obj: IObservableArray<T>, index: number): boolean
declare export function has(obj: any, key: string): boolean

declare export function get<K, V>(obj: ObservableMap<K, V>, key: K): V | void
declare export function get<T>(obj: IObservableArray<T>, index: number): T | void
declare export function get(obj: any, key: string): any

declare export function onReactionError(
    handler: (error: any, derivation: IDerivation) => void
): () => void

declare export function onBecomeObserved(
    value: IObservable | IComputedValue<any> | IObservableArray<any> | ObservableMap<any, any>,
    listener: Lambda
): Lambda
declare export function onBecomeObserved<K>(
    value: ObservableMap<K, any> | Object,
    property: K,
    listener: Lambda
): Lambda

declare export function onBecomeUnobserved(
    value: IObservable | IComputedValue<any> | IObservableArray<any> | ObservableMap<any, any>,
    listener: Lambda
): Lambda
declare export function onBecomeUnobserved<K>(
    value: ObservableMap<K, any> | Object,
    property: K,
    listener: Lambda
): Lambda

declare export function getAtom(thing: any, property?: string): IDepTreeNode
declare export function getDebugName(thing: any, property?: string): string
declare export function getDependencyTree(thing: any, property?: string): IDependencyTree
declare export function getObserverTree(thing: any, property?: string): IObserverTree
