const fs = require("fs")
const child_process = require("child_process")

if (!fs.existsSync(__dirname + "/../../lib/mobx.umd.min.js")) {
    // make sure the minified build exists
    child_process.execSync("npm run small-build", { stdio: "inherit" })
}

const mobx1 = require("../../")
/* istanbul ignore next */
const mobx2 = require("../../lib/mobx.umd.min.js")

test("two versions should not work together if state is not shared", () => {
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

    expect(values).toEqual([
        3,
        1 // no re-runs
    ])
})
