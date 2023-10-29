import "./utils/killFinalizationRegistry"
import { cleanup, render, act } from "@testing-library/react"
import * as mobx from "mobx"
import * as React from "react"
import { observer } from "../src"
import { clearTimers } from "mobx-react-lite"

afterEach(cleanup)

test("should unregister from FinalizationRegistry once commited #3776", async () => {
    const o = mobx.observable({ x: 0 })

    @observer
    class TestCmp extends React.Component<any> {
        render() {
            return o.x
        }
    }

    const { unmount, container } = render(<TestCmp />)

    expect(container).toHaveTextContent("0")

    // If not unregistered, clearTimes disposes reaction
    clearTimers()

    act(() => {
        o.x++
    })

    expect(container).toHaveTextContent("1")

    unmount()
})
