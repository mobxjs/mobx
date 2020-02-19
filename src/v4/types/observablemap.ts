import {
    createInstanceofPredicate,
    isPlainObject,
    getNextId,
    Lambda,
    invariant,
    isES6Map,
    fail,
    addHiddenFinalProp,
    IInterceptable,
    IListenable,
    ObservableValue,
    checkIfStateModificationsAreAllowed,
    createAtom,
    referenceEnhancer,
    IEnhancer,
    deepEnhancer,
    hasInterceptors,
    interceptChange,
    isSpyEnabled,
    hasListeners,
    spyReportStart,
    transaction,
    notifyListeners,
    spyReportEnd,
    globalState,
    toStringTagSymbol,
    makeIterable,
    untracked,
    registerListener,
    IInterceptor,
    registerInterceptor,
    declareIterator,
    onBecomeUnobserved,
    convertToMap,
    iteratorToArray,
    forOf
} from "../internal"

export interface IKeyValueMap<V = any> {
    [key: string]: V
}

export type IMapEntry<K = any, V = any> = [K, V]
export type IMapEntries<K = any, V = any> = IMapEntry<K, V>[]

export type IMapDidChange<K = any, V = any> =
    | {
          object: ObservableMap<K, V>
          name: K // actual the key or index, but this is based on the ancient .observe proposal for consistency
          type: "update"
          newValue: V
          oldValue: V
      }
    | {
          object: ObservableMap<K, V>
          name: K
          type: "add"
          newValue: V
      }
    | {
          object: ObservableMap<K, V>
          name: K
          type: "delete"
          oldValue: V
      }

export interface IMapWillChange<K = any, V = any> {
    object: ObservableMap<K, V>
    type: "update" | "add" | "delete"
    name: K
    newValue?: V
}

const ObservableMapMarker = {}

export type IObservableMapInitialValues<K = any, V = any> =
    | IMapEntries<K, V>
    | IKeyValueMap<V>
    | Map<K, V>

export class ObservableMap<K = any, V = any>
    implements Map<K, V>, IInterceptable<IMapWillChange<K, V>>, IListenable {
    $mobx = ObservableMapMarker
    private _data: Map<K, ObservableValue<V>>
    private _hasMap: Map<K, ObservableValue<boolean>> // hasMap, not hashMap >-).
    private _keysAtom = createAtom(`${this.name}.keys()`)
    interceptors
    changeListeners
    dehancer: any;
    // eslint-disable-next-line
    [Symbol.iterator]: () => IterableIterator<[K, V]>; // only used for typings!
    // eslint-disable-next-line
    [Symbol.toStringTag]: "Map" // only used for typings!

    constructor(
        initialData?: IObservableMapInitialValues<K, V>,
        public enhancer: IEnhancer<V> = deepEnhancer,
        public name = "ObservableMap@" + getNextId()
    ) {
        if (typeof Map !== "function") {
            throw new Error(
                "mobx.map requires Map polyfill for the current browser. Check babel-polyfill or core-js/es6/map.js"
            )
        }
        this._data = new Map()
        this._hasMap = new Map()
        this.merge(initialData)
    }

    private _has(key: K): boolean {
        return this._data.has(key)
    }

    has(key: K): boolean {
        if (!globalState.trackingDerivation) return this._has(key)

        let entry = this._hasMap.get(key)
        if (!entry) {
            // todo: replace with atom (breaking change)
            const newEntry = (entry = new ObservableValue(
                this._has(key),
                referenceEnhancer,
                `${this.name}.${stringifyKey(key)}?`,
                false
            ))
            this._hasMap.set(key, newEntry)
            onBecomeUnobserved(newEntry, () => this._hasMap.delete(key))
        }

        return entry.get()
    }

    set(key: K, value: V) {
        const hasKey = this._has(key)
        if (hasInterceptors(this)) {
            const change = interceptChange<IMapWillChange<K, V>>(this, {
                type: hasKey ? "update" : "add",
                object: this,
                newValue: value,
                name: key
            })
            if (!change) return this
            value = change.newValue!
        }
        if (hasKey) {
            this._updateValue(key, value)
        } else {
            this._addValue(key, value)
        }
        return this
    }

    delete(key: K): boolean {
        checkIfStateModificationsAreAllowed(this._keysAtom)
        if (hasInterceptors(this)) {
            const change = interceptChange<IMapWillChange<K, V>>(this, {
                type: "delete",
                object: this,
                name: key
            })
            if (!change) return false
        }
        if (this._has(key)) {
            const notifySpy = isSpyEnabled()
            const notify = hasListeners(this)
            const change =
                notify || notifySpy
                    ? <IMapDidChange<K, V>>{
                          type: "delete",
                          object: this,
                          oldValue: (<any>this._data.get(key)).value,
                          name: key
                      }
                    : null

            if (notifySpy) spyReportStart({ ...change, name: this.name, key })
            transaction(() => {
                this._keysAtom.reportChanged()
                this._updateHasMapEntry(key, false)
                const observable = this._data.get(key)!
                observable.setNewValue(undefined as any)
                this._data.delete(key)
            })
            if (notify) notifyListeners(this, change)
            if (notifySpy) spyReportEnd()
            return true
        }
        return false
    }

    private _updateHasMapEntry(key: K, value: boolean) {
        let entry = this._hasMap.get(key)
        if (entry) {
            entry.setNewValue(value)
        }
    }

    private _updateValue(key: K, newValue: V | undefined) {
        const observable = this._data.get(key)!
        newValue = (observable as any).prepareNewValue(newValue) as V
        if (newValue !== globalState.UNCHANGED) {
            const notifySpy = isSpyEnabled()
            const notify = hasListeners(this)
            const change =
                notify || notifySpy
                    ? <IMapDidChange<K, V>>{
                          type: "update",
                          object: this,
                          oldValue: (observable as any).value,
                          name: key,
                          newValue
                      }
                    : null
            if (notifySpy) spyReportStart({ ...change, name: this.name, key })
            observable.setNewValue(newValue as V)
            if (notify) notifyListeners(this, change)
            if (notifySpy) spyReportEnd()
        }
    }

    private _addValue(key: K, newValue: V) {
        checkIfStateModificationsAreAllowed(this._keysAtom)
        transaction(() => {
            const observable = new ObservableValue(
                newValue,
                this.enhancer,
                `${this.name}.${stringifyKey(key)}`,
                false
            )
            this._data.set(key, observable)
            newValue = (observable as any).value // value might have been changed
            this._updateHasMapEntry(key, true)
            this._keysAtom.reportChanged()
        })
        const notifySpy = isSpyEnabled()
        const notify = hasListeners(this)
        const change =
            notify || notifySpy
                ? <IMapDidChange<K, V>>{
                      type: "add",
                      object: this,
                      name: key,
                      newValue
                  }
                : null
        if (notifySpy) spyReportStart({ ...change, name: this.name, key })
        if (notify) notifyListeners(this, change)
        if (notifySpy) spyReportEnd()
    }

    get(key: K): V | undefined {
        if (this.has(key)) return this.dehanceValue(this._data.get(key)!.get())
        return this.dehanceValue(undefined)
    }

    private dehanceValue<X extends V | undefined>(value: X): X {
        if (this.dehancer !== undefined) {
            return this.dehancer(value)
        }
        return value
    }

    keys(): IterableIterator<K> {
        this._keysAtom.reportObserved()
        return this._data.keys()
    }

    values(): IterableIterator<V> {
        const self = this
        let nextIndex = 0
        const keys = iteratorToArray(this.keys())
        return makeIterable({
            next() {
                return nextIndex < keys.length
                    ? { value: self.get(keys[nextIndex++])!, done: false }
                    : { value: undefined as any, done: true }
            }
        })
    }

    entries(): IterableIterator<IMapEntry<K, V>> {
        const self = this
        let nextIndex = 0
        const keys = iteratorToArray(this.keys())
        return makeIterable({
            next: function() {
                if (nextIndex < keys.length) {
                    const key = keys[nextIndex++]
                    return {
                        value: [key, self.get(key)!] as [K, V],
                        done: false
                    }
                }
                return { done: true }
            }
        } as any)
    }

    forEach(callback: (value: V, key: K, object: Map<K, V>) => void, thisArg?) {
        this._keysAtom.reportObserved()
        this._data.forEach((_, key) => callback.call(thisArg, this.get(key)!, key, this))
    }

    /** Merge another object into this object, returns this. */
    merge(other: ObservableMap<K, V> | IKeyValueMap<V> | any): ObservableMap<K, V> {
        if (isObservableMap(other)) {
            other = other.toJS()
        }
        transaction(() => {
            if (isPlainObject(other))
                Object.keys(other).forEach(key => this.set((key as any) as K, other[key]))
            else if (Array.isArray(other)) other.forEach(([key, value]) => this.set(key, value))
            else if (isES6Map(other)) {
                if (other.constructor !== Map)
                    fail("Cannot initialize from classes that inherit from Map: " + other.constructor.name) // prettier-ignore
                else
                    other.forEach((value, key) => this.set(key, value))
            } else if (other !== null && other !== undefined)
                fail("Cannot initialize map from " + other)
        })
        return this
    }

    clear() {
        transaction(() => {
            untracked(() => {
                // Note we are concurrently reading/deleting the same keys
                // forEach handles this properly
                this._data.forEach((_, key) => this.delete(key))
            })
        })
    }

    replace(values: ObservableMap<K, V> | IKeyValueMap<V> | any): ObservableMap<K, V> {
        // Implementation requirements:
        // - respect ordering of replacement map
        // - allow interceptors to run and potentially prevent individual operations
        // - don't recreate observables that already exist in original map (so we don't destroy existing subscriptions)
        // - don't _keysAtom.reportChanged if the keys of resulting map are indentical (order matters!)
        // - note that result map may differ from replacement map due to the interceptors
        transaction(() => {
            // Convert to map so we can do quick key lookups
            const replacementMap = convertToMap(values)
            const orderedData = new Map()
            // Used for optimization
            let keysReportChangedCalled = false
            // Delete keys that don't exist in replacement map
            // if the key deletion is prevented by interceptor
            // add entry at the beginning of the result map
            forOf(this._data.keys(), key => {
                // Concurrently iterating/deleting keys
                // iterator should handle this correctly
                if (!replacementMap.has(key)) {
                    const deleted = this.delete(key)
                    // Was the key removed?
                    if (deleted) {
                        // _keysAtom.reportChanged() was already called
                        keysReportChangedCalled = true
                    } else {
                        // Delete prevented by interceptor
                        const value = this._data.get(key)
                        orderedData.set(key, value)
                    }
                }
            })
            // Merge entries
            forOf(replacementMap.entries(), ([key, value]) => {
                // We will want to know whether a new key is added
                const keyExisted = this._data.has(key)
                // Add or update value
                this.set(key, value)
                // The addition could have been prevent by interceptor
                if (this._data.has(key)) {
                    // The update could have been prevented by interceptor
                    // and also we want to preserve existing values
                    // so use value from _data map (instead of replacement map)
                    const value = this._data.get(key)
                    orderedData.set(key, value)
                    // Was a new key added?
                    if (!keyExisted) {
                        // _keysAtom.reportChanged() was already called
                        keysReportChangedCalled = true
                    }
                }
            })
            // Check for possible key order change
            if (!keysReportChangedCalled) {
                if (this._data.size !== orderedData.size) {
                    // If size differs, keys are definitely modified
                    this._keysAtom.reportChanged()
                } else {
                    const iter1 = this._data.keys()
                    const iter2 = orderedData.keys()
                    let next1 = iter1.next()
                    let next2 = iter2.next()
                    while (!next1.done) {
                        if (next1.value !== next2.value) {
                            this._keysAtom.reportChanged()
                            break
                        }
                        next1 = iter1.next()
                        next2 = iter2.next()
                    }
                }
            }
            // Use correctly ordered map
            this._data = orderedData
        })
        return this
    }

    get size(): number {
        this._keysAtom.reportObserved()
        return this._data.size
    }

    /**
     * Returns a plain object that represents this map.
     * Note that all the keys being stringified.
     * If there are duplicating keys after converting them to strings, behaviour is undetermined.
     */
    toPOJO(): IKeyValueMap<V> {
        const res: IKeyValueMap<V> = {}
        this.forEach(
            (_, key) =>
                (res[typeof key === "symbol" ? <any>key : stringifyKey(key)] = this.get(key)!)
        )
        return res
    }

    /**
     * Returns a shallow non observable object clone of this map.
     * Note that the values migth still be observable. For a deep clone use mobx.toJS.
     */
    toJS(): Map<K, V> {
        return new Map(this)
    }

    toJSON(): IKeyValueMap<V> {
        // Used by JSON.stringify
        return this.toPOJO()
    }

    toString(): string {
        return (
            this.name +
            "[{ " +
            iteratorToArray(this.keys())
                .map(key => `${stringifyKey(key)}: ${"" + this.get(key)}`)
                .join(", ") +
            " }]"
        )
    }

    /**
     * Observes this object. Triggers for the events 'add', 'update' and 'delete'.
     * See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/observe
     * for callback details
     */
    observe(listener: (changes: IMapDidChange<K, V>) => void, fireImmediately?: boolean): Lambda {
        process.env.NODE_ENV !== "production" &&
            invariant(
                fireImmediately !== true,
                "`observe` doesn't support fireImmediately=true in combination with maps."
            )
        return registerListener(this, listener)
    }

    intercept(handler: IInterceptor<IMapWillChange<K, V>>): Lambda {
        return registerInterceptor(this, handler)
    }
}

function stringifyKey(key: any): string {
    if (key && key.toString) return key.toString()
    else return new String(key).toString()
}

declareIterator(ObservableMap.prototype, function() {
    return this.entries()
})

addHiddenFinalProp(ObservableMap.prototype, toStringTagSymbol(), "Map")

/* 'var' fixes small-build issue */
export const isObservableMap = createInstanceofPredicate("ObservableMap", ObservableMap) as (
    thing: any
) => thing is ObservableMap<any, any>
