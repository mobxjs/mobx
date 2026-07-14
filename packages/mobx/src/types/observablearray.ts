import {
    $mobx,
    Atom,
    EMPTY_ARRAY,
    IAtom,
    IEnhancer,
    addHiddenFinalProp,
    checkIfStateModificationsAreAllowed,
    createInstanceofPredicate,
    getNextId,
    isObject,
    hasProp,
    die,
    globalState,
    initObservable
} from "../internal"

export const UPDATE = "update"
export const MAX_SPLICE_SIZE = 10000 // See e.g. https://github.com/mobxjs/mobx/issues/859

export interface IObservableArray<T = any> extends Array<T> {
    spliceWithArray(index: number, deleteCount?: number, newItems?: T[]): T[]
    clear(): T[]
    replace(newItems: T[]): T[]
    remove(value: T): boolean
    toJSON(): T[]
}

interface IArrayBaseChange<T> {
    object: IObservableArray<T>
    observableKind: "array"
    debugObjectName: string
    index: number
}

export type IArrayDidChange<T = any> = IArrayUpdate<T> | IArraySplice<T>

export interface IArrayUpdate<T = any> extends IArrayBaseChange<T> {
    type: "update"
    newValue: T
    oldValue: T
}

export interface IArraySplice<T = any> extends IArrayBaseChange<T> {
    type: "splice"
    added: T[]
    addedCount: number
    removed: T[]
    removedCount: number
}

const arrayTraps = {
    get(target, name) {
        const adm: ObservableArrayAdministration = target[$mobx]
        if (name === $mobx) {
            return adm
        }
        if (name === "length") {
            return adm.getArrayLength_()
        }
        if (typeof name === "string" && !isNaN(name as any)) {
            return adm.get_(parseInt(name))
        }
        if (hasProp(arrayExtensions, name)) {
            return arrayExtensions[name]
        }
        return target[name]
    },
    set(target, name, value): boolean {
        const adm: ObservableArrayAdministration = target[$mobx]
        if (name === "length") {
            adm.setArrayLength_(value)
        }
        if (typeof name === "symbol" || isNaN(name)) {
            target[name] = value
        } else {
            // numeric string
            adm.set_(parseInt(name), value)
        }
        return true
    },
    preventExtensions() {
        die(15)
    }
}

export class ObservableArrayAdministration {
    atom_: IAtom
    readonly values_: any[] = [] // this is the prop that gets proxied, so can't replace it!
    enhancer_: (newV: any, oldV: any | undefined) => any
    proxy_!: IObservableArray<any>
    lastKnownLength_ = 0

    constructor(
        name = __DEV__ ? "ObservableArray@" + getNextId() : "ObservableArray",
        enhancer: IEnhancer<any>,
        public owned_: boolean
    ) {
        this.atom_ = new Atom(name)
        this.enhancer_ = (newV, oldV) =>
            enhancer(newV, oldV, __DEV__ ? name + "[..]" : "ObservableArray[..]")
    }

    getArrayLength_(): number {
        this.atom_.reportObserved()
        return this.values_.length
    }

    setArrayLength_(newLength: number) {
        if (typeof newLength !== "number" || isNaN(newLength) || newLength < 0) {
            die(40, newLength)
        }
        let currentLength = this.values_.length
        if (newLength === currentLength) {
            return
        } else if (newLength > currentLength) {
            const newItems = Array.from({ length: newLength - currentLength })
            this.spliceWithArray_(currentLength, 0, newItems)
        } else {
            this.spliceWithArray_(newLength, currentLength - newLength)
        }
    }

    updateArrayLength_(oldLength: number, delta: number) {
        if (oldLength !== this.lastKnownLength_) {
            die(16)
        }
        this.lastKnownLength_ += delta
    }

    spliceWithArray_(index: number, deleteCount?: number, newItems?: any[]): any[] {
        checkIfStateModificationsAreAllowed(this.atom_)
        const length = this.values_.length

        if (index === undefined) {
            index = 0
        } else if (index > length) {
            index = length
        } else if (index < 0) {
            index = Math.max(0, length + index)
        }

        if (arguments.length === 1) {
            deleteCount = length - index
        } else if (deleteCount === undefined || deleteCount === null) {
            deleteCount = 0
        } else {
            deleteCount = Math.max(0, Math.min(deleteCount, length - index))
        }

        if (newItems === undefined) {
            newItems = EMPTY_ARRAY
        }

        newItems =
            newItems.length === 0 ? newItems : newItems.map(v => this.enhancer_(v, undefined))
        if (__DEV__) {
            const lengthDelta = newItems.length - deleteCount
            this.updateArrayLength_(length, lengthDelta) // checks if internal array wasn't modified
        }
        const res = this.spliceItemsIntoValues_(index, deleteCount, newItems)

        if (deleteCount !== 0 || newItems.length !== 0) {
            this.notifyArraySplice_(index, newItems, res)
        }
        return res
    }

    spliceItemsIntoValues_(index: number, deleteCount: number, newItems: any[]): any[] {
        if (newItems.length < MAX_SPLICE_SIZE) {
            return this.values_.splice(index, deleteCount, ...newItems)
        } else {
            // The items removed by the splice
            const res = this.values_.slice(index, index + deleteCount)
            // The items that that should remain at the end of the array
            let oldItems = this.values_.slice(index + deleteCount)
            // New length is the previous length + addition count - deletion count
            this.values_.length += newItems.length - deleteCount
            for (let i = 0; i < newItems.length; i++) {
                this.values_[index + i] = newItems[i]
            }
            for (let i = 0; i < oldItems.length; i++) {
                this.values_[index + newItems.length + i] = oldItems[i]
            }
            return res
        }
    }

    notifyArrayChildUpdate_(index: number, newValue: any, oldValue: any) {
        this.atom_.reportChanged()
    }

    notifyArraySplice_(index: number, added: any[], removed: any[]) {
        this.atom_.reportChanged()
    }

    get_(index: number): any | undefined {
        this.atom_.reportObserved()
        return this.values_[index]
    }

    set_(index: number, newValue: any) {
        const values = this.values_
        if (index < values.length) {
            // update at index in range
            checkIfStateModificationsAreAllowed(this.atom_)
            const oldValue = values[index]
            newValue = this.enhancer_(newValue, oldValue)
            const changed = newValue !== oldValue
            if (changed) {
                values[index] = newValue
                this.notifyArrayChildUpdate_(index, newValue, oldValue)
            }
        } else {
            // For out of bound index, we don't create an actual sparse array,
            // but rather fill the holes with undefined (same as setArrayLength_).
            // This could be considered a bug.
            const newItems = Array.from({ length: index + 1 - values.length })
            newItems[newItems.length - 1] = newValue
            this.spliceWithArray_(values.length, 0, newItems)
        }
    }
}

export function createObservableArray<T>(
    initialValues: T[] | undefined,
    enhancer: IEnhancer<T>,
    name = __DEV__ ? "ObservableArray@" + getNextId() : "ObservableArray",
    owned = false
): IObservableArray<T> {
    return initObservable(() => {
        const adm = new ObservableArrayAdministration(name, enhancer, owned)
        addHiddenFinalProp(adm.values_, $mobx, adm)
        const proxy = new Proxy(adm.values_, arrayTraps) as any
        adm.proxy_ = proxy
        if (initialValues && initialValues.length) {
            adm.spliceWithArray_(0, 0, initialValues)
        }
        return proxy
    })
}

// eslint-disable-next-line
export var arrayExtensions = {
    clear(): any[] {
        return this.splice(0)
    },

    replace(newItems: any[]) {
        const adm: ObservableArrayAdministration = this[$mobx]
        return adm.spliceWithArray_(0, adm.values_.length, newItems)
    },

    // Used by JSON.stringify
    toJSON(): any[] {
        return this.slice()
    },

    /*
     * functions that do alter the internal structure of the array, (based on lib.es6.d.ts)
     * since these functions alter the inner structure of the array, the have side effects.
     * Because the have side effects, they should not be used in computed function,
     * and for that reason the do not call dependencyState.notifyObserved
     */
    splice(index: number, deleteCount?: number, ...newItems: any[]): any[] {
        const adm: ObservableArrayAdministration = this[$mobx]
        switch (arguments.length) {
            case 0:
                return []
            case 1:
                return adm.spliceWithArray_(index)
            case 2:
                return adm.spliceWithArray_(index, deleteCount)
        }
        return adm.spliceWithArray_(index, deleteCount, newItems)
    },

    spliceWithArray(index: number, deleteCount?: number, newItems?: any[]): any[] {
        return (this[$mobx] as ObservableArrayAdministration).spliceWithArray_(
            index,
            deleteCount,
            newItems
        )
    },

    push(...items: any[]): number {
        const adm: ObservableArrayAdministration = this[$mobx]
        adm.spliceWithArray_(adm.values_.length, 0, items)
        return adm.values_.length
    },

    pop() {
        return this.splice(Math.max(this[$mobx].values_.length - 1, 0), 1)[0]
    },

    shift() {
        return this.splice(0, 1)[0]
    },

    unshift(...items: any[]): number {
        const adm: ObservableArrayAdministration = this[$mobx]
        adm.spliceWithArray_(0, 0, items)
        return adm.values_.length
    },

    reverse(): any[] {
        // reverse by default mutates in place before returning the result
        // which makes it both a 'derivation' and a 'mutation'.
        if (globalState.trackingDerivation) {
            die(37, "reverse")
        }
        this.replace(this.slice().reverse())
        return this
    },

    sort(): any[] {
        // sort by default mutates in place before returning the result
        // which goes against all good practices. Let's not change the array in place!
        if (globalState.trackingDerivation) {
            die(37, "sort")
        }
        const copy = this.slice()
        copy.sort.apply(copy, arguments)
        this.replace(copy)
        return this
    },

    remove(value: any): boolean {
        const adm: ObservableArrayAdministration = this[$mobx]
        const idx = adm.values_.indexOf(value)
        if (idx > -1) {
            this.splice(idx, 1)
            return true
        }
        return false
    }
}

/**
 * Wrap function from prototype
 * Without this, everything works as well, but this works
 * faster as everything works on unproxied values
 */
addArrayExtension("at", simpleFunc)
addArrayExtension("concat", simpleFunc)
addArrayExtension("flat", simpleFunc)
addArrayExtension("includes", simpleFunc)
addArrayExtension("indexOf", simpleFunc)
addArrayExtension("join", simpleFunc)
addArrayExtension("lastIndexOf", simpleFunc)
addArrayExtension("slice", simpleFunc)
addArrayExtension("toString", simpleFunc)
addArrayExtension("toLocaleString", simpleFunc)
addArrayExtension("toSorted", simpleFunc)
addArrayExtension("toSpliced", simpleFunc)
addArrayExtension("with", simpleFunc)
// map
addArrayExtension("every", mapLikeFunc)
addArrayExtension("filter", mapLikeFunc)
addArrayExtension("find", mapLikeFunc)
addArrayExtension("findIndex", mapLikeFunc)
addArrayExtension("findLast", mapLikeFunc)
addArrayExtension("findLastIndex", mapLikeFunc)
addArrayExtension("flatMap", mapLikeFunc)
addArrayExtension("forEach", mapLikeFunc)
addArrayExtension("map", mapLikeFunc)
addArrayExtension("some", mapLikeFunc)
addArrayExtension("toReversed", mapLikeFunc)
// reduce
addArrayExtension("reduce", reduceLikeFunc)
addArrayExtension("reduceRight", reduceLikeFunc)

function addArrayExtension(funcName, funcFactory) {
    if (typeof Array.prototype[funcName] === "function") {
        arrayExtensions[funcName] = funcFactory(funcName)
    }
}

// Report and delegate to dehanced array
function simpleFunc(funcName) {
    return function () {
        const adm: ObservableArrayAdministration = this[$mobx]
        adm.atom_.reportObserved()
        const dehancedValues = adm.values_
        return dehancedValues[funcName].apply(dehancedValues, arguments)
    }
}

// Make sure callbacks receive correct array arg #2326
function mapLikeFunc(funcName) {
    return function (callback, thisArg) {
        const adm: ObservableArrayAdministration = this[$mobx]
        adm.atom_.reportObserved()
        const dehancedValues = adm.values_
        return dehancedValues[funcName]((element, index) => {
            return callback.call(thisArg, element, index, this)
        })
    }
}

// Make sure callbacks receive correct array arg #2326
function reduceLikeFunc(funcName) {
    return function () {
        const adm: ObservableArrayAdministration = this[$mobx]
        adm.atom_.reportObserved()
        const dehancedValues = adm.values_
        // #2432 - reduce behavior depends on arguments.length
        const callback = arguments[0]
        arguments[0] = (accumulator, currentValue, index) => {
            return callback(accumulator, currentValue, index, this)
        }
        return dehancedValues[funcName].apply(dehancedValues, arguments)
    }
}

const isObservableArrayAdministration = createInstanceofPredicate(
    "ObservableArrayAdministration",
    ObservableArrayAdministration
)

export function isObservableArray(thing): thing is IObservableArray<any> {
    return isObject(thing) && isObservableArrayAdministration(thing[$mobx])
}
