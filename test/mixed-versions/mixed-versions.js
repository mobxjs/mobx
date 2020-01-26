const fs = require("fs")
const child_process = require("child_process")

let mobx4, mobx5
try {
    mobx4 = require("../../dist/v4")
    mobx5 = require("../../dist/v5")
} catch {
    child_process.execSync("yarn small-build", { stdio: "inherit" })
}

test.only("two versions should not work together by default", () => {
    expect(global.__mobxInstanceCount).toBe(2)
    expect(global.__mobxGlobals).not.toBe(undefined)

    const a = mobx4.observable({
        x: 1
    })
    const b = mobx5.observable({
        x: 3
    })

    const values = []
    const d1 = mobx4.autorun(() => {
        values.push(b.x)
    })
    const d2 = mobx5.autorun(() => {
        values.push(a.x)
    })

    a.x = 2
    b.x = 4

    d1()
    d2()

    expect(values).toEqual([3, 1, 2, 4])
})

test("two versions should not work together if state is isolated", () => {
    mobx4.configure({ isolateGlobalState: true })
    expect(global.__mobxInstanceCount).toBe(1)
    expect(global.__mobxGlobals).not.toBe(undefined)

    const a = mobx4.observable({
        x: 1
    })
    const b = mobx5.observable({
        x: 3
    })

    const values = []
    const d1 = mobx4.autorun(() => {
        values.push(b.x)
    })
    const d2 = mobx5.autorun(() => {
        values.push(a.x)
    })

    a.x = 2
    b.x = 4

    d1()
    d2()

    expect(values).toEqual([3, 1])
})

test("global state should disappear if all imports are isolated", () => {
    mobx5.configure({ isolateGlobalState: true })
    expect(global.__mobxInstanceCount).toBe(0)
    expect(global.__mobxGlobals).toBe(undefined)
    const a = mobx4.observable({
        x: 1
    })
    const b = mobx5.observable({
        x: 3
    })

    const values = []
    const d1 = mobx4.autorun(() => {
        values.push(b.x)
    })
    const d2 = mobx5.autorun(() => {
        values.push(a.x)
    })

    a.x = 2
    b.x = 4

    d1()
    d2()

    expect(values).toEqual([3, 1])
})
