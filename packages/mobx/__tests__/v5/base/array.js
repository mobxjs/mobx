"use strict"

const mobx = require("../../../src/mobx.ts")
const { observable, when, _getAdministration, reaction, computed, makeObservable, autorun } = mobx
const iterall = require("iterall")

let consoleWarnMock
afterEach(() => {
    consoleWarnMock?.mockRestore()
})

test("test1", function () {
    const a = observable.array([])
    expect(a.length).toBe(0)
    expect(Object.keys(a)).toEqual([])
    expect(a.slice()).toEqual([])

    a.push(1)
    expect(a.length).toBe(1)
    expect(a.slice()).toEqual([1])

    a[1] = 2
    expect(a.length).toBe(2)
    expect(a.slice()).toEqual([1, 2])

    const sum = mobx.computed(function () {
        return (
            -1 +
            a.reduce(function (a, b) {
                return a + b
            }, 1)
        )
    })

    expect(sum.get()).toBe(3)

    a[1] = 3
    expect(a.length).toBe(2)
    expect(a.slice()).toEqual([1, 3])
    expect(sum.get()).toBe(4)

    a.splice(1, 1, 4, 5)
    expect(a.length).toBe(3)
    expect(a.slice()).toEqual([1, 4, 5])
    expect(sum.get()).toBe(10)

    a.replace([2, 4])
    expect(sum.get()).toBe(6)

    a.splice(1, 1)
    expect(sum.get()).toBe(2)
    expect(a.slice()).toEqual([2])

    a.spliceWithArray(0, 0, [4, 3])
    expect(sum.get()).toBe(9)
    expect(a.slice()).toEqual([4, 3, 2])

    a.clear()
    expect(sum.get()).toBe(0)
    expect(a.slice()).toEqual([])

    a.length = 4
    expect(isNaN(sum.get())).toBe(true)
    expect(a.length).toEqual(4)

    expect(a.slice()).toEqual([undefined, undefined, undefined, undefined])

    a.replace([1, 2, 2, 4])
    expect(sum.get()).toBe(9)
    a.length = 4
    expect(sum.get()).toBe(9)

    a.length = 2
    expect(sum.get()).toBe(3)
    expect(a.slice()).toEqual([1, 2])

    expect(a.reverse()).toEqual([2, 1])
    expect(a).toEqual([2, 1])
    expect(a.slice()).toEqual([2, 1])

    a.unshift(3)
    expect(a.sort()).toEqual([1, 2, 3])
    expect(a).toEqual([1, 2, 3])
    expect(a.slice()).toEqual([1, 2, 3])

    expect(JSON.stringify(a)).toBe("[1,2,3]")

    expect(a[1]).toBe(2)
    a[2] = 4
    expect(a[2]).toBe(4)

    expect(Object.keys(a)).toEqual(["0", "1", "2"])
})

test("cannot reverse or sort an array in a derivation", () => {
    const ar = observable([3, 2, 1])
    reaction(
        () => {
            expect(() => {
                ar.sort()
            }).toThrowErrorMatchingInlineSnapshot(
                `"[MobX] [mobx] \`observableArray.sort()\` mutates the array in-place, which is not allowed inside a derivation. Use \`array.slice().sort()\` instead"`
            )
        },
        () => {}
    )()
    reaction(
        () => {
            expect(() => {
                ar.reverse()
            }).toThrowErrorMatchingInlineSnapshot(
                `"[MobX] [mobx] \`observableArray.reverse()\` mutates the array in-place, which is not allowed inside a derivation. Use \`array.slice().reverse()\` instead"`
            )
        },
        () => {}
    )()

    const c = computed(() => {
        ar.sort()
    })
    autorun(() => {
        expect(() => {
            c.get()
        }).toThrowErrorMatchingInlineSnapshot(
            `"[MobX] [mobx] \`observableArray.sort()\` mutates the array in-place, which is not allowed inside a derivation. Use \`array.slice().sort()\` instead"`
        )
    })()

    expect(ar).toEqual([3, 2, 1])
})

test("array should support iterall / iterable ", () => {
    const a = observable([1, 2, 3])

    expect(iterall.isIterable(a)).toBe(true)

    const values = []
    iterall.forEach(a, v => values.push(v))

    expect(values).toEqual([1, 2, 3])

    let iter = iterall.getIterator(a)
    expect(iter.next()).toEqual({ value: 1, done: false })
    expect(iter.next()).toEqual({ value: 2, done: false })
    expect(iter.next()).toEqual({ value: 3, done: false })
    expect(iter.next()).toEqual({ value: undefined, done: true })

    a.replace([])
    iter = iterall.getIterator(a)
    expect(iter.next()).toEqual({ value: undefined, done: true })
})

test("find(findIndex) and remove", function () {
    const a = mobx.observable([10, 20, 20])
    let idx = -1
    function predicate(item, index) {
        if (item === 20) {
            idx = index
            return true
        }
        return false
    }
    ;[].findIndex
    expect(a.find(predicate)).toBe(20)
    expect(a.findIndex(predicate)).toBe(1)
    expect(a.find(predicate)).toBe(20)

    expect(a.remove(20)).toBe(true)
    expect(a.find(predicate)).toBe(20)
    expect(idx).toBe(1)
    expect(a.findIndex(predicate)).toBe(1)
    idx = -1
    expect(a.remove(20)).toBe(true)
    expect(a.find(predicate)).toBe(undefined)
    expect(idx).toBe(-1)
    expect(a.findIndex(predicate)).toBe(-1)

    expect(a.remove(20)).toBe(false)
})

test("concat should automatically slice observable arrays, #260", () => {
    const a1 = mobx.observable([1, 2])
    const a2 = mobx.observable([3, 4])
    expect(a1.concat(a2)).toEqual([1, 2, 3, 4])
})

test("observe", function () {
    const ar = mobx.observable([1, 4])
    const buf = []
    const disposer = mobx.observe(
        ar,
        function (changes) {
            buf.push(changes)
        },
        true
    )

    ar[1] = 3 // 1,3
    ar[2] = 0 // 1, 3, 0
    ar.shift() // 3, 0
    ar.push(1, 2) // 3, 0, 1, 2
    ar.splice(1, 2, 3, 4) // 3, 3, 4, 2
    expect(ar.slice()).toEqual([3, 3, 4, 2])
    ar.splice(6)
    ar.splice(6, 2)
    ar.replace(["a"])
    ar.pop()
    ar.pop() // does not fire anything

    // check the object param
    buf.forEach(function (change) {
        expect(change.object).toBe(ar)
        delete change.object
        expect(change.observableKind).toBe("array")
        delete change.observableKind
        delete change.debugObjectName
    })

    const result = [
        { type: "splice", index: 0, addedCount: 2, removed: [], added: [1, 4], removedCount: 0 },
        { type: "update", index: 1, oldValue: 4, newValue: 3 },
        { type: "splice", index: 2, addedCount: 1, removed: [], added: [0], removedCount: 0 },
        { type: "splice", index: 0, addedCount: 0, removed: [1], added: [], removedCount: 1 },
        { type: "splice", index: 2, addedCount: 2, removed: [], added: [1, 2], removedCount: 0 },
        {
            type: "splice",
            index: 1,
            addedCount: 2,
            removed: [0, 1],
            added: [3, 4],
            removedCount: 2
        },
        {
            type: "splice",
            index: 0,
            addedCount: 1,
            removed: [3, 3, 4, 2],
            added: ["a"],
            removedCount: 4
        },
        { type: "splice", index: 0, addedCount: 0, removed: ["a"], added: [], removedCount: 1 }
    ]

    expect(buf).toEqual(result)

    disposer()
    ar[0] = 5
    expect(buf).toEqual(result)
})

test("array modification1", function () {
    const a = mobx.observable([1, 2, 3])
    const r = a.splice(-10, 5, 4, 5, 6)
    expect(a.slice()).toEqual([4, 5, 6])
    expect(r).toEqual([1, 2, 3])
})

test("serialize", function () {
    let a = [1, 2, 3]
    const m = mobx.observable(a)

    expect(JSON.stringify(m)).toEqual(JSON.stringify(a))

    expect(a).toEqual(m.slice())

    a = [4]
    m.replace(a)
    expect(JSON.stringify(m)).toEqual(JSON.stringify(a))
    expect(a).toEqual(m.toJSON())
})

test("array modification functions", function () {
    const ars = [[], [1, 2, 3]]
    const funcs = ["push", "pop", "shift", "unshift"]
    funcs.forEach(function (f) {
        ars.forEach(function (ar) {
            const a = ar.slice()
            const b = mobx.observable(a)
            const res1 = a[f](4)
            const res2 = b[f](4)
            expect(res1).toEqual(res2)
            expect(a).toEqual(b.slice())
        })
    })
})

test("array modifications", function () {
    const a2 = mobx.observable([])
    const inputs = [undefined, -10, -4, -3, -1, 0, 1, 3, 4, 10]
    const arrays = [
        [],
        [1],
        [1, 2, 3, 4],
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        [1, undefined],
        [undefined]
    ]
    for (let i = 0; i < inputs.length; i++)
        for (let j = 0; j < inputs.length; j++)
            for (let k = 0; k < arrays.length; k++)
                for (let l = 0; l < arrays.length; l++) {
                    ;[
                        "array mod: [",
                        arrays[k].toString(),
                        "] i: ",
                        inputs[i],
                        " d: ",
                        inputs[j],
                        " [",
                        arrays[l].toString(),
                        "]"
                    ].join(" ")
                    const a1 = arrays[k].slice()
                    a2.replace(a1)
                    const res1 = a1.splice.apply(a1, [inputs[i], inputs[j]].concat(arrays[l]))
                    const res2 = a2.splice.apply(a2, [inputs[i], inputs[j]].concat(arrays[l]))
                    expect(a1.slice()).toEqual(a2.slice())
                    expect(res1).toEqual(res2)
                    expect(a1.length).toBe(a2.length)
                }
})

test("is array", function () {
    const x = mobx.observable([])
    expect(x instanceof Array).toBe(true)

    // would be cool if this would return true...
    expect(Array.isArray(x)).toBe(true)
})

test("stringifies same as ecma array", function () {
    const x = mobx.observable([])
    expect(x instanceof Array).toBe(true)

    // would be cool if these two would return true...
    expect(x.toString()).toBe("")
    expect(x.toLocaleString()).toBe("")
    x.push(1, 2)
    expect(x.toString()).toBe("1,2")
    expect(x.toLocaleString()).toBe("1,2")
})

test("observes when stringified", function () {
    const x = mobx.observable([])
    let c = 0
    mobx.autorun(function () {
        x.toString()
        c++
    })
    x.push(1)
    expect(c).toBe(2)
})

test("observes when stringified to locale", function () {
    const x = mobx.observable([])
    let c = 0
    mobx.autorun(function () {
        x.toLocaleString()
        c++
    })
    x.push(1)
    expect(c).toBe(2)
})

test("react to sort changes", function () {
    const x = mobx.observable([4, 2, 3])
    const sortedX = mobx.computed(function () {
        return x.slice().sort()
    })
    let sorted

    mobx.autorun(function () {
        sorted = sortedX.get()
    })

    expect(x.slice()).toEqual([4, 2, 3])
    expect(sorted).toEqual([2, 3, 4])
    x.push(1)
    expect(x.slice()).toEqual([4, 2, 3, 1])
    expect(sorted).toEqual([1, 2, 3, 4])
    x.shift()
    expect(x.slice()).toEqual([2, 3, 1])
    expect(sorted).toEqual([1, 2, 3])
})

test("autoextend buffer length", function () {
    const ar = observable(new Array(1000))
    let changesCount = 0
    mobx.observe(ar, () => ++changesCount)

    ar[ar.length] = 0
    ar.push(0)

    expect(changesCount).toBe(2)
})

test("array exposes correct keys", () => {
    const keys = []
    const ar = observable([1, 2])
    for (const key in ar) keys.push(key)

    expect(keys).toEqual(["0", "1"])
})

test("accessing out of bound values throws", () => {
    const a = mobx.observable([])

    let warns = 0
    const baseWarn = console.warn
    console.warn = () => {
        warns++
    }

    a[0] // out of bounds
    a[1] // out of bounds

    expect(warns).toBe(2)

    expect(() => (a[0] = 3)).not.toThrow()
    expect(() => (a[2] = 4)).toThrow(/Index out of bounds, 2 is larger than 1/)

    console.warn = baseWarn
})

test("replace can handle large arrays", () => {
    const a = mobx.observable([])
    const b = []
    b.length = 1000 * 1000
    expect(() => {
        a.replace(b)
    }).not.toThrow()

    expect(() => {
        a.spliceWithArray(0, 0, b)
    }).not.toThrow()
})

test("can iterate arrays", () => {
    const x = mobx.observable([])
    const y = []
    const d = mobx.reaction(
        () => Array.from(x),
        items => y.push(items),
        { fireImmediately: true }
    )

    x.push("a")
    x.push("b")
    expect(y).toEqual([[], ["a"], ["a", "b"]])
    d()
})

test("array is concat spreadable, #1395", () => {
    const x = mobx.observable([1, 2, 3, 4])
    const y = [5].concat(x)
    expect(y.length).toBe(5)
    expect(y).toEqual([5, 1, 2, 3, 4])
})

test("array is spreadable, #1395", () => {
    const x = mobx.observable([1, 2, 3, 4])
    expect([5, ...x]).toEqual([5, 1, 2, 3, 4])

    const y = mobx.observable([])
    expect([5, ...y]).toEqual([5])
})

test("array supports toStringTag, #1490", () => {
    // N.B. on old environments this requires polyfils for these symbols *and* Object.prototype.toString.
    // core-js provides both
    const a = mobx.observable([])
    expect(Object.prototype.toString.call(a)).toBe("[object Array]")
})

test("slice works", () => {
    const a = mobx.observable([1, 2, 3])
    expect(a.slice(0, 2)).toEqual([1, 2])
})

test("slice is reactive", () => {
    const a = mobx.observable([1, 2, 3])
    let ok = false
    when(
        () => a.slice().length === 4,
        () => (ok = true)
    )
    expect(ok).toBe(false)
    a.push(1)
    expect(ok).toBe(true)
})

test("toString", () => {
    expect(mobx.observable([1, 2]).toString()).toEqual([1, 2].toString())
    expect(mobx.observable([1, 2]).toLocaleString()).toEqual([1, 2].toLocaleString())
})

test("can define properties on arrays", () => {
    const ar = observable.array([1, 2])
    Object.defineProperty(ar, "toString", {
        enumerable: false,
        configurable: true,
        value: function () {
            return "hoi"
        }
    })

    expect(ar.toString()).toBe("hoi")
    expect("" + ar).toBe("hoi")
})

test("concats correctly #1667", () => {
    const x = observable({ data: [] })

    function generate(count) {
        const d = []
        for (let i = 0; i < count; i++) d.push({})
        return d
    }

    x.data = generate(10000)
    const first = x.data[0]
    expect(Array.isArray(x.data)).toBe(true)

    x.data = x.data.concat(generate(1000))
    expect(Array.isArray(x.data)).toBe(true)
    expect(x.data[0]).toBe(first)
    expect(x.data.length).toBe(11000)
})

test("dehances last value on shift/pop", () => {
    const x1 = observable([3, 5])
    _getAdministration(x1).dehancer = value => {
        return value * 2
    }
    expect(x1.shift()).toBe(6)
    expect(x1.shift()).toBe(10)

    const x2 = observable([3, 5])
    _getAdministration(x2).dehancer = value => {
        return value * 2
    }
    expect(x2.pop()).toBe(10)
    expect(x2.pop()).toBe(6)
})

test("#2044 symbol key on array", () => {
    const x = observable([1, 2])
    const s = Symbol("test")
    x[s] = 3
    expect(x[s]).toBe(3)

    let reacted = false
    const d = reaction(
        () => x[s],
        () => {
            reacted = true
        }
    )

    x[s] = 4
    expect(x[s]).toBe(4)

    // although x[s] can be stored, it won't be reactive!
    expect(reacted).toBe(false)
    d()
})

test("#2044 non-symbol key on array", () => {
    const x = observable([1, 2])
    const s = "test"
    x[s] = 3
    expect(x[s]).toBe(3)

    let reacted = false
    const d = reaction(
        () => x[s],
        () => {
            reacted = true
        }
    )

    x[s] = 4
    expect(x[s]).toBe(4)

    // although x[s] can be stored, it won't be reactive!
    expect(reacted).toBe(false)
    d()
})

describe("extended array prototype", () => {
    const extensionKey = "__extension"

    // A single setup/teardown for all tests because we're pretending to do a
    // singular global (dirty) change to the "environment".
    beforeAll(() => {
        Array.prototype[extensionKey] = () => {}
    })
    afterAll(() => {
        delete Array.prototype[extensionKey]
    })

    test("creating an observable should work", () => {
        mobx.observable({ b: "b" })
    })

    test("extending an observable should work", () => {
        const a = { b: "b" }
        mobx.extendObservable(a, {})
    })
})

test("reproduce #2021", () => {
    expect.assertions(1)
    try {
        Array.prototype.extension = function () {
            console.log("I'm the extension!", this.length)
        }

        class Test {
            data = null

            constructor() {
                makeObservable(this, {
                    data: observable
                })
            }
        }

        const test = new Test()

        mobx.autorun(() => {
            if (test.data) expect(test.data.someStr).toBe("123")
        })

        test.data = { someStr: "123" }
    } finally {
        delete Array.prototype.extension
    }
})

test("correct array should be passed to callbacks #2326", () => {
    const array = observable([1, 2, 3])

    function callback() {
        const lastArg = arguments[arguments.length - 1]
        expect(lastArg).toBe(array)
    }
    ;[
        "every",
        "filter",
        "find",
        "findIndex",
        "flatMap",
        "forEach",
        "map",
        "reduce",
        "reduceRight",
        "some"
    ].forEach(method => {
        if (Array.prototype[method]) array[method](callback)
        else console.warn("SKIPPING: " + method)
    })
})

test("very long arrays can be safely passed to nativeArray.concat #2379", () => {
    const nativeArray = ["a", "b"]
    const longNativeArray = [...Array(10000).keys()] // MAX_SPLICE_SIZE seems to be the threshold
    const longObservableArray = observable(longNativeArray)
    expect(longObservableArray.length).toBe(10000)
    expect(longObservableArray).toEqual(longNativeArray)
    expect(longObservableArray[9000]).toBe(longNativeArray[9000])
    expect(longObservableArray[9999]).toBe(longNativeArray[9999])
    consoleWarnMock = jest.spyOn(console, "warn").mockImplementation(() => {})
    expect(longObservableArray[10000]).toBe(longNativeArray[10000])
    expect(consoleWarnMock).toMatchSnapshot()

    const expectedArray = nativeArray.concat(longNativeArray)
    const actualArray = nativeArray.concat(longObservableArray)

    expect(actualArray).toEqual(expectedArray)

    const anotherArray = [0, 1, 2, 3, 4, 5]
    const observableArray = observable(anotherArray)
    const r1 = anotherArray.splice(2, 2, ...longNativeArray)
    const r2 = observableArray.splice(2, 2, ...longNativeArray)
    expect(r2).toEqual(r1)
    expect(observableArray).toEqual(anotherArray)
})

describe("dehances", () => {
    function supressConsoleWarn(fn) {
        const { warn } = console
        console.warn = () => {}
        const result = fn()
        console.warn = warn
        return result
    }

    const dehancer = thing => {
        // Dehance only objects of a proper type
        if (thing && typeof thing === "object" && thing.hasOwnProperty("value")) {
            return thing.value
        }
        // Support nested arrays
        if (Array.isArray(thing)) {
            // If array has own dehancer it's still applied prior to ours.
            // It doesn't matter how many dehancers we apply,
            // if they ignore unknown types.
            return thing.map(dehancer)
        }
        // Ignore unknown types
        return thing
    }

    let enhanced, dehanced, array

    beforeEach(() => {
        enhanced = [{ value: 1 }, { value: 2 }, { value: 3 }]
        dehanced = enhanced.map(dehancer)
        array = observable(enhanced)
        mobx._getAdministration(array).dehancer = dehancer
    })

    test("slice", () => {
        expect(array.slice()).toEqual(dehanced.slice())
    })

    test("filter", () => {
        const predicate = value => value === 2
        expect(array.filter(predicate)).toEqual(dehanced.filter(predicate))
    })

    test("concat", () => {
        expect(array.concat(4)).toEqual(dehanced.concat(4))
    })

    test("entries", () => {
        expect([...array.entries()]).toEqual([...dehanced.entries()])
    })

    test("every", () => {
        array.every((value, index) => {
            expect(value).toEqual(dehanced[index])
            return true
        })
    })

    test("find", () => {
        const predicate = value => value === 2
        expect(array.find(predicate)).toEqual(dehanced.find(predicate))
    })

    test("forEach", () => {
        array.forEach((value, index) => {
            expect(value).toEqual(dehanced[index])
        })
    })

    test("includes", () => {
        expect(array.includes(2)).toEqual(dehanced.includes(2))
    })

    test("indexOf", () => {
        expect(array.indexOf(2)).toEqual(dehanced.indexOf(2))
    })

    test("join", () => {
        expect(array.join()).toEqual(dehanced.join())
    })

    test("lastIndexOf", () => {
        expect(array.lastIndexOf(2)).toEqual(dehanced.lastIndexOf(2))
    })

    test("map", () => {
        array.map((value, index) => {
            expect(value).toEqual(dehanced[index])
            return value
        })
    })

    test("pop", () => {
        expect(array.pop()).toEqual(dehanced.pop())
    })

    test("reduce", () => {
        array.reduce((_, value, index) => {
            expect(value).toEqual(dehanced[index])
        })
    })

    test("reduceRight", () => {
        array.reduceRight((_, value, index) => {
            expect(value).toEqual(dehanced[index])
        })
    })

    test("reverse", () => {
        const reversedArray = supressConsoleWarn(() => array.reverse())
        expect(reversedArray).toEqual(dehanced.reverse())
    })

    test("shift", () => {
        expect(array.shift()).toEqual(dehanced.shift())
    })

    test("some", () => {
        array.some((value, index) => {
            expect(value).toEqual(dehanced[index])
            return false
        })
    })

    test("splice", () => {
        expect(array.splice(1, 2)).toEqual(dehanced.splice(1, 2))
    })

    test("sort", () => {
        const comparator = (a, b) => {
            expect(typeof a).toEqual("number")
            expect(typeof b).toEqual("number")
            return b > a
        }
        const sortedArray = supressConsoleWarn(() => array.sort(comparator))
        expect(sortedArray).toEqual(dehanced.sort(comparator))
    })

    test("values", () => {
        expect([...array.values()]).toEqual([...dehanced.values()])
    })

    test("flat/flatMap", () => {
        const nestedArray = [{ value: 1 }, [{ value: 2 }, [{ value: 3 }]]]
        const dehancedNestedArray = nestedArray.map(dehancer)

        // flat
        array.replace(nestedArray)
        expect(array.flat(Infinity)).toEqual(dehancedNestedArray.flat(Infinity))

        // flatMap
        const flattenedArray = array.flatMap((value, index) => {
            expect(value).toEqual(dehancedNestedArray[index])
            return value
        })
        expect(flattenedArray).toEqual(dehancedNestedArray.flat(1))
    })
})

test("reduce without initial value #2432", () => {
    const array = [1, 2, 3]
    const observableArray = observable(array)

    const arrayReducerArgs = []
    const observableArrayReducerArgs = []

    const arraySum = array.reduce((...args) => {
        arrayReducerArgs.push(args)
        return args[0] + args[1]
    })

    const observableArraySum = observableArray.reduce((...args) => {
        observableArrayReducerArgs.push(args)
        return args[0] + args[1]
    })

    expect(arraySum).toEqual(1 + 2 + 3)
    expect(observableArraySum).toEqual(arraySum)
    expect(arrayReducerArgs).toEqual(observableArrayReducerArgs)
})
