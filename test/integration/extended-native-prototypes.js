const mobx = require("../../src/mobx")

describe("extended array prototype", () => {
    const extensionKey = "__extension"

    // A single setup/teardown for all tests because we're pretending to do a
    // singular global (dirty) change to the "environment".
    beforeAll(() => {
        Array.prototype[extensionKey] = () => {}
    })
    afterAll(() => {
        delete Array.prototype[extensionKey]
    })

    test("creating an observable should work", () => {
        const a = mobx.observable({ b: "b" })
    })

    test("extending an observable should work", () => {
        const a = { b: "b" }
        const c = mobx.extendObservable(a, {})
    })
})
