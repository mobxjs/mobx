import { cleanup, render, waitFor } from "@testing-library/react"
import * as mobx from "mobx"
import * as React from "react"

// @ts-ignore
import gc from "expose-gc/function"
import { observer } from "../src"

afterEach(cleanup)

test("should not prevent GC of uncomitted components", async () => {
    expect(typeof globalThis.FinalizationRegistry).toBe("function")

    // This specific setup causes first instance of A not being commited.
    // This is checked by comparing constructor and componentDidMount invocation counts.
    // There is no profound reason why that's the case, if you know a simpler or more robust setup
    // feel free to change this.

    const o = mobx.observable({ x: 0 })
    let aConstructorCount = 0
    let aMountCount = 0

    let firstARef: WeakRef<React.Component>

    @observer
    class A extends React.Component<any> {
        constructor(props) {
            super(props)
            if (aConstructorCount === 0) {
                firstARef = new WeakRef(this)
            }
            aConstructorCount++
        }
        componentDidMount(): void {
            aMountCount++
        }
        render() {
            return (
                <React.Suspense fallback="fallback">
                    <LazyB />
                    {o.x}
                </React.Suspense>
            )
        }
    }

    class B extends React.Component {
        render() {
            return "B"
        }
    }

    const LazyA = React.lazy(() => Promise.resolve({ default: A }))
    const LazyB = React.lazy(() => Promise.resolve({ default: B }))

    function App() {
        return (
            <React.Suspense fallback="fallback">
                <LazyA />
            </React.Suspense>
        )
    }

    const { unmount, container } = render(<App />)

    expect(container).toHaveTextContent("fallback")
    await waitFor(() => expect(container).toHaveTextContent("B0"))
    expect(aConstructorCount).toBe(2)
    expect(aMountCount).toBe(1)

    await Promise.resolve()
    gc()
    await waitFor(() => expect(firstARef!.deref()).toBeUndefined(), {
        timeout: 10_000,
        interval: 150
    })

    unmount()
})

test("uncommitted function components should not leak observations", async () => {
    expect(typeof globalThis.FinalizationRegistry).toBe("function")

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

    await Promise.resolve()
    gc()

    await waitFor(
        () => {
            expect(count1IsObserved).toBe(true)
            expect(count2IsObserved).toBe(false)
        },
        {
            timeout: 15_000,
            interval: 200
        }
    )

    rendering.unmount()
})
