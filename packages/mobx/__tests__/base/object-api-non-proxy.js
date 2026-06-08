const mobx = require("../../src/mobx")
const { autorun, entries, get, has, keys, observable, reaction, remove, set, values, when } = mobx

function observableObject(props = {}, options = {}) {
    return observable.object(props, undefined, {
        ...options,
        proxy: false
    })
}

test("keys should be observable when extending proxy: false objects", () => {
    const todos = observableObject({})

    const todoTitles = []
    reaction(
        () => keys(todos).map(key => `${key}: ${todos[key]}`),
        titles => todoTitles.push(titles.join(","))
    )

    set(todos, {
        lewis: "Read Lewis",
        chesterton: "Be mind blown by Chesterton"
    })
    expect(todoTitles).toEqual(["lewis: Read Lewis,chesterton: Be mind blown by Chesterton"])

    set(todos, { lewis: "Read Lewis twice" })
    set(todos, { coffee: "Grab coffee" })
    expect(todoTitles).toEqual([
        "lewis: Read Lewis,chesterton: Be mind blown by Chesterton",
        "lewis: Read Lewis twice,chesterton: Be mind blown by Chesterton",
        "lewis: Read Lewis twice,chesterton: Be mind blown by Chesterton,coffee: Grab coffee"
    ])
})

test("toJS respects key changes on proxy: false objects", () => {
    const todos = observableObject({})

    const serialized = []
    autorun(() => {
        serialized.push(JSON.stringify(mobx.toJS(todos)))
    })

    set(todos, {
        lewis: "Read Lewis",
        chesterton: "Be mind blown by Chesterton"
    })
    set(todos, { lewis: "Read Lewis twice" })
    set(todos, { coffee: "Grab coffee" })
    expect(serialized).toEqual([
        "{}",
        '{"lewis":"Read Lewis","chesterton":"Be mind blown by Chesterton"}',
        '{"lewis":"Read Lewis twice","chesterton":"Be mind blown by Chesterton"}',
        '{"lewis":"Read Lewis twice","chesterton":"Be mind blown by Chesterton","coffee":"Grab coffee"}'
    ])
})

test("keys(object), values(object), entries(object) on proxy: false objects", () => {
    const todos = observableObject({})
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

    set(todos, "k1", 1)
    plain.k1 = 1
    expectEquality()
    expectKeysReaction()
    expectValuesReaction()
    expectEntriesReaction()

    set(todos, s1, 2)
    plain[s1] = 2
    expectEquality()
    expectKeysReaction()
    expectValuesReaction()
    expectEntriesReaction()

    remove(todos, "-")
    delete plain["-"]
    expectEquality()

    remove(todos, Symbol())
    delete plain[Symbol()]
    expectEquality()

    set(todos, "k2", 3)
    plain.k2 = 3
    expectEquality()
    expectKeysReaction()
    expectValuesReaction()
    expectEntriesReaction()

    set(todos, s2, 4)
    plain[s2] = 4
    expectEquality()
    expectKeysReaction()
    expectValuesReaction()
    expectEntriesReaction()

    set(todos, "k1", 11)
    plain.k1 = 11
    expectEquality()
    expectValuesReaction()
    expectEntriesReaction()

    set(todos, s1, 22)
    plain[s1] = 22
    expectEquality()

    remove(todos, "k1")
    delete plain.k1
    expectEquality()
    expectKeysReaction()
    expectValuesReaction()
    expectEntriesReaction()

    remove(todos, s1)
    delete plain[s1]
    expectEquality()
    expectKeysReaction()
    expectValuesReaction()
    expectEntriesReaction()

    expect(keysSnapshots).toEqual(expectedKeysSnapshots)
    expect(valuesSnapshots).toEqual(expectedValuesSnapshots)
    expect(entriesSnapshots).toEqual(expectedEntriesSnapshots)
})

test("observe & intercept object API on proxy: false objects", () => {
    const events = []
    const todos = observableObject(
        {
            a: { title: "get coffee" }
        },
        { deep: false }
    )

    mobx.observe(todos, change => {
        events.push(`observe:${change.type}:${String(change.name)}`)
    })
    const disposeIntercept = mobx.intercept(todos, change => {
        events.push(`intercept:${change.type}:${String(change.name)}`)
        return null
    })

    set(todos, { b: { title: "get tea" } })
    remove(todos, "a")
    expect(events).toEqual(["intercept:add:b", "intercept:remove:a"])
    expect(mobx.toJS(todos)).toEqual({
        a: { title: "get coffee" }
    })

    events.splice(0)
    disposeIntercept()
    set(todos, { b: { title: "get tea" } })
    remove(todos, "a")
    expect(events).toEqual(["observe:add:b", "observe:remove:a"])
    expect(mobx.toJS(todos)).toEqual({
        b: { title: "get tea" }
    })
})

test("observe & intercept set are called for every proxy: false object write", () => {
    const object = observableObject({})
    const interceptLogs = []
    const observeLogs = []

    mobx.intercept(object, change => {
        interceptLogs.push(`${change.name}: ${change.newValue}`)
        return change
    })
    mobx.observe(object, change => observeLogs.push(`${change.name}: ${change.newValue}`))

    set(object, "x", 0)
    object.x = 1
    set(object, "x", 2)

    expect(interceptLogs).toEqual(["x: 0", "x: 1", "x: 2"])
    expect(observeLogs).toEqual(["x: 0", "x: 1", "x: 2"])
})

test("dynamically adding properties preserves proxy: false object modifiers", () => {
    const todos = observableObject(
        {
            a: { title: "get coffee" }
        },
        { deep: false }
    )
    expect(mobx.isObservable(todos.a)).toBe(false)
    set(todos, { b: { title: "get tea" } })
    expect(mobx.isObservable(todos.b)).toBe(false)
})

test("has and get are reactive on proxy: false objects", async () => {
    const todos = observableObject({})

    const p1 = when(() => has(todos, "x"))
    const p2 = when(() => get(todos, "y") === 3)

    setTimeout(() => {
        set(todos, { x: false, y: 3 })
    }, 100)

    await p1
    await p2
})

test("computed props are considered part of proxy: false object collections", () => {
    const object = observableObject({
        get y() {
            return 3
        }
    })
    expect(mobx.isComputedProp(object, "y")).toBe(true)
    expect(object.y).toBe(3)
    expect(has(object, "y")).toBe(true)
    expect(get(object, "y")).toBe(3)
    expect(keys(object)).toEqual([])
    expect(values(object)).toEqual([])
    expect(entries(object)).toEqual([])
})

test("#1739 - delete and undelete should work on proxy: false objects", () => {
    const object = observableObject({})

    const events = []
    autorun(() => {
        events.push(has(object, "a"))
    })

    set(object, "a", 1)
    set(object, "a", 2)
    remove(object, "a")
    set(object, "a", 2)
    remove(object, "a")
    set(object, "a", 3)
    expect(events).toEqual([false, true, false, true, false, true])
})

test("defineProperty - configurable: false on proxy: false objects", () => {
    const object = observableObject({})
    const descriptor = {
        enumerable: true,
        configurable: false,
        writable: true,
        value: 0
    }

    mobx.defineProperty(object, "foo", descriptor)
    expect(Object.getOwnPropertyDescriptor(object, "foo")).toEqual(descriptor)
    expect(mobx.isObservableProp(object, "foo")).toBe(false)

    object.foo++
    expect(object.foo).toBe(1)
    expect(() => mobx.extendObservable(object, { foo: 0 })).toThrow(TypeError)
    expect(() => mobx.makeObservable(object, { foo: mobx.observable })).toThrow(TypeError)
    expect(() => mobx.defineProperty(object, "foo", { configurable: false })).toThrow(TypeError)
})

test("defineProperty - writable: false on proxy: false objects", () => {
    const object = observableObject({})
    const descriptor = {
        enumerable: true,
        configurable: true,
        writable: false,
        value: 0
    }

    mobx.defineProperty(object, "foo", descriptor)
    expect(Object.getOwnPropertyDescriptor(object, "foo")).toEqual(descriptor)
    expect(mobx.isObservableProp(object, "foo")).toBe(false)
    expect(() => object.foo++).toThrow(TypeError)

    mobx.extendObservable(object, { foo: 0 })
    expect(mobx.isObservableProp(object, "foo")).toBe(true)
    object.foo++
    expect(object.foo).toBe(1)
})

test("defineProperty - redefine observable on proxy: false objects", () => {
    const object = observableObject({ foo: 0 })
    expect(mobx.isObservableProp(object, "foo")).toBe(true)

    const descriptor = {
        enumerable: true,
        configurable: true,
        writable: false,
        value: 0
    }

    mobx.defineProperty(object, "foo", descriptor)
    expect(Object.getOwnPropertyDescriptor(object, "foo")).toEqual(descriptor)
    expect(mobx.isObservableProp(object, "foo")).toBe(false)
})

test("defineProperty notifies proxy: false object keys observers", () => {
    const object = observableObject({})
    let reactionCount = 0
    reaction(
        () => keys(object),
        () => reactionCount++
    )

    const descriptor = {
        enumerable: true,
        configurable: true,
        writable: true,
        value: 0
    }
    mobx.defineProperty(object, "foo", descriptor)
    expect(Object.getOwnPropertyDescriptor(object, "foo")).toEqual(descriptor)
    expect(mobx.isObservableProp(object, "foo")).toBe(false)
    expect(reactionCount).toBe(1)

    remove(object, "foo")
    expect(object.hasOwnProperty("foo")).toBe(false)
    expect(reactionCount).toBe(2)
})
