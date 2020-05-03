import {
    getNextId,
    addHiddenFinalProp,
    allowStateChangesStart,
    allowStateChangesEnd,
    makeIterable,
    addHiddenProp,
    invariant,
    ObservableArrayAdministration,
    $mobx,
    arrayExtensions,
    IEnhancer,
    isObservableArray,
    IObservableArray
} from "../internal"

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

// TODO: kill enableES5, since it is so small?
export function enableES5() {
    if (legacyArrayApi) {
        return
    }

    /**
     * This array buffer contains two lists of properties, so that all arrays
     * can recycle their property definitions, which significantly improves performance of creating
     * properties on the fly.
     */
    let OBSERVABLE_ARRAY_BUFFER_SIZE = 0

    // Typescript workaround to make sure ObservableArray extends Array
    class StubArray {}
    function inherit(ctor, proto) {
        if (Object.setPrototypeOf) {
            Object.setPrototypeOf(ctor.prototype, proto)
        } else if (ctor.prototype.__proto__ !== undefined) {
            ctor.prototype.__proto__ = proto
        } else {
            ctor.prototype = proto
        }
    }
    inherit(StubArray, Array.prototype)

    // Weex proto freeze protection was here,
    // but it is unclear why the hack is need as MobX never changed the prototype
    // anyway, so removed it in V6

    class LegacyObservableArray<T> extends StubArray {
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
        }

        concat(...arrays: T[][]): T[] {
            this[$mobx].atom.reportObserved()
            return Array.prototype.concat.apply(
                (this as any).slice(),
                //@ts-ignore
                arrays.map(a => (isObservableArray(a) ? a.slice() : a))
            )
        }

        get length(): number {
            return this[$mobx].getArrayLength()
        }

        set length(newLength: number) {
            this[$mobx].setArrayLength(newLength)
        }

        get [Symbol.toStringTag]() {
            return "Array"
        }

        [Symbol.iterator]() {
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

    Object.entries(arrayExtensions).forEach(([prop, fn]) => {
        if (prop !== "concat") addHiddenProp(LegacyObservableArray.prototype, prop, fn)
    })

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
    invariant(
        legacyArrayApi,
        __DEV__
            ? "ES5 implementation was not loaded. Please call `enableES5()` during app initialization in environments that do not support Proxy"
            : "ES5 not loaded"
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
