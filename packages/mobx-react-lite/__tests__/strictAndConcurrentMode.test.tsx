import { act, cleanup, render } from "@testing-library/react"
import mockConsole from "jest-mock-console"
import * as mobx from "mobx"
import * as React from "react"

import { useObserver } from "../src/useObserver"
import { requestAnimationFrameMock } from "./utils/RequestAnimationFrameMockSession"

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

test("should destroy reaction when Promise is thrown", async doneCallback => {
    const o = mobx.observable({ x: 0, promise: null as Promise<void> | null })
    const Cmp = () =>
        useObserver(() => {
            o.x as any // establish dependency
            if (o.promise) {
                throw o.promise
            }
            return o.x as any
        })

    const observed = jest.fn()
    const unobserved = jest.fn()
    mobx.onBecomeObserved(o, "x", observed)
    mobx.onBecomeUnobserved(o, "x", unobserved)

    const { container, unmount } = render(
        <React.Suspense fallback={"loading..."}>
            <Cmp />
        </React.Suspense>
    )
    requestAnimationFrameMock.triggerAllAnimationFrames()

    expect(container).toHaveTextContent("0")
    expect(observed).toBeCalledTimes(1)
    expect(unobserved).toBeCalledTimes(0)
    act(
        mobx.action(() => {
            o.promise = Promise.resolve()
        })
    )
    requestAnimationFrameMock.triggerAllAnimationFrames()
    expect(container).toHaveTextContent("loading...")
    expect(observed).toBeCalledTimes(1)
    expect(unobserved).toBeCalledTimes(1)
    act(
        mobx.action(() => {
            o.x++
            o.promise = null
        })
    )
    requestAnimationFrameMock.triggerAllAnimationFrames()
    await new Promise(resolve => setTimeout(resolve, 1))
    expect(container).toHaveTextContent("1")
    expect(observed).toBeCalledTimes(2)
    expect(unobserved).toBeCalledTimes(1)

    doneCallback()
})
