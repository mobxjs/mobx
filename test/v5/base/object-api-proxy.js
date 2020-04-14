const mobx = require("../../../src/mobx")
const { has, autorun, when, values, runInAction, entries, reaction, observable } = mobx

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

test("object - set, remove, values are reactive", () => {
    const todos = observable({})
    const snapshots = []

    reaction(
        () => values(todos),
        values => snapshots.push(values)
    )

    expect("x" in todos).toBe(false)
    expect(todos.x).toBe(undefined)
    todos.x = 3
    expect("x" in todos).toBe(true)
    expect(todos.x).toBe(3)
    delete todos.y
    todos.z = 4
    todos.x = 5
    delete todos.z

    expect(snapshots).toEqual([[3], [3, 4], [5, 4], [5]])
})

test("object - set, remove, entries are reactive", () => {
    const todos = observable({})
    const snapshots = []

    reaction(
        () => entries(todos),
        entries => snapshots.push(entries)
    )

    expect("x" in todos).toBe(false)
    expect(todos.x).toBe(undefined)
    todos.x = 3
    expect("x" in todos).toBe(true)
    expect(todos.x).toBe(3)
    delete todos.y
    todos.z = 4
    todos.x = 5
    delete todos.z

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

test("object - set, remove, keys are reactive", () => {
    const todos = observable({ a: 3 })
    const snapshots = []

    reaction(
        () => Object.keys(todos),
        keys => snapshots.push(keys)
    )

    todos.x = 3
    delete todos.y
    todos.z = 4
    todos.x = 5
    delete todos.z
    delete todos.a

    expect(snapshots).toEqual([["a", "x"], ["a", "x", "z"], ["a", "x"], ["x"]])
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
    expect(values(x)).toEqual([])
    expect(entries(x)).toEqual([])
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
