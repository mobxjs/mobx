import { observable } from "../../../src/mobx"

test("argumentless observable adds undefined to the output type", () => {
    const a = observable.box<string>()
    // @ts-expect-error
    expect(() => a.get().includes("hello_world")).toThrowError()
})

test("with initial value observable does not adds undefined to the output type", () => {
    const a = observable.box<string>("hello")
    expect(() => a.get().includes("hello_world")).not.toThrowError()
})

test("observable.box should keep track of undefined and null in type", () => {
    const a = observable.box<string | undefined>()
    // @ts-expect-error
    expect(() => a.get().includes("hello_world")).toThrowError()
})
