import "./utils/killFinalizationRegistry"
import { render, act } from "@testing-library/react"
import * as mobx from "mobx"
import * as React from "react"
import { clearTimers, observer } from "../src"
import {
    REGISTRY_FINALIZE_AFTER,
    REGISTRY_SWEEP_INTERVAL,
    TimerBasedFinalizationRegistry
} from "../src/utils/UniversalFinalizationRegistry"
import { observerFinalizationRegistry } from "../src/utils/observerFinalizationRegistry"

expect(globalThis.FinalizationRegistry).toBeUndefined()
expect(observerFinalizationRegistry).toBeInstanceOf(TimerBasedFinalizationRegistry)

const registry = observerFinalizationRegistry as TimerBasedFinalizationRegistry<unknown>

afterEach(() => {
    registry.finalizeAllImmediately()
})

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

test("uncommitted function components should not leak observations", async () => {
    registry.finalizeAllImmediately()

    let fakeNow = Date.now()
    jest.useFakeTimers()
    jest.spyOn(Date, "now").mockImplementation(() => fakeNow)

    const store = mobx.observable({ count1: 0, count2: 0 })
    let count1IsObserved = false
    let count2IsObserved = false

    mobx.onBecomeObserved(store, "count1", () => (count1IsObserved = true))
    mobx.onBecomeUnobserved(store, "count1", () => (count1IsObserved = false))
    mobx.onBecomeObserved(store, "count2", () => (count2IsObserved = true))
    mobx.onBecomeUnobserved(store, "count2", () => (count2IsObserved = false))

    const TestComponent1 = observer(() => <div>{store.count1}</div>)
    const TestComponent2 = observer(() => <div>{store.count2}</div>)

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

    const skip = Math.max(REGISTRY_FINALIZE_AFTER, REGISTRY_SWEEP_INTERVAL)
    fakeNow += skip
    act(() => {
        jest.advanceTimersByTime(skip)
    })

    expect(count1IsObserved).toBe(true)
    expect(count2IsObserved).toBe(false)

    rendering.unmount()
})

test("cleanup timer should not clean up recently-pended function component reactions", () => {
    registry.finalizeAllImmediately()

    const fakeNow = Date.now()
    jest.useFakeTimers()
    jest.spyOn(Date, "now").mockImplementation(() => fakeNow)

    const store = mobx.observable({ count: 0 })
    let countIsObserved = false

    mobx.onBecomeObserved(store, "count", () => (countIsObserved = true))
    mobx.onBecomeUnobserved(store, "count", () => (countIsObserved = false))

    const TestComponent = observer(() => <div>{store.count}</div>)

    render(
        <React.StrictMode>
            <TestComponent />
        </React.StrictMode>
    )

    registry.sweep()
    jest.advanceTimersByTime(500)

    act(() => {
        // Flush effects without advancing the finalization cleanup window.
    })

    expect(countIsObserved).toBe(true)
})
