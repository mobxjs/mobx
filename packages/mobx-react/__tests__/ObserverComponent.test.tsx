import mockConsole from "jest-mock-console"
import * as mobx from "mobx"
import * as React from "react"
import { act, render } from "@testing-library/react"

import { Observer } from "../src"

describe("regions should rerender component", () => {
    const execute = () => {
        const data = mobx.observable.box("hi")
        const Comp = () => (
            <div>
                <Observer>{() => <span>{data.get()}</span>}</Observer>
                <li>{data.get()}</li>
            </div>
        )
        return { ...render(<Comp />), data }
    }

    test("init state is correct", () => {
        const { container } = execute()
        expect(container.querySelector("span")!.innerHTML).toBe("hi")
        expect(container.querySelector("li")!.innerHTML).toBe("hi")
    })

    test("set the data to hello", async () => {
        const { container, data } = execute()
        act(() => {
            data.set("hello")
        })
        expect(container.querySelector("span")!.innerHTML).toBe("hello")
        expect(container.querySelector("li")!.innerHTML).toBe("hi")
    })
})

it("renders null if no children/render prop is supplied a function", () => {
    const restoreConsole = mockConsole()
    const Comp = () => <Observer />
    const { container } = render(<Comp />)
    expect(container).toMatchInlineSnapshot(`<div />`)
    restoreConsole()
})
