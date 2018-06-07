"use strict"

var mobx = require("../../src/mobx.ts")
var map = mobx.observable.map
var autorun = mobx.autorun
var iterall = require("iterall")

test("map crud", function() {
    mobx._getGlobalState().mobxGuid = 0 // hmm dangerous reset?

    var events = []
    var m = map({ "1": "a" })
    m.observe(function(changes) {
        events.push(changes)
    })

    expect(m.has("1")).toBe(true)
    expect(m.has(1)).toBe(false)
    expect(m.get("1")).toBe("a")
    expect(m.get("b")).toBe(undefined)
    expect(m.size).toBe(1)

    m.set("1", "aa")
    m.set(1, "b")
    expect(m.has("1")).toBe(true)
    expect(m.get("1")).toBe("aa")
    expect(m.get(1)).toBe("b")

    var k = ["arr"]
    m.set(k, "arrVal")
    expect(m.has(k)).toBe(true)
    expect(m.get(k)).toBe("arrVal")

    expect(mobx.keys(m)).toEqual(["1", 1, k])
    expect(mobx.values(m)).toEqual(["aa", "b", "arrVal"])
    expect(Array.from(m)).toEqual([["1", "aa"], [1, "b"], [k, "arrVal"]])
    expect(m.toJS()).toEqual(new Map([["1", "aa"], [1, "b"], [k, "arrVal"]]))
    expect(m.toPOJO()).toEqual({ "1": "b", arr: "arrVal" })
    expect(JSON.stringify(m)).toEqual('{"1":"b","arr":"arrVal"}')
    expect(m.toString()).toBe("ObservableMap@1[{ 1: aa, 1: b, arr: arrVal }]")
    expect(m.size).toBe(3)

    m.clear()
    expect(mobx.keys(m)).toEqual([])
    expect(mobx.values(m)).toEqual([])
    expect(m.toJS()).toEqual(new Map())
    expect(m.toString()).toEqual("ObservableMap@1[{  }]")
    expect(m.size).toBe(0)

    expect(m.has("a")).toBe(false)
    expect(m.has("b")).toBe(false)
    expect(m.get("a")).toBe(undefined)
    expect(m.get("b")).toBe(undefined)

    expect(events).toEqual([
        { object: m, name: "1", newValue: "aa", oldValue: "a", type: "update" },
        { object: m, name: 1, newValue: "b", type: "add" },
        { object: m, name: ["arr"], newValue: "arrVal", type: "add" },
        { object: m, name: "1", oldValue: "aa", type: "delete" },
        { object: m, name: 1, oldValue: "b", type: "delete" },
        { object: m, name: ["arr"], oldValue: "arrVal", type: "delete" }
    ])
})

test("map merge", function() {
    var a = map({ a: 1, b: 2, c: 2 })
    var b = map({ c: 3, d: 4 })
    a.merge(b)
    expect(a.toJSON()).toEqual({ a: 1, b: 2, c: 3, d: 4 })
})

test("observe value", function() {
    var a = map()
    var hasX = false
    var valueX = undefined
    var valueY = undefined

    autorun(function() {
        hasX = a.has("x")
    })

    autorun(function() {
        valueX = a.get("x")
    })

    autorun(function() {
        valueY = a.get("y")
    })

    expect(hasX).toBe(false)
    expect(valueX).toBe(undefined)

    a.set("x", 3)
    expect(hasX).toBe(true)
    expect(valueX).toBe(3)

    a.set("x", 4)
    expect(hasX).toBe(true)
    expect(valueX).toBe(4)

    a.delete("x")
    expect(hasX).toBe(false)
    expect(valueX).toBe(undefined)

    a.set("x", 5)
    expect(hasX).toBe(true)
    expect(valueX).toBe(5)

    expect(valueY).toBe(undefined)
    a.merge({ y: "hi" })
    expect(valueY).toBe("hi")
    a.merge({ y: "hello" })
    expect(valueY).toBe("hello")

    a.replace({ y: "stuff", z: "zoef" })
    expect(valueY).toBe("stuff")
    expect(mobx.keys(a)).toEqual(["y", "z"])
})

test("initialize with entries", function() {
    const thing = [{ x: 3 }]
    var a = map([["a", 1], [thing, 2]])
    expect(Array.from(a)).toEqual([["a", 1], [thing, 2]])
})

test("initialize with empty value", function() {
    var a = map()
    var b = map({})
    var c = map([])

    a.set("0", 0)
    b.set("0", 0)
    c.set("0", 0)

    expect(a.toJSON()).toEqual({ "0": 0 })
    expect(b.toJSON()).toEqual({ "0": 0 })
    expect(c.toJSON()).toEqual({ "0": 0 })
})

test("observe collections", function() {
    var x = map()
    var keys, values, entries

    autorun(function() {
        keys = mobx.keys(x)
    })
    autorun(function() {
        values = iteratorToArray(x.values())
    })
    autorun(function() {
        entries = iteratorToArray(x.entries())
    })

    x.set("a", 1)
    expect(keys).toEqual(["a"])
    expect(values).toEqual([1])
    expect(entries).toEqual([["a", 1]])

    // should not retrigger:
    keys = null
    values = null
    entries = null
    x.set("a", 1)
    expect(keys).toEqual(null)
    expect(values).toEqual(null)
    expect(entries).toEqual(null)

    x.set("a", 2)
    expect(values).toEqual([2])
    expect(entries).toEqual([["a", 2]])

    x.set("b", 3)
    expect(keys).toEqual(["a", "b"])
    expect(values).toEqual([2, 3])
    expect(entries).toEqual([["a", 2], ["b", 3]])

    x.has("c")
    expect(keys).toEqual(["a", "b"])
    expect(values).toEqual([2, 3])
    expect(entries).toEqual([["a", 2], ["b", 3]])

    x.delete("a")
    expect(keys).toEqual(["b"])
    expect(values).toEqual([3])
    expect(entries).toEqual([["b", 3]])
})

test("cleanup", function() {
    var x = map({ a: 1 })

    var aValue
    var disposer = autorun(function() {
        aValue = x.get("a")
    })

    var observable = x._data.get("a")

    expect(aValue).toBe(1)
    expect(observable.observers.size).toBe(1)
    expect(x._hasMap.get("a").observers.size).toBe(1)

    expect(x.delete("a")).toBe(true)
    expect(x.delete("not-existing")).toBe(false)

    expect(aValue).toBe(undefined)
    expect(observable.observers.size).toBe(0)
    expect(x._hasMap.get("a").observers.size).toBe(1)

    x.set("a", 2)
    observable = x._data.get("a")

    expect(aValue).toBe(2)
    expect(observable.observers.size).toBe(1)
    expect(x._hasMap.get("a").observers.size).toBe(1)

    disposer()
    expect(aValue).toBe(2)
    expect(observable.observers.size).toBe(0)
    expect(x._hasMap.get("a").observers.size).toBe(0)
})

test("strict", function() {
    var x = map()
    autorun(function() {
        x.get("y") // should not throw
    })
})

test("issue 100", function() {
    var that = {}
    mobx.extendObservable(that, {
        myMap: map()
    })
    expect(mobx.isObservableMap(that.myMap)).toBe(true)
    expect(typeof that.myMap.observe).toBe("function")
})

test("issue 119 - unobserve before delete", function() {
    var propValues = []
    var myObservable = mobx.observable({
        myMap: map()
    })
    myObservable.myMap.set("myId", {
        myProp: "myPropValue",
        get myCalculatedProp() {
            if (myObservable.myMap.has("myId"))
                return myObservable.myMap.get("myId").myProp + " calculated"
            return undefined
        }
    })
    // the error only happens if the value is observed
    mobx.autorun(function() {
        mobx.values(myObservable.myMap).forEach(function(value) {
            propValues.push(value.myCalculatedProp)
        })
    })
    myObservable.myMap.delete("myId")

    expect(propValues).toEqual(["myPropValue calculated"])
})

test("issue 116 - has should not throw on invalid keys", function() {
    var x = map()
    expect(x.has(undefined)).toBe(false)
    expect(x.has({})).toBe(false)
    expect(x.get({})).toBe(undefined)
    expect(x.get(undefined)).toBe(undefined)
})

test("map modifier", () => {
    var x = mobx.observable.map({ a: 1 })
    expect(mobx.isObservableMap(x)).toBe(true)
    expect(x.get("a")).toBe(1)
    x.set("b", {})
    expect(mobx.isObservableObject(x.get("b"))).toBe(true)

    x = mobx.observable.map([["a", 1]])
    expect(x.get("a")).toBe(1)

    x = mobx.observable.map()
    expect(mobx.keys(x)).toEqual([])

    x = mobx.observable({ a: mobx.observable.map({ b: { c: 3 } }) })
    expect(mobx.isObservableObject(x)).toBe(true)
    expect(mobx.isObservableObject(x.a)).toBe(false)
    expect(mobx.isObservableMap(x.a)).toBe(true)
    expect(mobx.isObservableObject(x.a.get("b"))).toBe(true)
})

test("map modifier with modifier", () => {
    var x = mobx.observable.map({ a: { c: 3 } })
    expect(mobx.isObservableObject(x.get("a"))).toBe(true)
    x.set("b", { d: 4 })
    expect(mobx.isObservableObject(x.get("b"))).toBe(true)

    x = mobx.observable.map({ a: { c: 3 } }, { deep: false })
    expect(mobx.isObservableObject(x.get("a"))).toBe(false)
    x.set("b", { d: 4 })
    expect(mobx.isObservableObject(x.get("b"))).toBe(false)

    x = mobx.observable({ a: mobx.observable.map({ b: {} }, { deep: false }) })
    expect(mobx.isObservableObject(x)).toBe(true)
    expect(mobx.isObservableMap(x.a)).toBe(true)
    expect(mobx.isObservableObject(x.a.get("b"))).toBe(false)
    x.a.set("e", {})
    expect(mobx.isObservableObject(x.a.get("e"))).toBe(false)
})

test("256, map.clear should not be tracked", () => {
    var x = mobx.observable.map({ a: 3 })
    var c = 0
    var d = mobx.autorun(() => {
        c++
        x.clear()
    })

    expect(c).toBe(1)
    x.set("b", 3)
    expect(c).toBe(1)

    d()
})

test("256, map.merge should be not be tracked for target", () => {
    var x = mobx.observable.map({ a: 3 })
    var y = mobx.observable.map({ b: 3 })
    var c = 0

    var d = mobx.autorun(() => {
        c++
        x.merge(y)
    })

    expect(c).toBe(1)
    expect(mobx.keys(x)).toEqual(["a", "b"])

    y.set("c", 4)
    expect(c).toBe(2)
    expect(mobx.keys(x)).toEqual(["a", "b", "c"])

    x.set("d", 5)
    expect(c).toBe(2)
    expect(mobx.keys(x)).toEqual(["a", "b", "c", "d"])

    d()
})

test("308, map keys should be coerced to strings correctly", () => {
    var m = mobx.observable.map()
    m.set(1, true)
    m.delete(1)
    expect(mobx.keys(m)).toEqual([])

    m.set(1, true)
    m.set("1", false)
    m.set(0, true)
    m.set(-0, false)
    expect(Array.from(mobx.keys(m))).toEqual([1, "1", 0])
    expect(m.get(-0)).toBe(false)
    expect(m.get(1)).toBe(true)

    m.delete("1")
    expect(Array.from(mobx.keys(m))).toEqual([1, 0])

    m.delete(1)
    expect(mobx.keys(m)).toEqual([0])

    m.set(true, true)
    expect(m.get("true")).toBe(undefined)
    expect(m.get(true)).toBe(true)
    m.delete(true)
    expect(mobx.keys(m)).toEqual([0])
})

test("map should support iterall / iterable ", () => {
    var a = mobx.observable.map({ a: 1, b: 2 })

    function leech(iter) {
        var values = []
        do {
            var v = iter.next()
            if (!v.done) values.push(v.value)
        } while (!v.done)
        return values
    }

    expect(iterall.isIterable(a)).toBe(true)

    expect(leech(iterall.getIterator(a))).toEqual([["a", 1], ["b", 2]])

    expect(leech(a.entries())).toEqual([["a", 1], ["b", 2]])

    expect(leech(a.keys())).toEqual(["a", "b"])
    expect(leech(a.values())).toEqual([1, 2])
})

test("support for ES6 Map", () => {
    var x = new Map()
    x.set("x", 3)
    x.set("y", 2)

    var m = mobx.observable(x)
    expect(mobx.isObservableMap(m)).toBe(true)
    expect(Array.from(m)).toEqual([["x", 3], ["y", 2]])

    var x2 = new Map()
    x2.set("y", 4)
    x2.set("z", 5)
    m.merge(x2)
    expect(m.get("z")).toEqual(5)

    var x3 = new Map()
    x3.set({ y: 2 }, { z: 4 })
})

test("deepEqual map", () => {
    var x = new Map()
    x.set("x", 3)
    x.set("y", { z: 2 })

    var x2 = mobx.observable.map()
    x2.set("x", 3)
    x2.set("y", { z: 3 })

    expect(mobx.comparer.structural(x, x2)).toBe(false)
    x2.get("y").z = 2
    expect(mobx.comparer.structural(x, x2)).toBe(true)

    x2.set("z", 1)
    expect(mobx.comparer.structural(x, x2)).toBe(false)
    x2.delete("z")
    expect(mobx.comparer.structural(x, x2)).toBe(true)
    x2.delete("y")
    expect(mobx.comparer.structural(x, x2)).toBe(false)
})

test("798, cannot return observable map from computed prop", () => {
    // MWE: this is an anti pattern, yet should be possible in certain cases nonetheless..?
    // https://jsfiddle.net/7e6Ltscr/

    const form = function(settings) {
        var form = mobx.observable({
            reactPropsMap: mobx.observable.map({
                onSubmit: function() {}
            }),
            model: {
                value: "TEST"
            }
        })

        form.reactPropsMap.set("onSubmit", function() {})

        return form
    }

    const customerSearchStore = function() {
        var customerSearchStore = mobx.observable({
            customerType: "RUBY",
            searchTypeFormStore() {
                return form(customerSearchStore.customerType)
            },
            customerSearchType() {
                return form(customerSearchStore.searchTypeFormStore.model.value)
            }
        })
        return customerSearchStore
    }
    var cs = customerSearchStore()

    expect(() => {
        const x = Object.assign({}, cs.customerSearchType)
        // console.log(x)
    }).not.toThrow()
})

test("869, deeply observable map should make added items observables as well", () => {
    var store = {
        map_deep1: mobx.observable(new Map()),
        map_deep2: mobx.observable.map()
    }

    expect(mobx.isObservable(store.map_deep1)).toBeTruthy()
    expect(mobx.isObservableMap(store.map_deep1)).toBeTruthy()
    expect(mobx.isObservable(store.map_deep2)).toBeTruthy()
    expect(mobx.isObservableMap(store.map_deep2)).toBeTruthy()

    store.map_deep2.set("a", [])
    expect(mobx.isObservable(store.map_deep2.get("a"))).toBeTruthy()

    store.map_deep1.set("a", [])
    expect(mobx.isObservable(store.map_deep1.get("a"))).toBeTruthy()
})

test("using deep map", () => {
    var store = {
        map_deep: mobx.observable(new Map())
    }

    // Creating autorun triggers one observation, hence -1
    let observed = -1
    mobx.autorun(function() {
        // Use the map, to observe all changes
        var _ = mobx.toJS(store.map_deep)
        observed++
    })

    store.map_deep.set("shoes", [])
    expect(observed).toBe(1)

    store.map_deep.get("shoes").push({ color: "black" })
    expect(observed).toBe(2)

    store.map_deep.get("shoes")[0].color = "red"
    expect(observed).toBe(3)
})

test("issue 893", () => {
    const m = mobx.observable.map()
    const keys = ["constructor", "toString", "assertValidKey", "isValidKey", "toJSON", "toJS"]
    for (let key of keys) {
        expect(m.get(key)).toBe(undefined)
    }
})

test("work with 'toString' key", () => {
    const m = mobx.observable.map()
    expect(m.get("toString")).toBe(undefined)
    m.set("toString", "test")
    expect(m.get("toString")).toBe("test")
})

test("issue 940, should not be possible to change maps outside strict mode", () => {
    mobx.configure({ enforceActions: true })

    try {
        const m = mobx.observable.map()
        const d = mobx.autorun(() => mobx.values(m))

        expect(() => {
            m.set("x", 1)
        }).toThrowError(/Since strict-mode is enabled/)

        d()
    } finally {
        mobx.configure({ enforceActions: false })
    }
})

test("issue 1243, .replace should not trigger change on unchanged values", () => {
    const m = mobx.observable.map({ a: 1, b: 2, c: 3 })

    let recomputeCount = 0
    let visitedComputed = false
    const computedValue = mobx.computed(() => {
        recomputeCount++
        return m.get("a")
    })

    const d = mobx.autorun(() => {
        computedValue.get()
    })

    // recompute should happen once by now, due to the autorun
    expect(recomputeCount).toBe(1)

    // a hasn't changed, recompute should not happen
    m.replace({ a: 1, d: 5 })

    expect(recomputeCount).toBe(1)

    // this should cause a recompute
    m.replace({ a: 2 })
    expect(recomputeCount).toBe(2)

    // this should remove key a and cause a recompute
    m.replace({ b: 2 })
    expect(recomputeCount).toBe(3)

    m.replace([["a", 1]])
    expect(recomputeCount).toBe(4)

    const nativeMap = new Map()
    nativeMap.set("a", 2)
    m.replace(nativeMap)
    expect(recomputeCount).toBe(5)

    expect(() => {
        m.replace("not-an-object")
    }).toThrow(/Cannot get keys from 'not-an-object'/)

    d()
})

test("#1258 cannot replace maps anymore", () => {
    const items = mobx.observable.map()
    items.replace(mobx.observable.map())
})

test("can iterate maps", () => {
    const x = mobx.observable.map()
    const y = []
    const d = mobx.reaction(() => Array.from(x), items => y.push(items), { fireImmediately: true })

    x.set("a", "A")
    x.set("b", "B")
    expect(y).toEqual([[], [["a", "A"]], [["a", "A"], ["b", "B"]]])
    d()
})

function iteratorToArray(it) {
    const res = []
    while (true) {
        const r = it.next()
        if (!r.done) {
            res.push(r.value)
        } else {
            break
        }
    }
    return res
}

test("can iterate map - entries", () => {
    const x = mobx.observable.map()
    const y = []
    const d = mobx.reaction(() => iteratorToArray(x.entries()), items => y.push(items), {
        fireImmediately: true
    })

    x.set("a", "A")
    x.set("b", "B")
    expect(y).toEqual([[], [["a", "A"]], [["a", "A"], ["b", "B"]]])
    d()
})

test("can iterate map - keys", () => {
    const x = mobx.observable.map()
    const y = []
    const d = mobx.reaction(() => iteratorToArray(x.keys()), items => y.push(items), {
        fireImmediately: true
    })

    x.set("a", "A")
    x.set("b", "B")
    expect(y).toEqual([[], ["a"], ["a", "b"]])
    d()
})

test("can iterate map - values", () => {
    const x = mobx.observable.map()
    const y = []
    const d = mobx.reaction(() => iteratorToArray(x.values()), items => y.push(items), {
        fireImmediately: true
    })

    x.set("a", "A")
    x.set("b", "B")
    expect(y).toEqual([[], ["A"], ["A", "B"]])
    d()
})

test("NaN as map key", function() {
    var a = map(new Map([[NaN, 0]]))
    expect(a.has(NaN)).toBe(true)
    expect(a.get(NaN)).toBe(0)
    a.set(NaN, 1)
    a.merge(map(new Map([[NaN, 2]])))
    expect(a.get(NaN)).toBe(2)
    expect(a.size).toBe(1)
})

test("maps.values, keys and maps.entries are iterables", () => {
    const x = mobx.observable.map({ x: 1, y: 2 })
    expect(Array.from(x.entries())).toEqual([["x", 1], ["y", 2]])
    expect(Array.from(x.values())).toEqual([1, 2])
    expect(Array.from(x.keys())).toEqual(["x", "y"])
})

test("toStringTag", () => {
    const x = mobx.observable.map({ x: 1, y: 2 })
    expect(x[Symbol.toStringTag]).toBe("Map")
    expect(Object.prototype.toString.call(x)).toBe("[object Map]")
})

test("verify #1524", () => {
    class Store {
        @mobx.observable articles = new Map()
    }

    const store = new Store()
    expect(typeof store.articles.observe === "function").toBe(true)
})
