const mobx = require("../../src/mobx")
const { keys, set, remove, values, reaction, observable, extendObservable } = mobx

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

    set(todos, "x", 3)
    remove(todos, "y")
    set(todos, "z", 4)
    set(todos, "x", 5)
    remove(todos, "z")

    expect(snapshots).toEqual([[3], [3, 4], [5, 4], [5]])
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

    set(todos, "x", 3)
    remove(todos, "y")
    set(todos, "z", 4)
    set(todos, "x", 5)
    remove(todos, "z")

    expect(snapshots).toEqual([[3], [3, 4], [5, 4], [5]])
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

    set(todos, 0, 2)
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

// TODO: test: observe and intercept property additions

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
