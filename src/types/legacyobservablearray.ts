import {
    getNextId,
    addHiddenFinalProp,
    allowStateChangesStart,
    allowStateChangesEnd,
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
import { IObservableArray } from "./observablearray"

let legacyArrayApi:
    | undefined
    | {
          reserveArrayBuffer(max: number)
          LegacyObservableArray: new <T>(
              initialValues: T[] | undefined,
              enhancer: IEnhancer<T>,
              name?: string,
              owned?: boolean
          ) => IObservableArray<T>
      } = undefined

export function enableES5() {
    if (legacyArrayApi) {
        return
    }

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
    let OBSERVABLE_ARRAY_BUFFER_SIZE = 0

    // Typescript workaround to make sure ObservableArray extends Array
    class StubArray {}
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

    class LegacyObservableArray<T> extends StubArray {
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
            thisArg?
        ): T | undefined {
            const idx = this.findIndex.apply(this, arguments as any)
            // @ts-ignore
            return idx === -1 ? undefined : this.get(idx)
        }

        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex
        findIndex(
            predicate: (item: T, index: number, array: LegacyObservableArray<T>) => boolean,
            thisArg?
        ): number {
            const items = this.peek(),
                l = items.length
            for (let i = 0; i < l; i++) if (predicate.call(thisArg, items[i], i, this)) return i
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
    // eslint-disable-next-line
    var ENTRY_0 = createArrayEntryDescriptor(0)

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

    function reserveArrayBuffer(max: number) {
        if (max > OBSERVABLE_ARRAY_BUFFER_SIZE) {
            for (let index = OBSERVABLE_ARRAY_BUFFER_SIZE; index < max + 100; index++)
                createArrayBufferItem(index)
            OBSERVABLE_ARRAY_BUFFER_SIZE = max
        }
    }

    reserveArrayBuffer(1000)

    legacyArrayApi = {
        reserveArrayBuffer,
        // @ts-ignore
        LegacyObservableArray
    }
}

export function assertES5() {
    if (!legacyArrayApi)
        fail(
            "ES5 implementation was not loaded. Please call `enableES5()` during app initialization in environments that do not support Proxy"
        )
}

export function reserveArrayBuffer(max: number) {
    assertES5()
    legacyArrayApi!.reserveArrayBuffer(max)
}

export function createLegacyArray<T>(
    initialValues: T[] | undefined,
    enhancer: IEnhancer<T>,
    name?: string
): IObservableArray<T> {
    assertES5()
    return new legacyArrayApi!.LegacyObservableArray(initialValues, enhancer, name) as any
}
