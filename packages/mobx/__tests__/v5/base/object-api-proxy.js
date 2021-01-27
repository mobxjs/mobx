const mobx = require("../../../src/mobx")
const { has, autorun, when, runInAction, reaction, observable } = mobx

test("keys should be observable when extending", () => {
    const todos = observable({})

    const todoTitles = []
    reaction(
        () => Object.keys(todos).map(key => `${key}: ${todos[key]}`),
        titles => todoTitles.push(titles.join(","))
    )

    runInAction(() => {
        Object.assign(todos, {
            lewis: "Read Lewis",
            chesterton: "Be mind blown by Chesterton"
        })
    })
    expect(todoTitles).toEqual(["lewis: Read Lewis,chesterton: Be mind blown by Chesterton"])

    Object.assign(todos, { lewis: "Read Lewis twice" })
    Object.assign(todos, { coffee: "Grab coffee" })
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

    runInAction(() => {
        Object.assign(todos, {
            lewis: "Read Lewis",
            chesterton: "Be mind blown by Chesterton"
        })
    })
    Object.assign(todos, { lewis: "Read Lewis twice" })
    Object.assign(todos, { coffee: "Grab coffee" })
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
        () => Object.keys(todos),
        result => keysSnapshots.push(result)
    )

    reaction(
        () => Object.values(todos),
        result => valuesSnapshots.push(result)
    )

    reaction(
        () => Object.entries(todos),
        result => entriesSnapshots.push(result)
    )

    expectEquality()
    // add
    todos["k1"] = 1
    plain["k1"] = 1
    expectEquality()
    expectKeysReaction()
    expectValuesReaction()
    expectEntriesReaction()
    // add symbol
    todos[s1] = 2
    plain[s1] = 2
    expectEquality()
    // see ObservableObjectAdministration.keys() for explanation
    expectKeysReaction()
    expectValuesReaction()
    expectEntriesReaction()
    // delete non-existent
    delete todos["-"]
    delete plain["-"]
    expectEquality()
    // delete non-existent symbol
    delete todos[Symbol()]
    delete plain[Symbol()]
    expectEquality()
    // add second
    todos["k2"] = 3
    plain["k2"] = 3
    expectEquality()
    expectKeysReaction()
    expectValuesReaction()
    expectEntriesReaction()
    // add second symbol
    todos[s2] = 4
    plain[s2] = 4
    expectEquality()
    // see ObservableObjectAdministration.keys() for explanation
    expectKeysReaction()
    expectValuesReaction()
    expectEntriesReaction()
    // update
    todos["k1"] = 11
    plain["k1"] = 11
    expectEquality()
    expectValuesReaction()
    expectEntriesReaction()
    // update symbol
    todos[s1] = 22
    plain[s1] = 22
    expectEquality()
    // delete
    delete todos["k1"]
    delete plain["k1"]
    expectEquality()
    expectKeysReaction()
    expectValuesReaction()
    expectEntriesReaction()
    // delete symbol
    delete todos[s1]
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

test("dynamically adding properties should preserve the original modifiers of an object", () => {
    const todos = observable.object(
        {
            a: { title: "get coffee" }
        },
        {},
        { deep: false }
    )
    expect(mobx.isObservable(todos.a)).toBe(false)
    Object.assign(todos, { b: { title: "get tea" } })
    expect(mobx.isObservable(todos.b)).toBe(false)
})

test("has and get are reactive", async () => {
    const todos = observable({})

    const p1 = when(() => {
        return "x" in todos
    })
    const p2 = when(() => {
        return todos.y === 3
    })

    setTimeout(() => {
        Object.assign(todos, { x: false, y: 3 })
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
    expect("y" in x).toBe(true) // `in` also checks proto type, so should return true!
    expect(Object.keys(x)).toEqual([])
    expect(Object.values(x)).toEqual([])
    expect(Object.entries(x)).toEqual([])
})

test("#1739 - delete and undelete should work", () => {
    const x = observable({})

    const events = []
    autorun(() => {
        // events.push("a" in x)
        events.push(has(x, "a"))
    })

    x.a = 1
    x.a++
    delete x.a
    x.a = 5
    delete x.a
    x.a = 5
    expect(events).toEqual([false, true, false, true, false, true])
})

test("defineProperty - configurable: false", () => {
    const obj = mobx.observable({})
    const desc = {
        enumerable: true,
        configurable: false,
        writable: true,
        value: 0
    }
    Object.defineProperty(obj, "foo", desc)
    expect(Object.getOwnPropertyDescriptor(obj, "foo")).toEqual(desc)
    expect(mobx.isObservableProp(obj, "foo")).toBe(false)
    obj.foo++
    expect(obj.foo).toBe(1)
    expect(() => mobx.extendObservable(obj, { foo: 0 })).toThrow(TypeError)
    expect(() => mobx.makeObservable(obj, { foo: mobx.observable })).toThrow(TypeError)
    expect(() => Object.defineProperty(obj, "foo", { configurable: false })).toThrow(TypeError)
})

test("defineProperty - writable: false", () => {
    const obj = mobx.observable({})
    const desc = {
        enumerable: true,
        configurable: true,
        writable: false,
        value: 0
    }
    Object.defineProperty(obj, "foo", desc)
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
    Object.defineProperty(obj, "foo", desc)
    expect(Object.getOwnPropertyDescriptor(obj, "foo")).toEqual(desc)
    expect(mobx.isObservableProp(obj, "foo")).toBe(false)
})

test("defineProperty notifies keys observers", () => {
    const obj = mobx.observable({})
    let reactionCount = 0
    reaction(
        () => Object.keys(obj),
        () => reactionCount++
    )

    const desc = {
        enumerable: true,
        configurable: true,
        writable: true,
        value: 0
    }
    Object.defineProperty(obj, "foo", desc)
    expect(Object.getOwnPropertyDescriptor(obj, "foo")).toEqual(desc)
    expect(mobx.isObservableProp(obj, "foo")).toBe(false)
    expect(reactionCount).toBe(1)
    delete obj.foo
    expect(obj.hasOwnProperty("foo")).toBe(false)
    expect(reactionCount).toBe(2)
})
