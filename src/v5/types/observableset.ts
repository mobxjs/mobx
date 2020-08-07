import {
    $mobx,
    createAtom,
    deepEnhancer,
    getNextId,
    IEnhancer,
    isSpyEnabled,
    hasListeners,
    IListenable,
    invariant,
    registerListener,
    Lambda,
    fail,
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
    allowStateChangesStart,
    allowStateChangesEnd
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
    private _atom = createAtom(this.name)
    changeListeners
    interceptors
    dehancer: any
    enhancer: (newV: any, oldV: any | undefined) => any

    constructor(
        initialData?: IObservableSetInitialValues<T>,
        enhancer: IEnhancer<T> = deepEnhancer,
        public name = "ObservableSet@" + getNextId()
    ) {
        if (typeof Set !== "function") {
            throw new Error(
                "mobx.set requires Set polyfill for the current browser. Check babel-polyfill or core-js/es6/set.js"
            )
        }

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
                type: "add",
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
            const notifySpy = isSpyEnabled()
            const notify = hasListeners(this)
            const change =
                notify || notifySpy
                    ? <ISetDidChange<T>>{
                          type: "add",
                          object: this,
                          newValue: value
                      }
                    : null
            if (notifySpy && process.env.NODE_ENV !== "production") spyReportStart(change)
            if (notify) notifyListeners(this, change)
            if (notifySpy && process.env.NODE_ENV !== "production") spyReportEnd()
        }

        return this
    }

    delete(value: any) {
        if (hasInterceptors(this)) {
            const change = interceptChange<ISetWillChange<T>>(this, {
                type: "delete",
                object: this,
                oldValue: value
            })
            if (!change) return false
        }
        if (this.has(value)) {
            const notifySpy = isSpyEnabled()
            const notify = hasListeners(this)
            const change =
                notify || notifySpy
                    ? <ISetDidChange<T>>{
                          type: "delete",
                          object: this,
                          oldValue: value
                      }
                    : null

            if (notifySpy && process.env.NODE_ENV !== "production")
                spyReportStart({ ...change, name: this.name })
            transaction(() => {
                this._atom.reportChanged()
                this._data.delete(value)
            })
            if (notify) notifyListeners(this, change)
            if (notifySpy && process.env.NODE_ENV !== "production") spyReportEnd()
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
            other = other.toJS()
        }

        transaction(() => {
            const prev = allowStateChangesStart(true)
            try {
                if (Array.isArray(other)) {
                    this.clear()
                    other.forEach(value => this.add(value))
                } else if (isES6Set(other)) {
                    this.clear()
                    other.forEach(value => this.add(value))
                } else if (other !== null && other !== undefined) {
                    fail("Cannot initialize set from " + other)
                } 
            } finally {
                allowStateChangesEnd(prev)
            }
        })

        return this
    }

    observe(listener: (changes: ISetDidChange<T>) => void, fireImmediately?: boolean): Lambda {
        // TODO 'fireImmediately' can be true?
        process.env.NODE_ENV !== "production" &&
            invariant(
                fireImmediately !== true,
                "`observe` doesn't support fireImmediately=true in combination with sets."
            )
        return registerListener(this, listener)
    }

    intercept(handler: IInterceptor<ISetWillChange<T>>): Lambda {
        return registerInterceptor(this, handler)
    }

    toJS(): Set<T> {
        return new Set(this)
    }

    toString(): string {
        return this.name + "[ " + Array.from(this).join(", ") + " ]"
    }

    [Symbol.iterator]() {
        return this.values()
    }

    [Symbol.toStringTag]: "Set" = "Set"
}

export const isObservableSet = createInstanceofPredicate("ObservableSet", ObservableSet) as (
    thing: any
) => thing is ObservableSet<any>
