afterEach(() => {
    jest.resetModules()
    jest.resetAllMocks()
})

it("throws if react is not installed", () => {
    jest.mock("react", () => ({}))
    expect(() => require("../src/utils/assertEnvironment.ts")).toThrowErrorMatchingInlineSnapshot(
        `"mobx-react-lite requires React 18 or later"`
    )
})

it("throws if mobx is not installed", () => {
    jest.mock("react", () => ({ useState: true, useSyncExternalStore: true }))
    jest.mock("mobx", () => ({}))
    expect(() => require("../src/utils/assertEnvironment.ts")).toThrowErrorMatchingInlineSnapshot(
        `"mobx-react-lite requires mobx at least version 7 to be available"`
    )
})

export default "Cannot use import statement outside a module"
