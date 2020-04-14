import {
    getNextId,
    addHiddenFinalProp,
    allowStateChangesStart,
    allowStateChangesEnd,
    deprecated,
    makeIterable,
    addHiddenProp,
    invariant,
    makeNonEnumerable,
    ObservableArrayAdministration,
    $mobx,
    arrayExtensions,
    IEnhancer,
    isObservableArray
} from "../internal"

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

/**
 * This array buffer contains two lists of properties, so that all arrays
 * can recycle their property definitions, which significantly improves performance of creating
 * properties on the fly.
 */
export let OBSERVABLE_ARRAY_BUFFER_SIZE = 0

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

export class LegacyObservableArray<T> extends StubArray {
    // @ts-ignore addHiddenFinalProp not recognized here
    private [$mobx]: ObservableArrayAdministration<T>

    constructor(
        initialValues: T[] | undefined,
        enhancer: IEnhancer<T>,
        name = "ObservableArray@" + getNextId(),
        owned = false
    ) {
        super()

        const adm = new ObservableArrayAdministration(name, enhancer, owned, true)
        adm.proxy = this as any
        addHiddenFinalProp(this, $mobx, adm)

        if (initialValues && initialValues.length) {
            const prev = allowStateChangesStart(true)
            // @ts-ignore
            this.spliceWithArray(0, 0, initialValues)
            allowStateChangesEnd(prev)
        }

        if (safariPrototypeSetterInheritanceBug) {
            // Seems that Safari won't use numeric prototype setter untill any * numeric property is
            // defined on the instance. After that it works fine, even if this property is deleted.
            Object.defineProperty(this, "0", ENTRY_0)
        }
    }

    // TODO: do we need below methods still, or can they be wrapped from the prototype directly as done with all others?

    concat(...arrays: T[][]): T[] {
        this[$mobx].atom.reportObserved()
        return Array.prototype.concat.apply(
            (this as any).peek(),
            //@ts-ignore
            arrays.map(a => (isObservableArray(a) ? a.peek() : a))
        )
    }

    private peek(): T[] {
        this[$mobx].atom.reportObserved()
        return this[$mobx].dehanceValues(this[$mobx].values)
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
    find(
        predicate: (item: T, index: number, array: LegacyObservableArray<T>) => boolean,
        thisArg?,
        fromIndex = 0
    ): T | undefined {
        if (arguments.length === 3)
            deprecated(
                "The array.find fromIndex argument to find will not be supported anymore in the next major"
            )
        const idx = this.findIndex.apply(this, arguments as any)
        // @ts-ignore
        return idx === -1 ? undefined : this.get(idx)
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex
    findIndex(
        predicate: (item: T, index: number, array: LegacyObservableArray<T>) => boolean,
        thisArg?,
        fromIndex = 0
    ): number {
        if (arguments.length === 3)
            deprecated(
                "The array.findIndex fromIndex argument to find will not be supported anymore in the next major"
            )
        const items = this.peek(),
            l = items.length
        for (let i = fromIndex; i < l; i++) if (predicate.call(thisArg, items[i], i, this)) return i
        return -1
    }

    [Symbol.iterator || "@@iterator"]() {
        const self = this
        let nextIndex = 0
        return makeIterable({
            next() {
                // @ts-ignore
                return nextIndex < self.length
                    ? { value: self[nextIndex++], done: false }
                    : { done: true, value: undefined }
            }
        })
    }
}

Object.defineProperty(LegacyObservableArray.prototype, "length", {
    enumerable: false,
    configurable: true,
    get: function(): number {
        return this[$mobx].getArrayLength()
    },
    set: function(newLength: number) {
        this[$mobx].setArrayLength(newLength)
    }
})

if (Symbol.toStringTag) {
    addHiddenProp(LegacyObservableArray.prototype, Symbol.toStringTag, "Array")
}

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
    addHiddenProp(LegacyObservableArray.prototype, funcName, function() {
        return baseFunc.apply(this.peek(), arguments)
    })
})
;[
    /**
     * Reuse from proxy traps
     */
    "intercept",
    "observe",
    "clear",
    "replace",
    "toJS",
    "toJSON",
    "splice",
    "spliceWithArray",
    "push",
    "pop",
    "shift",
    "unshift",
    "reverse",
    "sort",
    "remove",
    "get",
    "set"
].forEach(prop => {
    addHiddenProp(LegacyObservableArray.prototype, prop, arrayExtensions[prop])
})

/**
 * We don't want those to show up in `for (const key in ar)` ...
 */
makeNonEnumerable(LegacyObservableArray.prototype, [
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
        configurable: true,
        get: function() {
            return this.get(index)
        },
        set: function(value) {
            this.set(index, value)
        }
    }
}

function createArrayBufferItem(index: number) {
    Object.defineProperty(
        LegacyObservableArray.prototype,
        "" + index,
        createArrayEntryDescriptor(index)
    )
}

export function reserveArrayBuffer(max: number) {
    for (let index = OBSERVABLE_ARRAY_BUFFER_SIZE; index < max; index++)
        createArrayBufferItem(index)
    OBSERVABLE_ARRAY_BUFFER_SIZE = max
}

reserveArrayBuffer(1000)
