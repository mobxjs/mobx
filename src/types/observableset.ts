import {
    $mobx,
    createAtom,
    deepEnhancer,
    getNextId,
    IEnhancer,
    isSpyEnabled,
    hasListeners,
    IListenable,
    registerListener,
    Lambda,
    spyReportStart,
    notifyListeners,
    spyReportEnd,
    createInstanceofPredicate,
    hasInterceptors,
    interceptChange,
    IInterceptable,
    IInterceptor,
    registerInterceptor,
    checkIfStateModificationsAreAllowed,
    untracked,
    makeIterable,
    transaction,
    isES6Set,
    IAtom,
    DELETE,
    ADD,
    die,
    isFunction
} from "../internal"

const ObservableSetMarker = {}

export type IObservableSetInitialValues<T> = Set<T> | readonly T[]

export type ISetDidChange<T = any> =
    | {
          object: ObservableSet<T>
          type: "add"
          newValue: T
      }
    | {
          object: ObservableSet<T>
          type: "delete"
          oldValue: T
      }

export type ISetWillChange<T = any> =
    | {
          type: "delete"
          object: ObservableSet<T>
          oldValue: T
      }
    | {
          type: "add"
          object: ObservableSet<T>
          newValue: T
      }

export class ObservableSet<T = any> implements Set<T>, IInterceptable<ISetWillChange>, IListenable {
    [$mobx] = ObservableSetMarker
    private _data: Set<any> = new Set()
    private _atom: IAtom
    changeListeners
    interceptors
    dehancer: any
    enhancer: (newV: any, oldV: any | undefined) => any

    constructor(
        initialData?: IObservableSetInitialValues<T>,
        enhancer: IEnhancer<T> = deepEnhancer,
        public name = "ObservableSet@" + getNextId()
    ) {
        if (!isFunction(Set)) {
            die(22)
        }
        this._atom = createAtom(this.name)
        this.enhancer = (newV, oldV) => enhancer(newV, oldV, name)
        if (initialData) {
            this.replace(initialData)
        }
    }

    private dehanceValue<X extends T | undefined>(value: X): X {
        if (this.dehancer !== undefined) {
            return this.dehancer(value)
        }
        return value
    }

    clear() {
        transaction(() => {
            untracked(() => {
                for (const value of this._data.values()) this.delete(value)
            })
        })
    }

    forEach(callbackFn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any) {
        for (const value of this) {
            callbackFn.call(thisArg, value, value, this)
        }
    }

    get size() {
        this._atom.reportObserved()
        return this._data.size
    }

    add(value: T) {
        checkIfStateModificationsAreAllowed(this._atom)
        if (hasInterceptors(this)) {
            const change = interceptChange<ISetWillChange<T>>(this, {
                type: ADD,
                object: this,
                newValue: value
            })
            if (!change) return this
            // TODO: ideally, value = change.value would be done here, so that values can be
            // changed by interceptor. Same applies for other Set and Map api's.
        }
        if (!this.has(value)) {
            transaction(() => {
                this._data.add(this.enhancer(value, undefined))
                this._atom.reportChanged()
            })
            const notifySpy = __DEV__ && isSpyEnabled()
            const notify = hasListeners(this)
            const change =
                notify || notifySpy
                    ? <ISetDidChange<T>>{
                          type: ADD,
                          object: this,
                          newValue: value
                      }
                    : null
            if (notifySpy && __DEV__) spyReportStart(change)
            if (notify) notifyListeners(this, change)
            if (notifySpy && __DEV__) spyReportEnd()
        }

        return this
    }

    delete(value: any) {
        if (hasInterceptors(this)) {
            const change = interceptChange<ISetWillChange<T>>(this, {
                type: DELETE,
                object: this,
                oldValue: value
            })
            if (!change) return false
        }
        if (this.has(value)) {
            const notifySpy = __DEV__ && isSpyEnabled()
            const notify = hasListeners(this)
            const change =
                notify || notifySpy
                    ? <ISetDidChange<T>>{
                          type: DELETE,
                          object: this,
                          oldValue: value
                      }
                    : null

            if (notifySpy && __DEV__) spyReportStart({ ...change, name: this.name })
            transaction(() => {
                this._atom.reportChanged()
                this._data.delete(value)
            })
            if (notify) notifyListeners(this, change)
            if (notifySpy && __DEV__) spyReportEnd()
            return true
        }
        return false
    }

    has(value: any) {
        this._atom.reportObserved()
        return this._data.has(this.dehanceValue(value))
    }

    entries() {
        let nextIndex = 0
        const keys = Array.from(this.keys())
        const values = Array.from(this.values())
        return makeIterable<[T, T]>({
            next() {
                const index = nextIndex
                nextIndex += 1
                return index < values.length
                    ? { value: [keys[index], values[index]], done: false }
                    : { done: true }
            }
        } as any)
    }

    keys(): IterableIterator<T> {
        return this.values()
    }

    values(): IterableIterator<T> {
        this._atom.reportObserved()
        const self = this
        let nextIndex = 0
        const observableValues = Array.from(this._data.values())
        return makeIterable<T>({
            next() {
                return nextIndex < observableValues.length
                    ? { value: self.dehanceValue(observableValues[nextIndex++]), done: false }
                    : { done: true }
            }
        } as any)
    }

    replace(other: ObservableSet<T> | IObservableSetInitialValues<T>): ObservableSet<T> {
        if (isObservableSet(other)) {
            other = new Set(other)
        }

        transaction(() => {
            if (Array.isArray(other)) {
                this.clear()
                other.forEach(value => this.add(value))
            } else if (isES6Set(other)) {
                this.clear()
                other.forEach(value => this.add(value))
            } else if (other !== null && other !== undefined) {
                die("Cannot initialize set from " + other)
            }
        })

        return this
    }

    // TODO: kill
    observe(listener: (changes: ISetDidChange<T>) => void, fireImmediately?: boolean): Lambda {
        // TODO 'fireImmediately' can be true?
        if (__DEV__ && fireImmediately === true)
            die("`observe` doesn't support fireImmediately=true in combination with sets.")
        return registerListener(this, listener)
    }

    // TODO: kill
    intercept(handler: IInterceptor<ISetWillChange<T>>): Lambda {
        return registerInterceptor(this, handler)
    }

    toJSON(): T[] {
        return Array.from(this)
    }

    toString(): string {
        return "[object ObservableSet]"
    }

    [Symbol.iterator]() {
        return this.values()
    }

    get [Symbol.toStringTag]() {
        return "Set"
    }
}

// eslint-disable-next-line
export var isObservableSet = createInstanceofPredicate("ObservableSet", ObservableSet) as (
    thing: any
) => thing is ObservableSet<any>
