"use strict"

const mobx = require("../../../src/mobx.ts")
const set = mobx.observable.set
const autorun = mobx.autorun
const iterall = require("iterall")

test("set crud", function () {
    const events = []
    const s = set([1])

    mobx.observe(s, change => {
        expect(change.observableKind).toEqual("set")
        delete change.observableKind
        delete change.debugObjectName
        events.push(change)
    })

    expect(s.has(1)).toBe(true)
    expect(s.has("1")).toBe(false)
    expect(s.size).toBe(1)

    s.add("2")

    expect(s.has("2")).toBe(true)
    expect(s.size).toBe(2)
    expect(mobx.keys(s)).toEqual([1, "2"])
    expect(mobx.values(s)).toEqual([1, "2"])
    expect(mobx.entries(s)).toEqual([
        [1, 1],
        ["2", "2"]
    ])
    expect(Array.from(s)).toEqual([1, "2"])
    // TODO: fix! expect(mobx.toJS(s)).toEqual(new Set([1, "2"]))
    expect(s.toJSON()).toEqual([1, "2"])
    expect(s.toString()).toBe("[object ObservableSet]")

    s.replace(new Set([3]))

    expect(mobx.keys(s)).toEqual([3])
    expect(mobx.values(s)).toEqual([3])
    expect(s.size).toBe(1)
    expect(s.has(1)).toBe(false)
    expect(s.has("2")).toBe(false)
    expect(s.has(3)).toBe(true)

    s.replace(set([4]))

    expect(mobx.keys(s)).toEqual([4])
    expect(mobx.values(s)).toEqual([4])
    expect(s.size).toBe(1)
    expect(s.has(1)).toBe(false)
    expect(s.has("2")).toBe(false)
    expect(s.has(3)).toBe(false)
    expect(s.has(4)).toBe(true)

    expect(() => {
        s.replace("")
    }).toThrow(/Cannot initialize set from/)

    s.clear()
    expect(mobx.keys(s)).toEqual([])
    expect(mobx.values(s)).toEqual([])
    expect(s.size).toBe(0)
    expect(s.has(1)).toBe(false)
    expect(s.has("2")).toBe(false)
    expect(s.has(3)).toBe(false)
    expect(s.has(4)).toBe(false)

    expect(events).toEqual([
        { object: s, newValue: "2", type: "add" },
        { object: s, oldValue: 1, type: "delete" },
        { object: s, oldValue: "2", type: "delete" },
        { object: s, newValue: 3, type: "add" },
        { object: s, oldValue: 3, type: "delete" },
        { object: s, newValue: 4, type: "add" },
        { object: s, oldValue: 4, type: "delete" }
    ])
})

test("observe value", function () {
    const s = set()
    let hasX = false
    let hasY = false

    autorun(function () {
        hasX = s.has("x")
    })
    autorun(function () {
        hasY = s.has("y")
    })

    expect(hasX).toBe(false)

    s.add("x")
    expect(hasX).toBe(true)

    s.delete("x")
    expect(hasX).toBe(false)

    s.replace(["y"])
    expect(hasX).toBe(false)
    expect(hasY).toBe(true)
    expect(mobx.values(s)).toEqual(["y"])
})

test("observe collections", function () {
    const x = set()
    let keys, values, entries

    autorun(function () {
        keys = mobx.keys(x)
    })
    autorun(function () {
        values = Array.from(x.values())
    })
    autorun(function () {
        entries = Array.from(x.entries())
    })

    x.add("a")
    expect(keys).toEqual(["a"])
    expect(values).toEqual(["a"])
    expect(entries).toEqual([["a", "a"]])

    x.forEach(value => {
        expect(x.has(value)).toBe(true)
    })

    // should not retrigger:
    keys = null
    values = null
    entries = null
    x.add("a")
    expect(keys).toEqual(null)
    expect(values).toEqual(null)
    expect(entries).toEqual(null)

    x.add("b")
    expect(keys).toEqual(["a", "b"])
    expect(values).toEqual(["a", "b"])
    expect(entries).toEqual([
        ["a", "a"],
        ["b", "b"]
    ])

    x.delete("a")
    expect(keys).toEqual(["b"])
    expect(values).toEqual(["b"])
    expect(entries).toEqual([["b", "b"]])
})

test("set modifier", () => {
    const x = set([{ a: 1 }])
    const y = mobx.observable({ a: x })

    expect(mobx.isObservableSet(x)).toBe(true)
    expect(mobx.isObservableObject(y)).toBe(true)
    expect(mobx.isObservableObject(y.a)).toBe(false)
    expect(mobx.isObservableSet(y.a)).toBe(true)
})

test("cleanup", function () {
    const s = set(["a"])

    let hasA

    autorun(function () {
        hasA = s.has("a")
    })

    expect(hasA).toBe(true)
    expect(s.delete("a")).toBe(true)
    expect(s.delete("not-existing")).toBe(false)
    expect(hasA).toBe(false)
})

test("set should support iterall / iterable ", () => {
    const a = set([1, 2])

    function leech(iter) {
        const values = []
        let v
        do {
            v = iter.next()
            if (!v.done) values.push(v.value)
        } while (!v.done)
        return values
    }

    expect(iterall.isIterable(a)).toBe(true)

    expect(leech(iterall.getIterator(a))).toEqual([1, 2])

    expect(leech(a.entries())).toEqual([
        [1, 1],
        [2, 2]
    ])

    expect(leech(a.keys())).toEqual([1, 2])
    expect(leech(a.values())).toEqual([1, 2])
})

// Test support for [iterator-helpers](https://github.com/tc39/proposal-iterator-helpers)
test("esnext iterator helpers support", () => {
    const set = mobx.observable(
        new Set([
            [1, 2],
            [3, 4]
        ])
    )

    expect(Array.from(set.values().map(value => value))).toEqual([
        [1, 2],
        [3, 4]
    ])

    expect(Array.from(set.entries().map(([, value]) => value))).toEqual([
        [1, 2],
        [3, 4]
    ])

    expect(Array.from(set.values().take(1))).toEqual([[1, 2]])
    expect(Array.from(set.values().drop(1))).toEqual([[3, 4]])
    expect(Array.from(set.values().filter(value => value[0] === 3))).toEqual([[3, 4]])
    expect(Array.from(set.values().find(value => value[0] === 3))).toEqual([3, 4])
    expect(Array.from(set.values().flatMap(value => value))).toEqual([1, 2, 3, 4])

    expect(set.entries().toString()).toEqual("[object SetIterator]")
})

test("support for ES6 Set", () => {
    const x = new Set()
    x.add(1)
    x.add(2)

    const s = mobx.observable(x)
    expect(mobx.isObservableSet(s)).toBe(true)
    expect(Array.from(s)).toEqual([1, 2])
})

test("deepEqual set", () => {
    const x = new Set()
    x.add(1)
    x.add({ z: 1 })

    const x2 = mobx.observable.set()
    x2.add(1)
    x2.add({ z: 2 })

    expect(mobx.comparer.structural(x, x2)).toBe(false)
    x2.replace([1, { z: 1 }])
    expect(mobx.comparer.structural(x, x2)).toBe(true)
})

test("set.clear should not be tracked", () => {
    const x = set([1])
    let c = 0
    const d = mobx.autorun(() => {
        c++
        x.clear()
    })

    expect(c).toBe(1)
    x.add(2)
    expect(c).toBe(1)

    d()
})

test("toStringTag", () => {
    const x = set()
    expect(x[Symbol.toStringTag]).toBe("Set")
    expect(Object.prototype.toString.call(x)).toBe("[object Set]")
})

test("getAtom", () => {
    const x = set([1])
    expect(mobx.getAtom(x)).toBeTruthy()

    expect(mobx.isObservableSet(x)).toBeTruthy()
    expect(mobx.isObservable(x)).toBeTruthy()
})

test("observe", () => {
    const vals = []
    const x = set([1])
    mobx.observe(x, change => {
        delete change.debugObjectName
        vals.push(change)
    })
    x.add(2)
    x.add(1)
    expect(vals).toEqual([{ newValue: 2, object: x, type: "add", observableKind: "set" }])
})

test("toJS", () => {
    const x = mobx.observable({ x: 1 })
    const y = set([x, 1])

    const z = mobx.toJS(y)
    expect(z).toEqual(new Set([{ x: 1 }, 1]))
    expect(z.x).not.toBe(x)
    expect(mobx.isObservable(z.x)).toBeFalsy()
})

test("set.forEach is reactive", () => {
    let c = 0
    const s = set()

    autorun(() => {
        s.forEach(() => {})
        c++
    })

    s.add(1)
    s.add(2)
    expect(c).toBe(3)
})

describe("The Set object methods do what they are supposed to do", () => {
    const reactiveSet = set([1, 2, 3, 4, 5])

    test("with native Set", () => {
        const intersectionObservableResult = reactiveSet.intersection(new Set([1, 2, 6]))
        const unionObservableResult = reactiveSet.union(new Set([1, 2, 6]))
        const differenceObservableResult = reactiveSet.difference(new Set([1, 2, 3, 4, 5, 6, 7]))
        const symmetricDifferenceObservableResult = reactiveSet.symmetricDifference(new Set([3, 4]))
        const isSubsetOfObservableResult = reactiveSet.isSubsetOf(new Set([1, 2, 3]))
        const isSupersetOfObservableResult = reactiveSet.isSupersetOf(new Set([1, 2, 3, 4, 5, 6]))
        const isDisjointFromObservableResult = reactiveSet.isDisjointFrom(new Set([6, 7]))

        expect(intersectionObservableResult).toEqual(new Set([1, 2]))
        expect(unionObservableResult).toEqual(new Set([1, 2, 3, 4, 5, 6]))
        expect(differenceObservableResult).toEqual(new Set())
        expect(symmetricDifferenceObservableResult).toEqual(new Set([1, 2, 5]))
        expect(isSubsetOfObservableResult).toBeFalsy()
        expect(isSupersetOfObservableResult).toBeFalsy()
        expect(isDisjointFromObservableResult).toBeTruthy()
    })

    test("with ObservableSet #3919", () => {
        const intersectionObservableResult = reactiveSet.intersection(set([1, 2, 6]))
        const unionObservableResult = reactiveSet.union(set([1, 2, 6]))
        const differenceObservableResult = reactiveSet.difference(set([1, 2, 3, 4, 5, 6, 7]))
        const symmetricDifferenceObservableResult = reactiveSet.symmetricDifference(set([3, 4]))
        const isSubsetOfObservableResult = reactiveSet.isSubsetOf(set([1, 2, 3]))
        const isSupersetOfObservableResult = reactiveSet.isSupersetOf(set([1, 2, 3, 4, 5, 6]))
        const isDisjointFromObservableResult = reactiveSet.isDisjointFrom(set([6, 7]))

        expect(intersectionObservableResult).toEqual(new Set([1, 2]))
        expect(unionObservableResult).toEqual(new Set([1, 2, 3, 4, 5, 6]))
        expect(differenceObservableResult).toEqual(new Set())
        expect(symmetricDifferenceObservableResult).toEqual(new Set([1, 2, 5]))
        expect(isSubsetOfObservableResult).toBeFalsy()
        expect(isSupersetOfObservableResult).toBeFalsy()
        expect(isDisjointFromObservableResult).toBeTruthy()
    })

    test("with Set-like", () => {
        const intersectionObservableResult = reactiveSet.intersection(
            new Map([1, 2, 6].map(i => [i, i]))
        )
        const unionObservableResult = reactiveSet.union(new Map([1, 2, 6].map(i => [i, i])))
        const differenceObservableResult = reactiveSet.difference(
            new Map([1, 2, 3, 4, 5, 6, 7].map(i => [i, i]))
        )
        const symmetricDifferenceObservableResult = reactiveSet.symmetricDifference(
            new Map([3, 4].map(i => [i, i]))
        )
        const isSubsetOfObservableResult = reactiveSet.isSubsetOf(
            new Map([1, 2, 3].map(i => [i, i]))
        )
        const isSupersetOfObservableResult = reactiveSet.isSupersetOf(
            new Map([1, 2, 3, 4, 5, 6].map(i => [i, i]))
        )
        const isDisjointFromObservableResult = reactiveSet.isDisjointFrom(
            new Map([6, 7].map(i => [i, i]))
        )

        expect(intersectionObservableResult).toEqual(new Set([1, 2]))
        expect(unionObservableResult).toEqual(new Set([1, 2, 3, 4, 5, 6]))
        expect(differenceObservableResult).toEqual(new Set())
        expect(symmetricDifferenceObservableResult).toEqual(new Set([1, 2, 5]))
        expect(isSubsetOfObservableResult).toBeFalsy()
        expect(isSupersetOfObservableResult).toBeFalsy()
        expect(isDisjointFromObservableResult).toBeTruthy()
    })
})

describe("Observable Set methods are reactive", () => {
    let c = 0
    let s = set()

    beforeEach(() => {
        c = 0
        s = set()
    })

    test("Intersection method is reactive", () => {
        autorun(() => {
            s.intersection(new Set())
            c++
        })

        s.add(1)
        s.add(2)
        expect(c).toBe(3)
    })

    test("Union method is reactive", () => {
        autorun(() => {
            s.union(new Set())
            c++
        })

        s.add(1)
        s.add(2)
        expect(c).toBe(3)
    })

    test("Difference method is reactive", () => {
        autorun(() => {
            s.difference(new Set())
            c++
        })

        s.add(1)
        s.add(2)
        expect(c).toBe(3)
    })

    test("symmetricDifference method is reactive", () => {
        autorun(() => {
            s.symmetricDifference(new Set())
            c++
        })

        s.add(1)
        s.add(2)
        expect(c).toBe(3)
    })

    test("isSubsetOf method is reactive", () => {
        autorun(() => {
            s.isSubsetOf(new Set())
            c++
        })

        s.add(1)
        s.add(2)
        expect(c).toBe(3)
    })

    test("isSupersetOf method is reactive", () => {
        autorun(() => {
            s.isSupersetOf(new Set())
            c++
        })

        s.add(1)
        s.add(2)
        expect(c).toBe(3)
    })

    test("isDisjointFrom method is reactive", () => {
        autorun(() => {
            s.isDisjointFrom(new Set())
            c++
        })

        s.add(1)
        s.add(2)
        expect(c).toBe(3)
    })
})


describe("Observable Set interceptors", () => {

    let s = set()

    beforeEach(() => {
        s = set()
    })

    test("Add does not add value if interceptor returned no change", () => {
        mobx.intercept(s, (change) => {
            if(change.type === 'add' && change.newValue === 2) {
                return undefined;
            }

            return change;
        })

        s.add(1);
        s.add(2);

        expect([...s]).toStrictEqual([1]);


    })

    test("Add respects newValue from interceptor", () => {

        mobx.intercept(s, (change) => {
            if(change.type === 'add' && change.newValue === 2) {
                change.newValue = 10;
            }

            return change;
        })

        s.add(1);
        s.add(2);

        expect([...s]).toStrictEqual([1, 10])
    })


})