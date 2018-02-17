const mobx = require("../../src/mobx")
const { keys, reaction, observable, extendObservable } = mobx

test("keys should be observable when extending", () => {
    const todos = observable({})

    const todoTitles = []
    reaction(
        () => keys(todos).map(key => `${key}: ${todos[key]}`),
        titles => todoTitles.push(titles.join(","))
    )

    mobx.extendObservable(todos, {
        lewis: "Read Lewis",
        chesterton: "Be mind blown by Chesterton"
    })
    expect(todoTitles).toEqual(["lewis: Read Lewis,chesterton: Be mind blown by Chesterton"])

    mobx.extendObservable(todos, { lewis: "Read Lewis twice" })
    mobx.extendObservable(todos, { coffee: "Grab coffee" })
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

    mobx.extendObservable(todos, {
        lewis: "Read Lewis",
        chesterton: "Be mind blown by Chesterton"
    })
    mobx.extendObservable(todos, { lewis: "Read Lewis twice" })
    mobx.extendObservable(todos, { coffee: "Grab coffee" })
    expect(serialized).toEqual([
        "{}",
        '{"lewis":"Read Lewis","chesterton":"Be mind blown by Chesterton"}',
        '{"lewis":"Read Lewis twice","chesterton":"Be mind blown by Chesterton"}',
        '{"lewis":"Read Lewis twice","chesterton":"Be mind blown by Chesterton","coffee":"Grab coffee"}'
    ])
})
