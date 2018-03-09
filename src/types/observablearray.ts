import {
    isObject,
    createInstanceofPredicate,
    getNextId,
    Lambda,
    EMPTY_ARRAY,
    addHiddenFinalProp
} from "../utils/utils"
import { Atom, IAtom } from "../core/atom"
import { checkIfStateModificationsAreAllowed } from "../core/derivation"
import {
    IInterceptable,
    IInterceptor,
    hasInterceptors,
    registerInterceptor,
    interceptChange
} from "./intercept-utils"
import { IListenable, registerListener, hasListeners, notifyListeners } from "./listen-utils"
import { isSpyEnabled, spyReportStart, spyReportEnd } from "../core/spy"
import { IEnhancer } from "./modifiers"

const MAX_SPLICE_SIZE = 10000 // See e.g. https://github.com/mobxjs/mobx/issues/859

export interface IObservableArray<T> extends Array<T> {
    spliceWithArray(index: number, deleteCount?: number, newItems?: T[]): T[]
    observe(
        listener: (changeData: IArrayChange<T> | IArraySplice<T>) => void,
        fireImmediately?: boolean
    ): Lambda
    intercept(handler: IInterceptor<IArrayWillChange<T> | IArrayWillSplice<T>>): Lambda
    clear(): T[]
    replace(newItems: T[]): T[]
    remove(value: T): boolean
}

// In 3.0, change to IArrayDidChange
export interface IArrayChange<T> {
    type: "update"
    object: IObservableArray<T>
    index: number
    newValue: T
    oldValue: T
}

// In 3.0, change to IArrayDidSplice
export interface IArraySplice<T> {
    type: "splice"
    object: IObservableArray<T>
    index: number
    added: T[]
    addedCount: number
    removed: T[]
    removedCount: number
}

export interface IArrayWillChange<T> {
    type: "update"
    object: IObservableArray<T>
    index: number
    newValue: T
}

export interface IArrayWillSplice<T> {
    type: "splice"
    object: IObservableArray<T>
    index: number
    added: T[]
    removedCount: number
}

const arrayTraps = {
    get(target, name) {
        if (name === "$mobx") return target.$mobx
        if (name === "length") return target.$mobx.getArrayLength()
        if (typeof name === "number") {
            return arrayExtensions.get.call(target, name)
        }
        if (typeof name === "string" && !isNaN(name as any)) {
            return arrayExtensions.get.call(target, parseInt(name))
        }
        if (arrayExtensions.hasOwnProperty(name)) {
            return arrayExtensions[name]
        }
        return target[name]
    },
    set(target, name, value): boolean {
        if (name === "length") {
            target.$mobx.setArrayLength(value)
            return true
        }
        if (typeof name === "number") {
            arrayExtensions.set.call(target, name, value)
            return true
        }
        if (!isNaN(name)) {
            arrayExtensions.set.call(target, parseInt(name), value)
            return true
        }
        return false
    }
}

export function createObservableArray<T>(
    initialValues: any[] | undefined,
    enhancer: IEnhancer<T>,
    name = "ObservableArray@" + getNextId(),
    owned = false
): IObservableArray<T> {
    const adm = new ObservableArrayAdministration(name, enhancer, owned)
    addHiddenFinalProp(adm.values, "$mobx", adm)
    const proxy = new Proxy(adm.values, arrayTraps) as any
    adm.proxy = proxy
    if (initialValues && initialValues.length) adm.spliceWithArray(0, 0, initialValues)
    return proxy
}

class ObservableArrayAdministration
    implements IInterceptable<IArrayWillChange<any> | IArrayWillSplice<any>>, IListenable {
    atom: IAtom
    values: any[] = [] // TODO: unify this with the proxy target
    interceptors
    changeListeners
    enhancer: (newV: any, oldV: any | undefined) => any
    dehancer: any
    proxy: any[] = undefined as any
    lastKnownLength = 0

    constructor(name, enhancer: IEnhancer<any>, public owned: boolean) {
        this.atom = new Atom(name || "ObservableArray@" + getNextId())
        this.enhancer = (newV, oldV) => enhancer(newV, oldV, name + "[..]")
    }

    dehanceValue(value: any): any {
        if (this.dehancer !== undefined) return this.dehancer(value)
        return value
    }

    dehanceValues(values: any[]): any[] {
        if (this.dehancer !== undefined && this.values.length > 0)
            return values.map(this.dehancer) as any
        return values
    }

    intercept(handler: IInterceptor<IArrayWillChange<any> | IArrayWillSplice<any>>): Lambda {
        return registerInterceptor<IArrayWillChange<any> | IArrayWillSplice<any>>(this, handler)
    }

    observe(
        listener: (changeData: IArrayChange<any> | IArraySplice<any>) => void,
        fireImmediately = false
    ): Lambda {
        if (fireImmediately) {
            listener(
                <IArraySplice<any>>{
                    object: this.proxy as any,
                    type: "splice",
                    index: 0,
                    added: this.values.slice(),
                    addedCount: this.values.length,
                    removed: [],
                    removedCount: 0
                }
            )
        }
        return registerListener(this, listener)
    }

    getArrayLength(): number {
        this.atom.reportObserved()
        return this.values.length
    }

    setArrayLength(newLength: number) {
        if (typeof newLength !== "number" || newLength < 0)
            throw new Error("[mobx.array] Out of range: " + newLength)
        let currentLength = this.values.length
        if (newLength === currentLength) return
        else if (newLength > currentLength) {
            const newItems = new Array(newLength - currentLength)
            for (let i = 0; i < newLength - currentLength; i++) newItems[i] = undefined // No Array.fill everywhere...
            this.spliceWithArray(currentLength, 0, newItems)
        } else this.spliceWithArray(newLength, currentLength - newLength)
    }

    updateArrayLength(oldLength: number, delta: number) {
        if (oldLength !== this.lastKnownLength)
            throw new Error(
                "[mobx] Modification exception: the internal structure of an observable array was changed. Did you use peek() to change it?"
            )
        this.lastKnownLength += delta
    }

    spliceWithArray(index: number, deleteCount?: number, newItems?: any[]): any[] {
        checkIfStateModificationsAreAllowed(this.atom)
        const length = this.values.length

        if (index === undefined) index = 0
        else if (index > length) index = length
        else if (index < 0) index = Math.max(0, length + index)

        if (arguments.length === 1) deleteCount = length - index
        else if (deleteCount === undefined || deleteCount === null) deleteCount = 0
        else deleteCount = Math.max(0, Math.min(deleteCount, length - index))

        if (newItems === undefined) newItems = EMPTY_ARRAY

        if (hasInterceptors(this)) {
            const change = interceptChange<IArrayWillSplice<any>>(this as any, {
                object: this.proxy as any,
                type: "splice",
                index,
                removedCount: deleteCount,
                added: newItems
            })
            if (!change) return EMPTY_ARRAY
            deleteCount = change.removedCount
            newItems = change.added
        }

        newItems = newItems.length === 0 ? newItems : newItems.map(v => this.enhancer(v, undefined))
        if (process.env.NODE_ENV !== "production") {
            const lengthDelta = newItems.length - deleteCount
            this.updateArrayLength(length, lengthDelta) // checks if internal array wasn't modified
        }
        const res = this.spliceItemsIntoValues(index, deleteCount, newItems)

        if (deleteCount !== 0 || newItems.length !== 0) this.notifyArraySplice(index, newItems, res)
        return this.dehanceValues(res)
    }

    spliceItemsIntoValues(index, deleteCount, newItems: any[]): any[] {
        if (newItems.length < MAX_SPLICE_SIZE) {
            return this.values.splice(index, deleteCount, ...newItems)
        } else {
            const res = this.values.slice(index, index + deleteCount)
            this.values = this.values
                .slice(0, index)
                .concat(newItems, this.values.slice(index + deleteCount))
            return res
        }
    }

    notifyArrayChildUpdate(index: number, newValue: any, oldValue: any) {
        const notifySpy = !this.owned && isSpyEnabled()
        const notify = hasListeners(this)
        const change =
            notify || notifySpy
                ? {
                      object: this.proxy,
                      type: "update",
                      index,
                      newValue,
                      oldValue
                  }
                : null

        if (notifySpy) spyReportStart({ ...change, name: this.atom.name })
        this.atom.reportChanged()
        if (notify) notifyListeners(this, change)
        if (notifySpy) spyReportEnd()
    }

    notifyArraySplice(index: number, added: any[], removed: any[]) {
        const notifySpy = !this.owned && isSpyEnabled()
        const notify = hasListeners(this)
        const change =
            notify || notifySpy
                ? {
                      object: this.proxy,
                      type: "splice",
                      index,
                      removed,
                      added,
                      removedCount: removed.length,
                      addedCount: added.length
                  }
                : null

        if (notifySpy) spyReportStart({ ...change, name: this.atom.name })
        this.atom.reportChanged()
        // conform: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe
        if (notify) notifyListeners(this, change)
        if (notifySpy) spyReportEnd()
    }
}

// TODO: Optimizatin: the following methods coudl be made faster by applying them to values immediately (to avoid triggerering traps a 100 times on arrays)
const interceptReads = {
    concat: true,
    find: true,
    findIndex: true,
    every: true,
    filter: true,
    forEach: true,
    indexOf: true,
    join: true,
    lastIndexOf: true,
    map: true,
    reduce: true,
    reduceRight: true,
    slice: true,
    some: true,
    toString: true,
    toLocaleString: true
}

// TODO: optimization, is it faster if we don't intercept all these
// calls and trap set / get instead?
const arrayExtensions = {
    intercept(handler: IInterceptor<IArrayWillChange<any> | IArrayWillSplice<any>>): Lambda {
        return this.$mobx.intercept(handler)
    },

    observe(
        listener: (changeData: IArrayChange<any> | IArraySplice<any>) => void,
        fireImmediately = false
    ): Lambda {
        const adm: ObservableArrayAdministration = this.$mobx
        return adm.observe(listener, fireImmediately)
    },

    clear(): any[] {
        return this.splice(0)
    },

    concat(): any[] {
        const adm: ObservableArrayAdministration = this.$mobx
        adm.atom.reportObserved()
        return Array.prototype.concat.apply(adm.values, arguments)
    },

    replace(newItems: any[]) {
        const adm: ObservableArrayAdministration = this.$mobx
        return adm.spliceWithArray(0, adm.values.length, newItems)
    },

    /**
     * Converts this array back to a (shallow) javascript structure.
     * For a deep clone use mobx.toJS
     */
    toJS(): any[] {
        return (this as any).slice()
    },

    toJSON(): any[] {
        // Used by JSON.stringify
        return this.toJS()
    },

    // TODO remove peek?
    peek(): any[] {
        const adm: ObservableArrayAdministration = this.$mobx
        adm.atom.reportObserved()
        return adm.dehanceValues(adm.values)
    },

    /*
     * functions that do alter the internal structure of the array, (based on lib.es6.d.ts)
     * since these functions alter the inner structure of the array, the have side effects.
     * Because the have side effects, they should not be used in computed function,
     * and for that reason the do not call dependencyState.notifyObserved
     */
    splice(index: number, deleteCount?: number, ...newItems: any[]): any[] {
        // TODO: splice could just use the prototype definiton of splice on `changed`
        // ... but, intercept handlers?
        const adm: ObservableArrayAdministration = this.$mobx
        switch (arguments.length) {
            case 0:
                return []
            case 1:
                return adm.spliceWithArray(index)
            case 2:
                return adm.spliceWithArray(index, deleteCount)
        }
        return adm.spliceWithArray(index, deleteCount, newItems)
    },

    spliceWithArray(index: number, deleteCount?: number, newItems?: any[]): any[] {
        const adm: ObservableArrayAdministration = this.$mobx
        return adm.spliceWithArray(index, deleteCount, newItems)
    },

    // TODO: do we need to intercept those or can we rely on the setters?
    push(...items: any[]): number {
        const adm: ObservableArrayAdministration = this.$mobx
        adm.spliceWithArray(adm.values.length, 0, items)
        return adm.values.length
    },

    pop() {
        return this.splice(Math.max(this.$mobx.values.length - 1, 0), 1)[0]
    },

    shift() {
        return this.splice(0, 1)[0]
    },

    unshift(...items: any[]): number {
        const adm = this.$mobx
        adm.spliceWithArray(0, 0, items)
        return adm.values.length
    },

    // TODO: what about this one
    reverse(): any[] {
        // reverse by default mutates in place before returning the result
        // which makes it both a 'derivation' and a 'mutation'.
        // so we deviate from the default and just make it an dervitation
        const clone = (<any>this).slice()
        return clone.reverse.apply(clone, arguments)
    },

    // TODO: what about this one
    sort(compareFn?: (a: any, b: any) => number): any[] {
        // sort by default mutates in place before returning the result
        // which goes against all good practices. Let's not change the array in place!
        const clone = (<any>this).slice()
        return clone.sort.apply(clone, arguments)
    },

    remove(value: any): boolean {
        const adm: ObservableArrayAdministration = this.$mobx
        const idx = adm.dehanceValues(adm.values).indexOf(value)
        if (idx > -1) {
            this.splice(idx, 1)
            return true
        }
        return false
    },

    get(index: number): any | undefined {
        const adm: ObservableArrayAdministration = this.$mobx
        if (adm) {
            if (index < adm.values.length) {
                adm.atom.reportObserved()
                return adm.dehanceValue(adm.values[index])
            }
            console.warn(
                `[mobx.array] Attempt to read an array index (${index}) that is out of bounds (${adm
                    .values
                    .length}). Please check length first. Out of bound indices will not be tracked by MobX`
            )
        }
        return undefined
    },

    set(index: number, newValue: any) {
        const adm: ObservableArrayAdministration = this.$mobx
        const values = adm.values
        if (index < values.length) {
            // update at index in range
            checkIfStateModificationsAreAllowed(adm.atom)
            const oldValue = values[index]
            if (hasInterceptors(adm)) {
                const change = interceptChange<IArrayWillChange<any>>(adm as any, {
                    type: "update",
                    object: this as any,
                    index,
                    newValue
                })
                if (!change) return
                newValue = change.newValue
            }
            newValue = adm.enhancer(newValue, oldValue)
            const changed = newValue !== oldValue
            if (changed) {
                values[index] = newValue
                adm.notifyArrayChildUpdate(index, newValue, oldValue)
            }
        } else if (index === values.length) {
            // add a new item
            adm.spliceWithArray(index, 0, [newValue])
        } else {
            // out of bounds
            throw new Error(
                `[mobx.array] Index out of bounds, ${index} is larger than ${values.length}`
            )
        }
    }
}

const isObservableArrayAdministration = createInstanceofPredicate(
    "ObservableArrayAdministration",
    ObservableArrayAdministration
)

export function isObservableArray(thing): thing is IObservableArray<any> {
    return isObject(thing) && isObservableArrayAdministration(thing.$mobx)
}
