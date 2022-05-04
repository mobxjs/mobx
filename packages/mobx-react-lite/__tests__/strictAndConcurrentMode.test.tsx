import { act, cleanup, render } from "@testing-library/react"
import mockConsole from "jest-mock-console"
import * as mobx from "mobx"
import * as React from "react"

import { useObserver } from "../src/useObserver"

afterEach(cleanup)

test("uncommitted observing components should not attempt state changes", () => {
    const store = mobx.observable({ count: 0 })

    const TestComponent = () => useObserver(() => <div>{store.count}</div>)

    // Render our observing component wrapped in StrictMode
    const rendering = render(
        <React.StrictMode>
            <TestComponent />
        </React.StrictMode>
    )

    // That will have caused our component to have been rendered
    // more than once, but when we unmount it'll only unmount once.
    rendering.unmount()

    // Trigger a change to the observable. If the reactions were
    // not disposed correctly, we'll see some console errors from
    // React StrictMode because we're calling state mutators to
    // trigger an update.
    const restoreConsole = mockConsole()
    try {
        act(() => {
            store.count++
        })

        // Check to see if any console errors were reported.
        // tslint:disable-next-line: no-console
        expect(console.error).not.toHaveBeenCalled()
    } finally {
        restoreConsole()
    }
})

test(`observable changes before first commit are not lost`, async () => {
    const store = mobx.observable({ value: "initial" })

    const TestComponent = () =>
        useObserver(() => {
            const res = <div>{store.value}</div>
            // Change our observable. This is happening between the initial render of
            // our component and its initial commit, so it isn't fully mounted yet.
            // We want to ensure that the change isn't lost.
            store.value = "changed"
            return res
        })

    const rootNode = document.createElement("div")
    document.body.appendChild(rootNode)

    const rendering = render(
        <React.StrictMode>
            <TestComponent />
        </React.StrictMode>
    )

    expect(rendering.baseElement.textContent).toBe("changed")
})
