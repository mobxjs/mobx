const mobx = require("../../../src/mobx")
const { autorun, keys, when, set, remove, values, entries, reaction, observable, has, get } = mobx

test("keys should be observable when extending", () => {
    const todos = observable({})

    const todoTitles = []
    reaction(
        () => keys(todos).map(key => `${key}: ${todos[key]}`),
        titles => todoTitles.push(titles.join(","))
    )

    mobx.set(todos, {
        lewis: "Read Lewis",
        chesterton: "Be mind blown by Chesterton"
    })
    expect(todoTitles).toEqual(["lewis: Read Lewis,chesterton: Be mind blown by Chesterton"])

    mobx.set(todos, { lewis: "Read Lewis twice" })
    mobx.set(todos, { coffee: "Grab coffee" })
    expect(todoTitles).toEqual([
        "lewis: Read Lewis,chesterton: Be mind blown by Chesterton",
        "lewis: Read Lewis twice,chesterton: Be mind blown by Chesterton",
        "lewis: Read Lewis twice,chesterton: Be mind blown by Chesterton,coffee: Grab coffee"
    ])
})

test("toJS respects key changes", () => {
    const todos = observable({})

    const serialized = []
    mobx.autorun(() => {
        serialized.push(JSON.stringify(mobx.toJS(todos)))
    })

    mobx.set(todos, {
        lewis: "Read Lewis",
        chesterton: "Be mind blown by Chesterton"
    })
    mobx.set(todos, { lewis: "Read Lewis twice" })
    mobx.set(todos, { coffee: "Grab coffee" })
    expect(serialized).toEqual([
        "{}",
        '{"lewis":"Read Lewis","chesterton":"Be mind blown by Chesterton"}',
        '{"lewis":"Read Lewis twice","chesterton":"Be mind blown by Chesterton"}',
        '{"lewis":"Read Lewis twice","chesterton":"Be mind blown by Chesterton","coffee":"Grab coffee"}'
    ])
})

test("keys(object), values(object), entries(object)", () => {
    const todos = observable({})
    const plain = {}
    const keysSnapshots = []
    const valuesSnapshots = []
    const entriesSnapshots = []
    const expectedKeysSnapshots = []
    const expectedValuesSnapshots = []
    const expectedEntriesSnapshots = []

    const s1 = Symbol()
    const s2 = Symbol()

    function expectEquality() {
        expect(todos).toEqual(plain)
    }

    function expectKeysReaction() {
        expectedKeysSnapshots.push(Object.keys(plain))
    }

    function expectValuesReaction() {
        expectedValuesSnapshots.push(Object.values(plain))
    }

    function expectEntriesReaction() {
        expectedEntriesSnapshots.push(Object.entries(plain))
    }

    reaction(
        () => keys(todos),
        result => keysSnapshots.push(result)
    )

    reaction(
        () => values(todos),
        result => valuesSnapshots.push(result)
    )

    reaction(
        () => entries(todos),
        result => entriesSnapshots.push(result)
    )

    expectEquality()
    // add
    set(todos, "k1", 1)
    plain["k1"] = 1
    expectEquality()
    expectKeysReaction()
    expectValuesReaction()
    expectEntriesReaction()
    // add symbol
    set(todos, s1, 2)
    plain[s1] = 2
    expectEquality()
    // see ObservableObjectAdministration.keys() for explanation
    expectKeysReaction()
    expectValuesReaction()
    expectEntriesReaction()
    // delete non-existent
    remove(todos, "-")
    delete plain["-"]
    expectEquality()
    // delete non-existent symbol
    remove(todos, Symbol())
    delete plain[Symbol()]
    expectEquality()
    // add second
    set(todos, "k2", 3)
    plain["k2"] = 3
    expectEquality()
    expectKeysReaction()
    expectValuesReaction()
    expectEntriesReaction()
    // add second symbol
    set(todos, s2, 4)
    plain[s2] = 4
    expectEquality()
    // see ObservableObjectAdministration.keys() for explanation
    expectKeysReaction()
    expectValuesReaction()
    expectEntriesReaction()
    // update
    set(todos, "k1", 11)
    plain["k1"] = 11
    expectEquality()
    expectValuesReaction()
    expectEntriesReaction()
    // update symbol
    set(todos, s1, 22)
    plain[s1] = 22
    expectEquality()
    // delete
    remove(todos, "k1")
    delete plain["k1"]
    expectEquality()
    expectKeysReaction()
    expectValuesReaction()
    expectEntriesReaction()
    // delete symbol
    remove(todos, s1)
    delete plain[s1]
    expectEquality()
    // see ObservableObjectAdministration.keys() for explanation
    expectKeysReaction()
    expectValuesReaction()
    expectEntriesReaction()

    expect(keysSnapshots).toEqual(expectedKeysSnapshots)
    expect(valuesSnapshots).toEqual(expectedValuesSnapshots)
    expect(entriesSnapshots).toEqual(expectedEntriesSnapshots)
})

test("values(map)", () => {
    const todos = observable.map({})
    const snapshots = []

    reaction(
        () => values(todos),
        values => snapshots.push(values)
    )

    expect(has(todos, "x")).toBe(false)
    expect(get(todos, "x")).toBe(undefined)
    set(todos, "x", 3)
    expect(has(todos, "x")).toBe(true)
    expect(get(todos, "x")).toBe(3)
    remove(todos, "y")
    set(todos, "z", 4)
    set(todos, "x", 5)
    remove(todos, "z")

    expect(snapshots).toEqual([[3], [3, 4], [5, 4], [5]])
})

test("values(map) - symbols", () => {
    const todos = observable.map({})
    const snapshots = []
    const x = Symbol()
    const y = Symbol()
    const z = Symbol("z")

    reaction(
        () => values(todos),
        values => snapshots.push(values)
    )

    expect(has(todos, x)).toBe(false)
    expect(get(todos, x)).toBe(undefined)
    set(todos, x, 3)
    expect(has(todos, x)).toBe(true)
    expect(get(todos, x)).toBe(3)
    remove(todos, y)
    set(todos, z, 4)
    set(todos, x, 5)
    remove(todos, z)

    expect(snapshots).toEqual([[3], [3, 4], [5, 4], [5]])
})

test("entries(map)", () => {
    const todos = observable.map({})
    const snapshots = []

    reaction(
        () => entries(todos),
        entries => snapshots.push(entries)
    )

    expect(has(todos, "x")).toBe(false)
    expect(get(todos, "x")).toBe(undefined)
    set(todos, "x", 3)
    expect(has(todos, "x")).toBe(true)
    expect(get(todos, "x")).toBe(3)
    remove(todos, "y")
    set(todos, "z", 4)
    set(todos, "x", 5)
    remove(todos, "z")

    expect(snapshots).toEqual([
        [["x", 3]],
        [
            ["x", 3],
            ["z", 4]
        ],
        [
            ["x", 5],
            ["z", 4]
        ],
        [["x", 5]]
    ])
})

test("entries(map) - symbols", () => {
    const todos = observable.map({})
    const snapshots = []
    const x = Symbol()
    const y = Symbol()
    const z = Symbol("z")

    reaction(
        () => entries(todos),
        entries => snapshots.push(entries)
    )

    expect(has(todos, x)).toBe(false)
    expect(get(todos, x)).toBe(undefined)
    set(todos, x, 3)
    expect(has(todos, x)).toBe(true)
    expect(get(todos, x)).toBe(3)
    remove(todos, y)
    set(todos, z, 4)
    set(todos, x, 5)
    remove(todos, z)

    expect(snapshots).toEqual([
        [[x, 3]],
        [
            [x, 3],
            [z, 4]
        ],
        [
            [x, 5],
            [z, 4]
        ],
        [[x, 5]]
    ])
})

test("keys(map)", () => {
    const todos = observable.map({ a: 3 })
    const snapshots = []

    reaction(
        () => keys(todos),
        keys => snapshots.push(keys)
    )

    set(todos, "x", 3)
    remove(todos, "y")
    set(todos, "z", 4)
    set(todos, "x", 5)
    remove(todos, "z")
    remove(todos, "a")

    expect(snapshots).toEqual([["a", "x"], ["a", "x", "z"], ["a", "x"], ["x"]])
})

test("keys(map) - symbols", () => {
    const snapshots = []
    const x = Symbol()
    const y = Symbol()
    const z = Symbol("z")
    const a = Symbol()
    const todos = observable.map({ [a]: 3 })

    reaction(
        () => keys(todos),
        keys => snapshots.push(keys)
    )

    set(todos, x, 3)
    remove(todos, y)
    set(todos, z, 4)
    set(todos, x, 5)
    remove(todos, z)
    remove(todos, a)

    expect(snapshots).toEqual([[a, x], [a, x, z], [a, x], [x]])
})

test("values(array)", () => {
    const todos = observable.array()
    const snapshots = []

    reaction(
        () => values(todos),
        values => snapshots.push(values)
    )

    expect(has(todos, 0)).toBe(false)
    expect(get(todos, 0)).toBe(undefined)
    set(todos, 0, 2)
    expect(has(todos, 0)).toBe(true)
    expect(get(todos, 0)).toBe(2)

    set(todos, "1", 4)
    set(todos, 3, 4)
    set(todos, 1, 3)
    remove(todos, 2)
    remove(todos, "0")

    expect(snapshots).toEqual([
        [2],
        [2, 4],
        [2, 4, undefined, 4],
        [2, 3, undefined, 4],
        [2, 3, 4],
        [3, 4]
    ])
})

test("entries(array)", () => {
    const todos = observable.array()
    const snapshots = []

    reaction(
        () => entries(todos),
        entries => snapshots.push(entries)
    )

    expect(has(todos, 0)).toBe(false)
    expect(get(todos, 0)).toBe(undefined)
    set(todos, 0, 2)
    expect(has(todos, 0)).toBe(true)
    expect(get(todos, 0)).toBe(2)

    set(todos, "1", 4)
    set(todos, 3, 4)
    set(todos, 1, 3)
    remove(todos, 2)
    remove(todos, "0")

    expect(snapshots).toEqual([
        [[0, 2]],
        [
            [0, 2],
            [1, 4]
        ],
        [
            [0, 2],
            [1, 4],
            [2, undefined],
            [3, 4]
        ],
        [
            [0, 2],
            [1, 3],
            [2, undefined],
            [3, 4]
        ],
        [
            [0, 2],
            [1, 3],
            [2, 4]
        ],
        [
            [0, 3],
            [1, 4]
        ]
    ])
})

test("keys(array)", () => {
    const todos = observable.array()
    const snapshots = []

    reaction(
        () => keys(todos),
        keys => snapshots.push(keys)
    )

    set(todos, 0, 2)
    set(todos, "1", 4)
    set(todos, 3, 4)
    set(todos, 1, 3)
    remove(todos, 2)
    remove(todos, "0")

    expect(snapshots).toEqual([[0], [0, 1], [0, 1, 2, 3], [0, 1, 2, 3], [0, 1, 2], [0, 1]])
})

test("observe & intercept", () => {
    let events = []
    const todos = observable(
        {
            a: { title: "get coffee" }
        },
        {},
        {
            deep: false,
            name: "TestObject" // stable name for snapshot
        }
    )
    mobx.observe(todos, c => {
        events.push({ observe: { ...c, object: "skip" } })
    })
    const d = mobx.intercept(todos, c => {
        events.push({ intercept: { ...c, object: "skip" } })
        return null // no addition!
    })

    set(todos, { b: { title: "get tea" } })
    remove(todos, "a")
    expect(events).toMatchSnapshot()
    expect(mobx.toJS(todos)).toEqual({
        a: { title: "get coffee" }
    })

    events.splice(0)
    d()
    set(todos, { b: { title: "get tea" } })
    remove(todos, "a")
    expect(events).toMatchSnapshot()
    expect(mobx.toJS(todos)).toEqual({
        b: { title: "get tea" }
    })
})

test("observe & intercept set called multiple times", () => {
    const a = mobx.observable({}, {}, { name: "TestObject" }) // stable name for snapshot
    const interceptLogs = []
    const observeLogs = []

    mobx.intercept(a, change => {
        interceptLogs.push(`${change.name}: ${change.newValue}`)
        return change
    })
    mobx.observe(a, change => observeLogs.push(`${change.name}: ${change.newValue}`))

    mobx.set(a, "x", 0)
    a.x = 1
    mobx.set(a, "x", 2)

    expect(interceptLogs).toEqual(["x: 0", "x: 1", "x: 2"])
    expect(observeLogs).toEqual(["x: 0", "x: 1", "x: 2"])
})

test("dynamically adding properties should preserve the original modifiers of an object", () => {
    const todos = observable.object(
        {
            a: { title: "get coffee" }
        },
        {},
        { deep: false }
    )
    expect(mobx.isObservable(todos.a)).toBe(false)
    set(todos, { b: { title: "get tea" } })
    expect(mobx.isObservable(todos.b)).toBe(false)
})

test("has and get are reactive", async () => {
    const todos = observable({})

    const p1 = when(() => has(todos, "x"))
    const p2 = when(() => get(todos, "y") === 3)

    setTimeout(() => {
        set(todos, { x: false, y: 3 })
    }, 100)

    await p1
    await p2
})

test("computed props are considered part of collections", () => {
    const x = observable({
        get y() {
            return 3
        }
    })
    expect(mobx.isComputedProp(x, "y")).toBe(true)
    expect(x.y).toBe(3)
    expect(has(x, "y")).toBe(true)
    expect(get(x, "y")).toBe(3)
    expect(keys(x)).toEqual([])
    expect(values(x)).toEqual([])
    expect(entries(x)).toEqual([])
})

test("#1739 - delete and undelete should work", () => {
    const x = observable({})

    const events = []
    autorun(() => {
        events.push(has(x, "a"))
    })

    set(x, "a", 1)
    set(x, "a", 2)
    remove(x, "a")
    set(x, "a", 2)
    remove(x, "a")
    set(x, "a", 3)
    expect(events).toEqual([false, true, false, true, false, true])
})

test("keys(set)", () => {
    const todos = observable.set([1])
    const snapshots = []

    reaction(
        () => keys(todos),
        keys => snapshots.push(keys)
    )

    set(todos, 2)
    remove(todos, 2)
    set(todos, 3)
    set(todos, 4)
    remove(todos, 3)

    expect(snapshots).toEqual([[1, 2], [1], [1, 3], [1, 3, 4], [1, 4]])
})

test("defineProperty - configurable: false", () => {
    const obj = mobx.observable({})
    const desc = {
        enumerable: true,
        configurable: false,
        writable: true,
        value: 0
    }
    mobx.defineProperty(obj, "foo", desc)
    expect(Object.getOwnPropertyDescriptor(obj, "foo")).toEqual(desc)
    expect(mobx.isObservableProp(obj, "foo")).toBe(false)
    obj.foo++
    expect(obj.foo).toBe(1)
    expect(() => mobx.extendObservable(obj, { foo: 0 })).toThrow(TypeError)
    expect(() => mobx.makeObservable(obj, { foo: mobx.observable })).toThrow(TypeError)
    expect(() => mobx.defineProperty(obj, "foo", { configurable: false })).toThrow(TypeError)
})

test("defineProperty - writable: false", () => {
    const obj = mobx.observable({})
    const desc = {
        enumerable: true,
        configurable: true,
        writable: false,
        value: 0
    }
    mobx.defineProperty(obj, "foo", desc)
    expect(Object.getOwnPropertyDescriptor(obj, "foo")).toEqual(desc)
    expect(mobx.isObservableProp(obj, "foo")).toBe(false)
    expect(() => obj.foo++).toThrow(TypeError)
    mobx.extendObservable(obj, { foo: 0 })
    expect(mobx.isObservableProp(obj, "foo")).toBe(true)
    obj.foo++
    expect(obj.foo).toBe(1)
})

test("defineProperty - redefine observable", () => {
    const obj = mobx.observable({ foo: 0 })
    expect(mobx.isObservableProp(obj, "foo")).toBe(true)
    const desc = {
        enumerable: true,
        configurable: true,
        writable: false,
        value: 0
    }
    mobx.defineProperty(obj, "foo", desc)
    expect(Object.getOwnPropertyDescriptor(obj, "foo")).toEqual(desc)
    expect(mobx.isObservableProp(obj, "foo")).toBe(false)
})

test("defineProperty notifies keys observers", () => {
    const obj = mobx.observable({})
    let reactionCount = 0
    reaction(
        () => mobx.keys(obj),
        () => reactionCount++
    )

    const desc = {
        enumerable: true,
        configurable: true,
        writable: true,
        value: 0
    }
    mobx.defineProperty(obj, "foo", desc)
    expect(Object.getOwnPropertyDescriptor(obj, "foo")).toEqual(desc)
    expect(mobx.isObservableProp(obj, "foo")).toBe(false)
    expect(reactionCount).toBe(1)
    mobx.remove(obj, 'foo');
    expect(obj.hasOwnProperty("foo")).toBe(false)
    expect(reactionCount).toBe(2)
})
