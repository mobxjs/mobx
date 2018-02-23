import {
    isObject,
    createInstanceofPredicate,
    getNextId,
    makeNonEnumerable,
    Lambda,
    EMPTY_ARRAY,
    addHiddenFinalProp,
    addHiddenProp,
    invariant
} from "../utils/utils"
import { BaseAtom } from "../core/atom"
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
import { arrayAsIterator, declareIterator } from "../utils/iterable"
import { IEnhancer } from "./modifiers"

const MAX_SPLICE_SIZE = 10000 // See e.g. https://github.com/mobxjs/mobx/issues/859

// Detects bug in safari 9.1.1 (or iOS 9 safari mobile). See #364
const safariPrototypeSetterInheritanceBug = (() => {
    let v = false
    const p = {}
    Object.defineProperty(p, "0", {
        set: () => {
            v = true
        }
    })
    Object.create(p)["0"] = 1
    return v === false
})()

export interface IObservableArray<T> extends Array<T> {
    spliceWithArray(index: number, deleteCount?: number, newItems?: T[]): T[]
    observe(
        listener: (changeData: IArrayChange<T> | IArraySplice<T>) => void,
        fireImmediately?: boolean
    ): Lambda
    intercept(handler: IInterceptor<IArrayWillChange<T> | IArrayWillSplice<T>>): Lambda
    intercept(handler: IInterceptor<IArrayChange<T> | IArraySplice<T>>): Lambda // TODO: remove in 4.0
    intercept<T>(handler: IInterceptor<IArrayChange<T> | IArraySplice<T>>): Lambda // TODO: remove in 4.0
    clear(): T[]
    peek(): T[]
    replace(newItems: T[]): T[]
    find(
        predicate: (item: T, index: number, array: IObservableArray<T>) => boolean,
        thisArg?: any,
        fromIndex?: number
    ): T | undefined
    findIndex(
        predicate: (item: T, index: number, array: IObservableArray<T>) => boolean,
        thisArg?: any,
        fromIndex?: number
    ): number
    remove(value: T): boolean
    move(fromIndex: number, toIndex: number): void
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

/**
 * This array buffer contains two lists of properties, so that all arrays
 * can recycle their property definitions, which significantly improves performance of creating
 * properties on the fly.
 */
let OBSERVABLE_ARRAY_BUFFER_SIZE = 0

// Typescript workaround to make sure ObservableArray extends Array
export class StubArray {}
function inherit(ctor, proto) {
    if (typeof Object["setPrototypeOf"] !== "undefined") {
        Object["setPrototypeOf"](ctor.prototype, proto)
    } else if (typeof ctor.prototype.__proto__ !== "undefined") {
        ctor.prototype.__proto__ = proto
    } else {
        ctor["prototype"] = proto
    }
}
inherit(StubArray, Array.prototype)

// Weex freeze Array.prototype
// Make them writeable and configurable in prototype chain
// https://github.com/alibaba/weex/pull/1529
if (Object.isFrozen(Array)) {
    ;[
        "constructor",
        "push",
        "shift",
        "concat",
        "pop",
        "unshift",
        "replace",
        "find",
        "findIndex",
        "splice",
        "reverse",
        "sort"
    ].forEach(function(key) {
        Object.defineProperty(StubArray.prototype, key, {
            configurable: true,
            writable: true,
            value: Array.prototype[key]
        })
    })
}

class ObservableArrayAdministration<T>
    implements IInterceptable<IArrayWillChange<T> | IArrayWillSplice<T>>, IListenable {
    atom: BaseAtom
    values: T[] = []
    lastKnownLength: number = 0
    interceptors = null
    changeListeners = null
    enhancer: (newV: T, oldV: T | undefined) => T
    dehancer: any

    constructor(
        name,
        enhancer: IEnhancer<T>,
        public array: IObservableArray<T>,
        public owned: boolean
    ) {
        this.atom = new BaseAtom(name || "ObservableArray@" + getNextId())
        this.enhancer = (newV, oldV) => enhancer(newV, oldV, name + "[..]")
    }

    dehanceValue(value: T): T {
        if (this.dehancer !== undefined) return this.dehancer(value)
        return value
    }

    dehanceValues(values: T[]): T[] {
        if (this.dehancer !== undefined) return values.map(this.dehancer) as any
        return values
    }

    intercept(handler: IInterceptor<IArrayWillChange<T> | IArrayWillSplice<T>>): Lambda {
        return registerInterceptor<IArrayWillChange<T> | IArrayWillSplice<T>>(this, handler)
    }

    observe(
        listener: (changeData: IArrayChange<T> | IArraySplice<T>) => void,
        fireImmediately = false
    ): Lambda {
        if (fireImmediately) {
            listener(
                <IArraySplice<T>>{
                    object: this.array,
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

    // adds / removes the necessary numeric properties to this object
    updateArrayLength(oldLength: number, delta: number) {
        if (oldLength !== this.lastKnownLength)
            throw new Error(
                "[mobx] Modification exception: the internal structure of an observable array was changed. Did you use peek() to change it?"
            )
        this.lastKnownLength += delta
        if (delta > 0 && oldLength + delta + 1 > OBSERVABLE_ARRAY_BUFFER_SIZE)
            reserveArrayBuffer(oldLength + delta + 1)
    }

    spliceWithArray(index: number, deleteCount?: number, newItems?: T[]): T[] {
        checkIfStateModificationsAreAllowed(this.atom)
        const length = this.values.length

        if (index === undefined) index = 0
        else if (index > length) index = length
        else if (index < 0) index = Math.max(0, length + index)

        if (arguments.length === 1) deleteCount = length - index
        else if (deleteCount === undefined || deleteCount === null) deleteCount = 0
        else deleteCount = Math.max(0, Math.min(deleteCount, length - index))

        if (newItems === undefined) newItems = []

        if (hasInterceptors(this)) {
            const change = interceptChange<IArrayWillSplice<T>>(this as any, {
                object: this.array,
                type: "splice",
                index,
                removedCount: deleteCount,
                added: newItems
            })
            if (!change) return EMPTY_ARRAY
            deleteCount = change.removedCount
            newItems = change.added
        }

        newItems = <T[]>newItems.map(v => this.enhancer(v, undefined))
        const lengthDelta = newItems.length - deleteCount
        this.updateArrayLength(length, lengthDelta) // create or remove new entries
        const res = this.spliceItemsIntoValues(index, deleteCount, newItems)

        if (deleteCount !== 0 || newItems.length !== 0) this.notifyArraySplice(index, newItems, res)
        return this.dehanceValues(res)
    }

    spliceItemsIntoValues(index, deleteCount, newItems: T[]): T[] {
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

    notifyArrayChildUpdate<T>(index: number, newValue: T, oldValue: T) {
        const notifySpy = !this.owned && isSpyEnabled()
        const notify = hasListeners(this)
        const change =
            notify || notifySpy
                ? {
                      object: this.array,
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

    notifyArraySplice<T>(index: number, added: T[], removed: T[]) {
        const notifySpy = !this.owned && isSpyEnabled()
        const notify = hasListeners(this)
        const change =
            notify || notifySpy
                ? {
                      object: this.array,
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

export class ObservableArray<T> extends StubArray {
    private $mobx: ObservableArrayAdministration<T>

    constructor(
        initialValues: T[] | undefined,
        enhancer: IEnhancer<T>,
        name = "ObservableArray@" + getNextId(),
        owned = false
    ) {
        super()

        const adm = new ObservableArrayAdministration<T>(name, enhancer, this as any, owned)
        addHiddenFinalProp(this, "$mobx", adm)

        if (initialValues && initialValues.length) {
            this.spliceWithArray(0, 0, initialValues)
        }

        if (safariPrototypeSetterInheritanceBug) {
            // Seems that Safari won't use numeric prototype setter untill any * numeric property is
            // defined on the instance. After that it works fine, even if this property is deleted.
            Object.defineProperty(adm.array, "0", ENTRY_0)
        }
    }

    intercept(handler: IInterceptor<IArrayWillChange<T> | IArrayWillSplice<T>>): Lambda {
        return this.$mobx.intercept(handler)
    }

    observe(
        listener: (changeData: IArrayChange<T> | IArraySplice<T>) => void,
        fireImmediately = false
    ): Lambda {
        return this.$mobx.observe(listener, fireImmediately)
    }

    clear(): T[] {
        return this.splice(0)
    }

    concat(...arrays: T[][]): T[] {
        this.$mobx.atom.reportObserved()
        return Array.prototype.concat.apply(
            (this as any).peek(),
            arrays.map(a => (isObservableArray(a) ? a.peek() : a))
        )
    }

    replace(newItems: T[]) {
        return this.$mobx.spliceWithArray(0, this.$mobx.values.length, newItems)
    }

    /**
     * Converts this array back to a (shallow) javascript structure.
     * For a deep clone use mobx.toJS
     */
    toJS(): T[] {
        return (this as any).slice()
    }

    toJSON(): T[] {
        // Used by JSON.stringify
        return this.toJS()
    }

    peek(): T[] {
        this.$mobx.atom.reportObserved()
        return this.$mobx.dehanceValues(this.$mobx.values)
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
    find(
        predicate: (item: T, index: number, array: ObservableArray<T>) => boolean,
        thisArg?,
        fromIndex = 0
    ): T | undefined {
        const idx = this.findIndex.apply(this, arguments)
        return idx === -1 ? undefined : this.get(idx)
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex
    findIndex(
        predicate: (item: T, index: number, array: ObservableArray<T>) => boolean,
        thisArg?,
        fromIndex = 0
    ): number {
        const items = this.peek(),
            l = items.length
        for (let i = fromIndex; i < l; i++) if (predicate.call(thisArg, items[i], i, this)) return i
        return -1
    }

    /*
     * functions that do alter the internal structure of the array, (based on lib.es6.d.ts)
     * since these functions alter the inner structure of the array, the have side effects.
     * Because the have side effects, they should not be used in computed function,
     * and for that reason the do not call dependencyState.notifyObserved
     */
    splice(index: number, deleteCount?: number, ...newItems: T[]): T[] {
        switch (arguments.length) {
            case 0:
                return []
            case 1:
                return this.$mobx.spliceWithArray(index)
            case 2:
                return this.$mobx.spliceWithArray(index, deleteCount)
        }
        return this.$mobx.spliceWithArray(index, deleteCount, newItems)
    }

    spliceWithArray(index: number, deleteCount?: number, newItems?: T[]): T[] {
        return this.$mobx.spliceWithArray(index, deleteCount, newItems)
    }

    push(...items: T[]): number {
        const adm = this.$mobx
        adm.spliceWithArray(adm.values.length, 0, items)
        return adm.values.length
    }

    pop(): T | undefined {
        return this.splice(Math.max(this.$mobx.values.length - 1, 0), 1)[0]
    }

    shift(): T | undefined {
        return this.splice(0, 1)[0]
    }

    unshift(...items: T[]): number {
        const adm = this.$mobx
        adm.spliceWithArray(0, 0, items)
        return adm.values.length
    }

    reverse(): T[] {
        // reverse by default mutates in place before returning the result
        // which makes it both a 'derivation' and a 'mutation'.
        // so we deviate from the default and just make it an dervitation
        const clone = (<any>this).slice()
        return clone.reverse.apply(clone, arguments)
    }

    sort(compareFn?: (a: T, b: T) => number): T[] {
        // sort by default mutates in place before returning the result
        // which goes against all good practices. Let's not change the array in place!
        const clone = (<any>this).slice()
        return clone.sort.apply(clone, arguments)
    }

    remove(value: T): boolean {
        const idx = this.$mobx.dehanceValues(this.$mobx.values).indexOf(value)
        if (idx > -1) {
            this.splice(idx, 1)
            return true
        }
        return false
    }

    move(fromIndex: number, toIndex: number): void {
        function checkIndex(index: number) {
            if (index < 0) {
                throw new Error(`[mobx.array] Index out of bounds: ${index} is negative`)
            }
            const length = this.$mobx.values.length
            if (index >= length) {
                throw new Error(
                    `[mobx.array] Index out of bounds: ${index} is not smaller than ${length}`
                )
            }
        }
        checkIndex.call(this, fromIndex)
        checkIndex.call(this, toIndex)
        if (fromIndex === toIndex) {
            return
        }
        const oldItems = this.$mobx.values
        let newItems: T[]
        if (fromIndex < toIndex) {
            newItems = [
                ...oldItems.slice(0, fromIndex),
                ...oldItems.slice(fromIndex + 1, toIndex + 1),
                oldItems[fromIndex],
                ...oldItems.slice(toIndex + 1)
            ]
        } else {
            // toIndex < fromIndex
            newItems = [
                ...oldItems.slice(0, toIndex),
                oldItems[fromIndex],
                ...oldItems.slice(toIndex, fromIndex),
                ...oldItems.slice(fromIndex + 1)
            ]
        }
        this.replace(newItems)
    }

    // See #734, in case property accessors are unreliable...
    get(index: number): T | undefined {
        const impl = <ObservableArrayAdministration<any>>this.$mobx
        if (impl) {
            if (index < impl.values.length) {
                impl.atom.reportObserved()
                return impl.dehanceValue(impl.values[index])
            }
            console.warn(
                `[mobx.array] Attempt to read an array index (${index}) that is out of bounds (${impl
                    .values
                    .length}). Please check length first. Out of bound indices will not be tracked by MobX`
            )
        }
        return undefined
    }

    // See #734, in case property accessors are unreliable...
    set(index: number, newValue: T) {
        const adm = <ObservableArrayAdministration<T>>this.$mobx
        const values = adm.values
        if (index < values.length) {
            // update at index in range
            checkIfStateModificationsAreAllowed(adm.atom)
            const oldValue = values[index]
            if (hasInterceptors(adm)) {
                const change = interceptChange<IArrayWillChange<T>>(adm as any, {
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

declareIterator(ObservableArray.prototype, function() {
    return arrayAsIterator(this.slice())
})

Object.defineProperty(ObservableArray.prototype, "length", {
    enumerable: false,
    configurable: true,
    get: function(): number {
        return this.$mobx.getArrayLength()
    },
    set: function(newLength: number) {
        this.$mobx.setArrayLength(newLength)
    }
})

/**
 * Wrap function from prototype
 */
;[
    "every",
    "filter",
    "forEach",
    "indexOf",
    "join",
    "lastIndexOf",
    "map",
    "reduce",
    "reduceRight",
    "slice",
    "some",
    "toString",
    "toLocaleString"
].forEach(funcName => {
    const baseFunc = Array.prototype[funcName]
    invariant(
        typeof baseFunc === "function",
        `Base function not defined on Array prototype: '${funcName}'`
    )
    addHiddenProp(ObservableArray.prototype, funcName, function() {
        return baseFunc.apply(this.peek(), arguments)
    })
})

/**
 * We don't want those to show up in `for (const key in ar)` ...
 */
makeNonEnumerable(ObservableArray.prototype, [
    "constructor",
    "intercept",
    "observe",
    "clear",
    "concat",
    "get",
    "replace",
    "toJS",
    "toJSON",
    "peek",
    "find",
    "findIndex",
    "splice",
    "spliceWithArray",
    "push",
    "pop",
    "set",
    "shift",
    "unshift",
    "reverse",
    "sort",
    "remove",
    "move",
    "toString",
    "toLocaleString"
])

// See #364
const ENTRY_0 = createArrayEntryDescriptor(0)

function createArrayEntryDescriptor(index: number) {
    return {
        enumerable: false,
        configurable: false,
        get: function() {
            // TODO: Check `this`?, see #752?
            return this.get(index)
        },
        set: function(value) {
            this.set(index, value)
        }
    }
}

function createArrayBufferItem(index: number) {
    Object.defineProperty(ObservableArray.prototype, "" + index, createArrayEntryDescriptor(index))
}

export function reserveArrayBuffer(max: number) {
    for (let index = OBSERVABLE_ARRAY_BUFFER_SIZE; index < max; index++)
        createArrayBufferItem(index)
    OBSERVABLE_ARRAY_BUFFER_SIZE = max
}

reserveArrayBuffer(1000)

const isObservableArrayAdministration = createInstanceofPredicate(
    "ObservableArrayAdministration",
    ObservableArrayAdministration
)

export function isObservableArray(thing): thing is IObservableArray<any> {
    return isObject(thing) && isObservableArrayAdministration(thing.$mobx)
}
