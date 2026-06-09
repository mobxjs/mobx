afterEach(() => {
    jest.dontMock("react-dom")
    jest.resetModules()
})

test("does not fail to load when react-dom is unavailable", () => {
    jest.resetModules()
    jest.doMock("react-dom", () => {
        throw Object.assign(new Error("Cannot find module 'react-dom'"), {
            code: "MODULE_NOT_FOUND"
        })
    })

    expect(() => require("../src/index.ts")).not.toThrow()
})
