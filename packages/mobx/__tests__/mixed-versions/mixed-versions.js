const fs = require("fs")
const child_process = require("child_process")

if (!fs.existsSync(__dirname + "/../../dist/mobx.umd.development.js")) {
    // make sure the minified build exists
    child_process.execSync("yarn build", { stdio: "inherit" })
}

const mobx1 = require("../../dist")
/* istanbul ignore next */
const mobx2 = require("../../dist/mobx.umd.development.js")

test("two versions should not work together by default", () => {
    expect(global.__mobxInstanceCount).toBe(2)
    expect(global.__mobxGlobals).not.toBe(undefined)

    const a = mobx1.observable({
        x: 1
    })
    const b = mobx2.observable({
        x: 3
    })

    const values = []
    const d1 = mobx1.autorun(() => {
        values.push(b.x)
    })
    const d2 = mobx2.autorun(() => {
        values.push(a.x)
    })

    a.x = 2
    b.x = 4

    d1()
    d2()

    expect(values).toEqual([3, 1, 2, 4])
})

test("two versions should not work together if state is isolated", () => {
    mobx1.configure({ isolateGlobalState: true })
    expect(global.__mobxInstanceCount).toBe(1)
    expect(global.__mobxGlobals).not.toBe(undefined)

    const a = mobx1.observable({
        x: 1
    })
    const b = mobx2.observable({
        x: 3
    })

    const values = []
    const d1 = mobx1.autorun(() => {
        values.push(b.x)
    })
    const d2 = mobx2.autorun(() => {
        values.push(a.x)
    })

    a.x = 2
    b.x = 4

    d1()
    d2()

    expect(values).toEqual([3, 1])
})

test("global state should disappear if all imports are isolated", () => {
    mobx2.configure({ isolateGlobalState: true })
    expect(global.__mobxInstanceCount).toBe(0)
    expect(global.__mobxGlobals).toBe(undefined)
    const a = mobx1.observable({
        x: 1
    })
    const b = mobx2.observable({
        x: 3
    })

    const values = []
    const d1 = mobx1.autorun(() => {
        values.push(b.x)
    })
    const d2 = mobx2.autorun(() => {
        values.push(a.x)
    })

    a.x = 2
    b.x = 4

    d1()
    d2()

    expect(values).toEqual([3, 1])
})
