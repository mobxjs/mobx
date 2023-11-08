import { act, cleanup, render } from "@testing-library/react"
import mockConsole from "jest-mock-console"
import * as mobx from "mobx"
import * as React from "react"
import { ErrorBoundary } from "./utils/ErrorBoundary"

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

test("suspended components should not leak observations", () => {
    const o = mobx.observable({ x: 0, promise: null as Promise<void> | null })
    const Cmp = () =>
        useObserver(() => {
            o.x as any // establish dependency

            if (o.promise) {
                throw o.promise
            }

            return <>{o.x}</>
        })

    const observed = jest.fn()
    const unobserved = jest.fn()
    mobx.onBecomeObserved(o, "x", observed)
    mobx.onBecomeUnobserved(o, "x", unobserved)

    jest.useFakeTimers()
    const { container, unmount } = render(
        <React.Suspense fallback={"loading..."}>
            <Cmp />
        </React.Suspense>
    )

    jest.runAllTimers()
    expect(container).toHaveTextContent("0")
    expect(observed).toBeCalledTimes(1)

    let resolve: () => void
    act(() => {
        o.promise = new Promise(r => (resolve = r))
    })

    jest.runAllTimers()
    expect(container).toHaveTextContent("loading...")
    expect(observed).toBeCalledTimes(1)
    expect(unobserved).toBeCalledTimes(0)

    act(() => {
        o.promise = null
        resolve!()
    })

    jest.runAllTimers()
    expect(container).toHaveTextContent(o.x + "")

    // ensure that we using same reaction and component state
    expect(observed).toBeCalledTimes(1)
    expect(unobserved).toBeCalledTimes(0)

    act(() => {
        o.x++
    })

    jest.runAllTimers()
    expect(container).toHaveTextContent(o.x + "")

    unmount()

    jest.runAllTimers()
    expect(observed).toBeCalledTimes(1)
    expect(unobserved).toBeCalledTimes(1)
    jest.useRealTimers()
})

test("uncommitted components should not leak observations", async () => {
    const store = mobx.observable({ count1: 0, count2: 0 })

    // Track whether counts are observed
    let count1IsObserved = false
    let count2IsObserved = false
    mobx.onBecomeObserved(store, "count1", () => (count1IsObserved = true))
    mobx.onBecomeUnobserved(store, "count1", () => (count1IsObserved = false))
    mobx.onBecomeObserved(store, "count2", () => (count2IsObserved = true))
    mobx.onBecomeUnobserved(store, "count2", () => (count2IsObserved = false))

    const TestComponent1 = () => useObserver(() => <div>{store.count1}</div>)
    const TestComponent2 = () => useObserver(() => <div>{store.count2}</div>)

    jest.useFakeTimers()
    // Render, then remove only #2
    const rendering = render(
        <React.StrictMode>
            <TestComponent1 />
            <TestComponent2 />
        </React.StrictMode>
    )
    rendering.rerender(
        <React.StrictMode>
            <TestComponent1 />
        </React.StrictMode>
    )

    jest.runAllTimers()
    // count1 should still be being observed by Component1,
    // but count2 should have had its reaction cleaned up.
    expect(count1IsObserved).toBeTruthy()
    expect(count2IsObserved).toBeFalsy()

    jest.useRealTimers()
})

test("abandoned components should not leak observations", async () => {
    const store = mobx.observable({ count: 0 })

    let countIsObserved = false
    mobx.onBecomeObserved(store, "count", () => (countIsObserved = true))
    mobx.onBecomeUnobserved(store, "count", () => (countIsObserved = false))

    const TestComponent = () =>
        useObserver(() => {
            store.count // establish dependency
            throw new Error("not rendered")
        })

    jest.useFakeTimers()

    render(
        <ErrorBoundary fallback="error">
            <TestComponent />
        </ErrorBoundary>
    )

    expect(countIsObserved).toBeTruthy()

    jest.runAllTimers()

    expect(countIsObserved).toBeFalsy()

    jest.useRealTimers()
})
