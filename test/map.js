"use strict"

var mobx = require("..")
var map = mobx.map
var autorun = mobx.autorun
var iterall = require("iterall")

test("map crud", function() {
    mobx.extras.getGlobalState().mobxGuid = 0 // hmm dangerous reset?

    var events = []
    var m = map({ a: 1 })
    m.observe(function(changes) {
        events.push(changes)
    })

    expect(m.has("a")).toBe(true)
    expect(m.has("b")).toBe(false)
    expect(m.get("a")).toBe(1)
    expect(m.get("b")).toBe(undefined)
    expect(m.size).toBe(1)

    m.set("a", 2)
    expect(m.has("a")).toBe(true)
    expect(m.get("a")).toBe(2)

    m.set("b", 3)
    expect(m.has("b")).toBe(true)
    expect(m.get("b")).toBe(3)

    expect(m.keys()).toEqual(["a", "b"])
    expect(m.values()).toEqual([2, 3])
    expect(m.entries()).toEqual([["a", 2], ["b", 3]])
    expect(m.toJS()).toEqual({ a: 2, b: 3 })
    expect(JSON.stringify(m)).toEqual('{"a":2,"b":3}')
    expect(m.toString()).toEqual("ObservableMap@1[{ a: 2, b: 3 }]")
    expect(m.size).toBe(2)

    m.clear()
    expect(m.keys()).toEqual([])
    expect(m.values()).toEqual([])
    expect(m.toJS()).toEqual({})
    expect(m.toString()).toEqual("ObservableMap@1[{  }]")
    expect(m.size).toBe(0)

    expect(m.has("a")).toBe(false)
    expect(m.has("b")).toBe(false)
    expect(m.get("a")).toBe(undefined)
    expect(m.get("b")).toBe(undefined)

    function removeObjectProp(item) {
        delete item.object
        return item
    }
    expect(events.map(removeObjectProp)).toEqual([
        {
            type: "update",
            name: "a",
            oldValue: 1,
            newValue: 2
        },
        {
            type: "add",
            name: "b",
            newValue: 3
        },
        {
            type: "delete",
            name: "a",
            oldValue: 2
        },
        {
            type: "delete",
            name: "b",
            oldValue: 3
        }
    ])
})

test("map merge", function() {
    var a = map({ a: 1, b: 2, c: 2 })
    var b = map({ c: 3, d: 4 })
    a.merge(b)
    expect(a.toJS()).toEqual({ a: 1, b: 2, c: 3, d: 4 })
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
    expect(a.keys()).toEqual(["y", "z"])
})

test("initialize with entries", function() {
    var a = map([["a", 1], ["b", 2]])
    expect(a.toJS()).toEqual({ a: 1, b: 2 })
})

test("initialize with empty value", function() {
    var a = map()
    var b = map({})
    var c = map([])

    a.set("0", 0)
    b.set("0", 0)
    c.set("0", 0)

    expect(a.toJS()).toEqual({ "0": 0 })
    expect(b.toJS()).toEqual({ "0": 0 })
    expect(c.toJS()).toEqual({ "0": 0 })
})

test("observe collections", function() {
    var x = map()
    var keys, values, entries

    autorun(function() {
        keys = x.keys()
    })
    autorun(function() {
        values = x.values()
    })
    autorun(function() {
        entries = x.entries()
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

test.skip("asStructure", function(t) {
    var x = mobx.observable.structureMap({})
    var triggerCount = 0
    var value = null

    x.set("a", { b: { c: 1 } })
    autorun(function() {
        triggerCount += 1
        value = x.get("a").b.c
    })

    expect(triggerCount).toBe(1)
    expect(value).toBe(1)

    x.get("a").b.c = 1
    x.get("a").b = { c: 1 }
    x.set("a", { b: { c: 1 } })

    expect(triggerCount).toBe(1)
    expect(value).toBe(1)

    x.get("a").b.c = 2
    expect(triggerCount).toBe(2)
    expect(value).toBe(2)

    t.end()
})

test("cleanup", function() {
    var x = map({ a: 1 })

    var aValue
    var disposer = autorun(function() {
        aValue = x.get("a")
    })

    var observable = x._data.a

    expect(aValue).toBe(1)
    expect(observable.observers.length).toBe(1)
    expect(x._hasMap.a.observers.length).toBe(1)

    expect(x.delete("a")).toBe(true)
    expect(x.delete("not-existing")).toBe(false)

    expect(aValue).toBe(undefined)
    expect(observable.observers.length).toBe(0)
    expect(x._hasMap.a.observers.length).toBe(1)

    x.set("a", 2)
    observable = x._data.a

    expect(aValue).toBe(2)
    expect(observable.observers.length).toBe(1)
    expect(x._hasMap.a.observers.length).toBe(1)

    disposer()
    expect(aValue).toBe(2)
    expect(observable.observers.length).toBe(0)
    expect(x._hasMap.a.observers.length).toBe(0)
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
        myCalculatedProp: mobx.computed(function() {
            if (myObservable.myMap.has("myId"))
                return myObservable.myMap.get("myId").myProp + " calculated"
            return undefined
        })
    })
    // the error only happens if the value is observed
    mobx.autorun(function() {
        myObservable.myMap.values().forEach(function(value) {
            console.log("x")
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
    expect(function() {
        x.set({})
    }).toThrow()
})

test("map modifier", () => {
    var x = mobx.observable.map({ a: 1 })
    expect(x instanceof mobx.ObservableMap).toBe(true)
    expect(mobx.isObservableMap(x)).toBe(true)
    expect(x.get("a")).toBe(1)
    x.set("b", {})
    expect(mobx.isObservableObject(x.get("b"))).toBe(true)

    x = mobx.observable.map([["a", 1]])
    expect(x instanceof mobx.ObservableMap).toBe(true)
    expect(x.get("a")).toBe(1)

    x = mobx.observable.map()
    expect(x instanceof mobx.ObservableMap).toBe(true)
    expect(x.keys()).toEqual([])

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

    x = mobx.observable.shallowMap({ a: { c: 3 } })
    expect(mobx.isObservableObject(x.get("a"))).toBe(false)
    x.set("b", { d: 4 })
    expect(mobx.isObservableObject(x.get("b"))).toBe(false)

    x = mobx.observable({ a: mobx.observable.shallowMap({ b: {} }) })
    expect(mobx.isObservableObject(x)).toBe(true)
    expect(mobx.isObservableMap(x.a)).toBe(true)
    expect(mobx.isObservableObject(x.a.get("b"))).toBe(false)
    x.a.set("e", {})
    expect(mobx.isObservableObject(x.a.get("e"))).toBe(false)
})

test("256, map.clear should not be tracked", () => {
    var x = new mobx.ObservableMap({ a: 3 })
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
    expect(x.keys()).toEqual(["a", "b"])

    y.set("c", 4)
    expect(c).toBe(2)
    expect(x.keys()).toEqual(["a", "b", "c"])

    x.set("d", 5)
    expect(c).toBe(2)
    expect(x.keys()).toEqual(["a", "b", "c", "d"])

    d()
})

test("308, map keys should be coerced to strings correctly", () => {
    var m = mobx.map()
    m.set(1, true) // => "[mobx.map { 1: true }]"
    m.delete(1) // => "[mobx.map { }]"
    expect(m.keys()).toEqual([])

    m.set(1, true) // => "[mobx.map { 1: true }]"
    m.delete("1") // => "[mobx.map { 1: undefined }]"
    expect(m.keys()).toEqual([])

    m.set(1, true) // => "[mobx.map { 1: true, 1: true }]"
    m.delete("1") // => "[mobx.map { 1: undefined, 1: undefined }]"
    expect(m.keys()).toEqual([])

    m.set(true, true)
    expect(m.get("true")).toBe(true)
    m.delete(true)
    expect(m.keys()).toEqual([])
})

test("map should support iterall / iterable ", () => {
    var a = mobx.map({ a: 1, b: 2 })

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
    expect(m.entries()).toEqual([["x", 3], ["y", 2]])

    var x2 = new Map()
    x2.set("y", 4)
    x2.set("z", 5)
    m.merge(x2)
    expect(m.get("z")).toEqual(5)

    var x3 = new Map()
    x3.set({ y: 2 }, { z: 4 })

    expect(() => mobx.observable.shallowMap(x3)).toThrowError(
        /only strings, numbers and booleans are accepted as key in observable maps/
    )
})

test("deepEqual map", () => {
    var x = new Map()
    x.set("x", 3)
    x.set("y", { z: 2 })

    var x2 = mobx.observable.map()
    x2.set("x", 3)
    x2.set("y", { z: 3 })

    expect(mobx.extras.deepEqual(x, x2)).toBe(false)
    x2.get("y").z = 2
    expect(mobx.extras.deepEqual(x, x2)).toBe(true)

    x2.set("z", 1)
    expect(mobx.extras.deepEqual(x, x2)).toBe(false)
    x2.delete("z")
    expect(mobx.extras.deepEqual(x, x2)).toBe(true)
    x2.delete("y")
    expect(mobx.extras.deepEqual(x, x2)).toBe(false)
})

test("798, cannot return observable map from computed prop", () => {
    // MWE: this is an anti pattern, yet should be possible in certain cases nonetheless..?
    // https://jsfiddle.net/7e6Ltscr/

    const form = function(settings) {
        var form = mobx.observable({
            reactPropsMap: mobx.observable.map({
                onSubmit: function() {
                    console.log("onSubmit init!")
                }
            }),
            model: {
                value: "TEST"
            }
        })

        form.reactPropsMap.set("onSubmit", function() {
            console.log("onSubmit overwritten!")
        })

        return form
    }

    const customerSearchStore = function() {
        var customerSearchStore = mobx.observable({
            customerType: "RUBY",
            searchTypeFormStore: mobx.computed(function() {
                return form(customerSearchStore.customerType)
            }),
            customerSearchType: mobx.computed(function() {
                return form(customerSearchStore.searchTypeFormStore.model.value)
            })
        })
        return customerSearchStore
    }
    var cs = customerSearchStore()

    expect(() => {
        console.log(cs.customerSearchType)
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
    mobx.useStrict(true)

    const m = mobx.observable.map()
    const d = mobx.autorun(() => m.values())

    expect(() => {
		m.set("x", 1)
	}).toThrowError(/Since strict-mode is enabled/)

    d();

    mobx.useStrict(false)
})

test("issue 1243, .replace should not trigger change on unchanged values", () => {
    const m = mobx.observable.map({ a: 1, b: 2, c: 3 })

    let recomputeCount = 0
    let visitedComputed = false
    const computedValue = mobx.computed(() => {
        recomputeCount++
        return m.get('a')
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

    m.replace([['a', 1]])
    expect(recomputeCount).toBe(4)

    const nativeMap = new Map()
    nativeMap.set('a', 2)
    m.replace(nativeMap)
    expect(recomputeCount).toBe(5)

    expect(() => {
        m.replace('not-an-object')
    }).toThrow()

    d()
})

test("#1258 cannot replace maps anymore", () => {
    const items = mobx.observable.map()
    items.replace(mobx.observable.map())
})
