import { cleanup, render, waitFor } from "@testing-library/react"
import * as mobx from "mobx"
import * as React from "react"
import { useObserver } from "../src/useObserver"
import gc from "expose-gc/function"
import { observerFinalizationRegistry } from "../src/utils/observerFinalizationRegistry"
import { requestAnimationFrameMock } from "./utils/RequestAnimationFrameMockSession"

if (typeof globalThis.FinalizationRegistry !== "function") {
    throw new Error("This test must run with node >= 14")
}

expect(observerFinalizationRegistry).toBeInstanceOf(globalThis.FinalizationRegistry)

afterEach(cleanup)

test("uncommitted components should not leak observations", async () => {
    jest.setTimeout(30_000)
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

    // Render, then remove only #2
    const rendering = render(
        <React.StrictMode>
            <TestComponent1 />
            <TestComponent2 />
        </React.StrictMode>
    )
    requestAnimationFrameMock.triggerAllAnimationFrames()
    rendering.rerender(
        <React.StrictMode>
            <TestComponent1 />
        </React.StrictMode>
    )
    requestAnimationFrameMock.triggerAllAnimationFrames()

    // Allow gc to kick in in case to let finalization registry cleanup
    await new Promise(resolve => setTimeout(resolve, 100))
    gc()
    // Can take a while (especially on CI) before gc actually calls the registry
    await waitFor(
        () => {
            // count1 should still be being observed by Component1,
            // but count2 should have had its reaction cleaned up.
            expect(count1IsObserved).toBeTruthy()
            expect(count2IsObserved).toBeFalsy()
        },
        {
            timeout: 15_000,
            interval: 200
        }
    )
})
