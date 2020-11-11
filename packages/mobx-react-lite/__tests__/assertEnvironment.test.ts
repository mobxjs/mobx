afterEach(() => {
    jest.resetModules()
    jest.resetAllMocks()
})

it("throws if react is not installed", () => {
    jest.mock("react", () => ({}))
    expect(() => require("../src/utils/assertEnvironment.ts")).toThrowErrorMatchingInlineSnapshot(
        `"mobx-react-lite requires React with Hooks support"`
    )
})

it("throws if mobx is not installed", () => {
    jest.mock("react", () => ({ useState: true }))
    jest.mock("mobx", () => ({}))
    expect(() => require("../src/utils/assertEnvironment.ts")).toThrowErrorMatchingInlineSnapshot(
        `"mobx-react-lite@3 requires mobx at least version 6 to be available"`
    )
})

export default "Cannot use import statement outside a module"
