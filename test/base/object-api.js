const mobx = require("../../src/mobx")
const {
    keys,
    when,
    set,
    remove,
    values,
    entries,
    reaction,
    observable,
    extendObservable,
    has,
    get
} = mobx

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

test("object - set, remove, values are reactive", () => {
    const todos = observable({})
    const snapshots = []

    reaction(() => values(todos), values => snapshots.push(values))

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

test("object - set, remove, entries are reactive", () => {
    const todos = observable({})
    const snapshots = []

    reaction(() => entries(todos), entries => snapshots.push(entries))

    expect(has(todos, "x")).toBe(false)
    expect(get(todos, "x")).toBe(undefined)
    set(todos, "x", 3)
    expect(has(todos, "x")).toBe(true)
    expect(get(todos, "x")).toBe(3)
    remove(todos, "y")
    set(todos, "z", 4)
    set(todos, "x", 5)
    remove(todos, "z")

    expect(snapshots).toEqual([[["x", 3]], [["x", 3], ["z", 4]], [["x", 5], ["z", 4]], [["x", 5]]])
})

test("object - set, remove, keys are reactive", () => {
    const todos = observable({ a: 3 })
    const snapshots = []

    reaction(() => keys(todos), keys => snapshots.push(keys))

    set(todos, "x", 3)
    remove(todos, "y")
    set(todos, "z", 4)
    set(todos, "x", 5)
    remove(todos, "z")
    remove(todos, "a")

    expect(snapshots).toEqual([["a", "x"], ["a", "x", "z"], ["a", "x"], ["x"]])
})

test("map - set, remove, values are reactive", () => {
    const todos = observable.map({})
    const snapshots = []

    reaction(() => values(todos), values => snapshots.push(values))

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

test("map - set, remove, entries are reactive", () => {
    const todos = observable.map({})
    const snapshots = []

    reaction(() => entries(todos), entries => snapshots.push(entries))

    expect(has(todos, "x")).toBe(false)
    expect(get(todos, "x")).toBe(undefined)
    set(todos, "x", 3)
    expect(has(todos, "x")).toBe(true)
    expect(get(todos, "x")).toBe(3)
    remove(todos, "y")
    set(todos, "z", 4)
    set(todos, "x", 5)
    remove(todos, "z")

    expect(snapshots).toEqual([[["x", 3]], [["x", 3], ["z", 4]], [["x", 5], ["z", 4]], [["x", 5]]])
})

test("map - set, remove, keys are reactive", () => {
    const todos = observable.map({ a: 3 })
    const snapshots = []

    reaction(() => keys(todos), keys => snapshots.push(keys))

    set(todos, "x", 3)
    remove(todos, "y")
    set(todos, "z", 4)
    set(todos, "x", 5)
    remove(todos, "z")
    remove(todos, "a")

    expect(snapshots).toEqual([["a", "x"], ["a", "x", "z"], ["a", "x"], ["x"]])
})

test("array - set, remove, values are reactive", () => {
    const todos = observable.array()
    const snapshots = []

    reaction(() => values(todos), values => snapshots.push(values))

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

test("array - set, remove, entries are reactive", () => {
    const todos = observable.array()
    const snapshots = []

    reaction(() => entries(todos), entries => snapshots.push(entries))

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
        [["0", 2]],
        [["0", 2], ["1", 4]],
        [["0", 2], ["1", 4], ["2", undefined], ["3", 4]],
        [["0", 2], ["1", 3], ["2", undefined], ["3", 4]],
        [["0", 2], ["1", 3], ["2", 4]],
        [["0", 3], ["1", 4]]
    ])
})

test("observe & intercept", () => {
    let events = []
    const todos = observable(
        {
            a: { title: "get coffee" }
        },
        {},
        { deep: false }
    )
    mobx.observe(todos, c => events.push({ observe: c }))
    const d = mobx.intercept(todos, c => {
        events.push({ intercept: c })
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
    const a = mobx.observable({})
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
    const todos = observable(
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

test("computed props are not considered part of collections", () => {
    const x = observable({
        get y() {
            return 3
        }
    })
    expect(mobx.isComputedProp(x, "y")).toBe(true)
    expect(x.y).toBe(3)
    expect(has(x, "y")).toBe(false)
    expect(get(x, "y")).toBe(undefined) // disputable?
    expect(keys(x)).toEqual([])
    expect(values(x)).toEqual([])
    expect(entries(x)).toEqual([])
})
