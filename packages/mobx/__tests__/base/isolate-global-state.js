"use strict"
const mobx = require("../../src/mobx.ts")

test("a reaction created after isolateGlobalState still tracks an observable read before it - #3860", () => {
    const store = mobx.observable({
        shared: 1,
        get prop1() {
            return this.shared + 1
        },
        get prop2() {
            return this.shared + 2
        }
    })

    const seenProp1 = []
    const seenProp2 = []

    const disposeFirst = mobx.reaction(
        () => store.prop1,
        v => seenProp1.push(v)
    )

    mobx.configure({ isolateGlobalState: true })

    const disposeSecond = mobx.reaction(
        () => store.prop2,
        v => seenProp2.push(v)
    )

    mobx.runInAction(() => {
        store.shared = 10
    })

    disposeFirst()
    disposeSecond()

    expect(seenProp1).toEqual([11])
    expect(seenProp2).toEqual([12])
})
