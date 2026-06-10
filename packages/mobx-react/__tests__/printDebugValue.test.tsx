import { $mobx, autorun, observable } from "mobx"
import { printDebugValue } from "../src/utils/printDebugValue"

test("printDebugValue", () => {
    const money = observable({
        euro: 10,
        get pound() {
            return this.euro / 1.15
        }
    })

    const disposer = autorun(() => {
        const { euro, pound } = money
        if (euro === pound) {
            console.log("Weird..")
        }
    })

    const value = (disposer as any)[$mobx]
    const debugValue = printDebugValue(value)

    expect(debugValue.name).toMatch(/^Autorun@/)
    expect(debugValue.dependencies?.map(dependency => dependency.name)).toEqual(
        expect.arrayContaining([
            expect.stringContaining(".euro"),
            expect.stringContaining(".pound")
        ])
    )

    disposer()

    expect(printDebugValue(value)).toEqual({ name: debugValue.name })
})
