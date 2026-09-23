import { act, render } from "@testing-library/react"
import mockConsole from "jest-mock-console"
import * as mobx from "mobx"
import * as React from "react"

import { useObserver } from "../src/useObserver"

type ErrorBoundaryProps = React.PropsWithChildren<{ fallback: string }>

class ErrorBoundary extends React.Component<ErrorBoundaryProps, { hasError: boolean }> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(_error: unknown) {
        return { hasError: true }
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback
        }

        return this.props.children
    }
}

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

test("suspended components should not leak observations", async () => {
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

    await Promise.resolve()
    act(() => jest.runAllTimers())
    expect(container).toHaveTextContent("0")
    expect(observed).toHaveBeenCalledTimes(1)

    let resolve!: () => void
    act(() => {
        o.promise = new Promise(r => (resolve = r))
    })

    await Promise.resolve()
    act(() => jest.runAllTimers())
    expect(container).toHaveTextContent("loading...")
    expect(observed).toHaveBeenCalledTimes(1)
    expect(unobserved).toHaveBeenCalledTimes(0)

    await act(async () => {
        o.promise = null
        resolve()
        await Promise.resolve()
    })

    act(() => jest.runAllTimers())
    expect(container).toHaveTextContent(String(o.x))

    expect(observed).toHaveBeenCalledTimes(1)
    expect(unobserved).toHaveBeenCalledTimes(0)

    act(() => {
        o.x++
    })
    act(() => jest.runAllTimers())
    expect(container).toHaveTextContent(String(o.x))

    unmount()
    act(() => jest.runAllTimers())
    expect(observed).toHaveBeenCalledTimes(1)
    expect(unobserved).toHaveBeenCalledTimes(1)
})

test("uncommitted components should not leak observations", async () => {
    const store = mobx.observable({ count1: 0, count2: 0 })

    let count1IsObserved = false
    let count2IsObserved = false
    mobx.onBecomeObserved(store, "count1", () => (count1IsObserved = true))
    mobx.onBecomeUnobserved(store, "count1", () => (count1IsObserved = false))
    mobx.onBecomeObserved(store, "count2", () => (count2IsObserved = true))
    mobx.onBecomeUnobserved(store, "count2", () => (count2IsObserved = false))

    const TestComponent1 = () => useObserver(() => <div>{store.count1}</div>)
    const TestComponent2 = () => useObserver(() => <div>{store.count2}</div>)

    jest.useFakeTimers()
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

    await Promise.resolve()
    act(() => jest.runAllTimers())
    expect(count1IsObserved).toBeTruthy()
    expect(count2IsObserved).toBeFalsy()
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

    const restoreConsole = mockConsole()
    try {
        render(
            <ErrorBoundary fallback="error">
                <TestComponent />
            </ErrorBoundary>
        )
    } finally {
        restoreConsole()
    }

    expect(countIsObserved).toBeTruthy()

    await Promise.resolve()
    act(() => jest.runAllTimers())

    expect(countIsObserved).toBeFalsy()
})
