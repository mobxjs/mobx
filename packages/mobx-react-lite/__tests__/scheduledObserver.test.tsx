import { act, cleanup, render, waitFor } from "@testing-library/react"
import * as mobx from "mobx"
import React from "react"

import {
    scheduledObserver,
    useScheduledObserver,
    createTimeoutScheduler,
    createRAFScheduler,
    observer
} from "../src"
import type { ReactionScheduler } from "mobx"

afterEach(cleanup)

// Helper to create a manual scheduler for precise control in tests
function createManualScheduler() {
    const pending: mobx.ScheduledReaction[] = []
    let flushPromiseResolve: (() => void) | null = null

    const scheduler: ReactionScheduler = reaction => {
        pending.push(reaction)
    }

    const flush = () => {
        const toRun = pending.splice(0)
        for (const r of toRun) {
            r.runReaction_()
        }
        if (flushPromiseResolve) {
            flushPromiseResolve()
            flushPromiseResolve = null
        }
    }

    const waitForFlush = () =>
        new Promise<void>(resolve => {
            flushPromiseResolve = resolve
        })

    return { scheduler, flush, pending, waitForFlush }
}

describe("scheduledObserver", () => {
    test("basic rendering works", () => {
        const store = mobx.observable({ value: 1 })
        const { scheduler, flush } = createManualScheduler()
        const deferredObserver = scheduledObserver(scheduler)

        const Component = deferredObserver(function Component() {
            return <div data-testid="value">{store.value}</div>
        })

        const { getByTestId } = render(<Component />)
        expect(getByTestId("value").textContent).toBe("1")
    })

    test("defers re-render until scheduler flushes", async () => {
        const store = mobx.observable({ value: 1 })
        const { scheduler, flush, pending } = createManualScheduler()
        const deferredObserver = scheduledObserver(scheduler)

        let renderCount = 0
        const Component = deferredObserver(function Component() {
            renderCount++
            return <div data-testid="value">{store.value}</div>
        })

        const { getByTestId } = render(<Component />)
        expect(renderCount).toBe(1)
        expect(getByTestId("value").textContent).toBe("1")

        // Change the observable
        act(() => {
            store.value = 2
        })

        // Reaction is scheduled but component hasn't re-rendered yet
        expect(pending.length).toBeGreaterThan(0)
        expect(renderCount).toBe(1) // Still 1 - no re-render yet
        expect(getByTestId("value").textContent).toBe("1") // Still shows old value

        // Flush the scheduler
        act(() => {
            flush()
        })

        // Now component should have re-rendered
        await waitFor(() => {
            expect(getByTestId("value").textContent).toBe("2")
        })
    })

    test("batches multiple state changes into single re-render", async () => {
        const store = mobx.observable({ a: 1, b: 1 })
        const { scheduler, flush } = createManualScheduler()
        const deferredObserver = scheduledObserver(scheduler)

        let renderCount = 0
        const Component = deferredObserver(function Component() {
            renderCount++
            return (
                <div data-testid="value">
                    {store.a}-{store.b}
                </div>
            )
        })

        const { getByTestId } = render(<Component />)
        expect(renderCount).toBe(1)

        // Multiple state changes
        act(() => {
            store.a = 2
            store.b = 2
            store.a = 3
            store.b = 3
        })

        // Still no re-render
        expect(renderCount).toBe(1)

        // Flush
        act(() => {
            flush()
        })

        // Only one additional render with final values
        await waitFor(() => {
            expect(getByTestId("value").textContent).toBe("3-3")
        })
        // Render count should be 2 (initial + one re-render after flush)
        expect(renderCount).toBe(2)
    })

    test("works with forwardRef", async () => {
        const store = mobx.observable({ value: 1 })
        const { scheduler, flush } = createManualScheduler()
        const deferredObserver = scheduledObserver(scheduler)

        const Component = deferredObserver(
            React.forwardRef<HTMLDivElement, {}>(function Component(props, ref) {
                return (
                    <div ref={ref} data-testid="value">
                        {store.value}
                    </div>
                )
            })
        )

        const ref = React.createRef<HTMLDivElement>()
        const { getByTestId } = render(<Component ref={ref} />)

        expect(ref.current).toBeInstanceOf(HTMLDivElement)
        expect(getByTestId("value").textContent).toBe("1")

        act(() => {
            store.value = 2
        })

        act(() => {
            flush()
        })

        await waitFor(() => {
            expect(getByTestId("value").textContent).toBe("2")
        })
    })

    test("computed values are not recalculated until scheduler flushes", async () => {
        const store = mobx.observable({ value: 1 })
        let computedCallCount = 0
        const derived = mobx.computed(() => {
            computedCallCount++
            return store.value * 2
        })

        const { scheduler, flush } = createManualScheduler()
        const deferredObserver = scheduledObserver(scheduler)

        const Component = deferredObserver(function Component() {
            return <div data-testid="value">{derived.get()}</div>
        })

        const { getByTestId } = render(<Component />)
        expect(computedCallCount).toBe(1)
        expect(getByTestId("value").textContent).toBe("2")

        // Reset counter
        computedCallCount = 0

        // Change observable
        act(() => {
            store.value = 5
        })

        // Computed has NOT been recalculated yet (key benefit of ScheduledReaction!)
        expect(computedCallCount).toBe(0)

        // Flush scheduler
        act(() => {
            flush()
        })

        // Now computed is recalculated
        await waitFor(() => {
            expect(getByTestId("value").textContent).toBe("10")
        })
        expect(computedCallCount).toBe(1)
    })

    test("chained computed values are all deferred", async () => {
        const store = mobx.observable({ value: 1 })
        let computedCalls = { c1: 0, c2: 0, c3: 0 }

        const c1 = mobx.computed(() => {
            computedCalls.c1++
            return store.value * 2
        })
        const c2 = mobx.computed(() => {
            computedCalls.c2++
            return c1.get() * 2
        })
        const c3 = mobx.computed(() => {
            computedCalls.c3++
            return c2.get() * 2
        })

        const { scheduler, flush } = createManualScheduler()
        const deferredObserver = scheduledObserver(scheduler)

        const Component = deferredObserver(function Component() {
            return <div data-testid="value">{c3.get()}</div>
        })

        const { getByTestId } = render(<Component />)
        expect(getByTestId("value").textContent).toBe("8") // 1 * 2 * 2 * 2

        // Reset counters
        computedCalls = { c1: 0, c2: 0, c3: 0 }

        // Change observable
        act(() => {
            store.value = 2
        })

        // None of the computeds have recalculated yet
        expect(computedCalls.c1).toBe(0)
        expect(computedCalls.c2).toBe(0)
        expect(computedCalls.c3).toBe(0)

        // Flush scheduler
        act(() => {
            flush()
        })

        // All computeds recalculated
        await waitFor(() => {
            expect(getByTestId("value").textContent).toBe("16") // 2 * 2 * 2 * 2
        })
        expect(computedCalls.c1).toBe(1)
        expect(computedCalls.c2).toBe(1)
        expect(computedCalls.c3).toBe(1)
    })

    test("disposes reaction on unmount", () => {
        const store = mobx.observable({ value: 1 })
        const { scheduler, flush, pending } = createManualScheduler()
        const deferredObserver = scheduledObserver(scheduler)

        const Component = deferredObserver(function Component() {
            return <div>{store.value}</div>
        })

        const { unmount } = render(<Component />)

        // Unmount
        unmount()

        // Change state - should not throw or cause issues
        act(() => {
            store.value = 2
        })

        // Flush should be safe
        act(() => {
            flush()
        })

        // No errors means success
    })
})

describe("useScheduledObserver", () => {
    test("basic rendering works", () => {
        const store = mobx.observable({ value: 1 })
        const { scheduler } = createManualScheduler()

        function Component() {
            return useScheduledObserver(
                () => <div data-testid="value">{store.value}</div>,
                scheduler
            )
        }

        const { getByTestId } = render(<Component />)
        expect(getByTestId("value").textContent).toBe("1")
    })

    test("defers re-render until scheduler flushes", async () => {
        const store = mobx.observable({ value: 1 })
        const { scheduler, flush } = createManualScheduler()

        let renderCount = 0
        function Component() {
            return useScheduledObserver(() => {
                renderCount++
                return <div data-testid="value">{store.value}</div>
            }, scheduler)
        }

        const { getByTestId } = render(<Component />)
        expect(renderCount).toBe(1)

        act(() => {
            store.value = 2
        })

        // Not re-rendered yet
        expect(renderCount).toBe(1)

        act(() => {
            flush()
        })

        await waitFor(() => {
            expect(getByTestId("value").textContent).toBe("2")
        })
    })
})

describe("createTimeoutScheduler", () => {
    test("defers reactions to next macrotask", async () => {
        const store = mobx.observable({ value: 1 })
        const timeoutScheduler = createTimeoutScheduler()
        const deferredObserver = scheduledObserver(timeoutScheduler)

        let renderCount = 0
        const Component = deferredObserver(function Component() {
            renderCount++
            return <div data-testid="value">{store.value}</div>
        })

        const { getByTestId } = render(<Component />)
        expect(renderCount).toBe(1)
        expect(getByTestId("value").textContent).toBe("1")

        // Change state
        act(() => {
            store.value = 2
        })

        // Still old value (deferred)
        expect(renderCount).toBe(1)

        // Wait for setTimeout to fire
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 10))
        })

        // Now updated
        expect(getByTestId("value").textContent).toBe("2")
    })
})

describe("createRAFScheduler", () => {
    // Mock requestAnimationFrame
    let rafCallback: (() => void) | null = null
    const originalRAF = globalThis.requestAnimationFrame

    beforeEach(() => {
        rafCallback = null
        globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
            rafCallback = () => cb(performance.now())
            return 1
        }
    })

    afterEach(() => {
        globalThis.requestAnimationFrame = originalRAF
    })

    test("defers reactions to next animation frame", async () => {
        const store = mobx.observable({ value: 1 })
        const rafScheduler = createRAFScheduler()
        const deferredObserver = scheduledObserver(rafScheduler)

        let renderCount = 0
        const Component = deferredObserver(function Component() {
            renderCount++
            return <div data-testid="value">{store.value}</div>
        })

        const { getByTestId } = render(<Component />)
        expect(renderCount).toBe(1)

        // Change state
        act(() => {
            store.value = 2
        })

        // Still old value
        expect(renderCount).toBe(1)
        expect(rafCallback).not.toBeNull()

        // Simulate RAF firing
        act(() => {
            rafCallback?.()
        })

        // Now updated
        await waitFor(() => {
            expect(getByTestId("value").textContent).toBe("2")
        })
    })
})

describe("staleWrapper", () => {
    test("staleWrapper renders with isStale=false initially", () => {
        const store = mobx.observable({ value: 1 })
        const { scheduler } = createManualScheduler()
        const deferredObserver = scheduledObserver(scheduler)

        const Component = deferredObserver(
            function Component() {
                return <span data-testid="value">{store.value}</span>
            },
            (children, isStale) => (
                <div data-testid="wrapper" data-stale={String(isStale)}>
                    {children}
                </div>
            )
        )

        const { getByTestId } = render(<Component />)
        expect(getByTestId("value").textContent).toBe("1")
        expect(getByTestId("wrapper").dataset.stale).toBe("false")
    })

    test("becomes stale after observable change, fresh after flush", () => {
        const store = mobx.observable({ value: 1 })
        const { scheduler, flush } = createManualScheduler()
        const deferredObserver = scheduledObserver(scheduler)

        const Component = deferredObserver(
            function Component() {
                return <span data-testid="value">{store.value}</span>
            },
            (children, isStale) => (
                <div
                    data-testid="wrapper"
                    style={{ opacity: isStale ? 0.5 : 1 }}
                    data-stale={String(isStale)}
                >
                    {children}
                </div>
            )
        )

        const { getByTestId } = render(<Component />)
        expect(getByTestId("wrapper").dataset.stale).toBe("false")

        // Change observable — reaction scheduled but not run
        act(() => {
            store.value = 2
        })

        // Wrapper shows stale, tracked content not yet updated
        expect(getByTestId("wrapper").dataset.stale).toBe("true")
        expect(getByTestId("value").textContent).toBe("1")

        // Flush — reaction runs, data becomes fresh
        act(() => {
            flush()
        })

        expect(getByTestId("wrapper").dataset.stale).toBe("false")
        expect(getByTestId("value").textContent).toBe("2")
    })

    test("staleWrapper can block interaction during stale window", () => {
        const store = mobx.observable({ value: 1 })
        const { scheduler, flush } = createManualScheduler()
        const deferredObserver = scheduledObserver(scheduler)

        const Component = deferredObserver(
            function Component() {
                return <span data-testid="value">{store.value}</span>
            },
            (children, isStale) => (
                <div data-testid="wrapper" style={{ pointerEvents: isStale ? "none" : "auto" }}>
                    {children}
                </div>
            )
        )

        const { getByTestId } = render(<Component />)
        expect(getByTestId("wrapper").style.pointerEvents).toBe("auto")

        act(() => {
            store.value = 2
        })

        expect(getByTestId("wrapper").style.pointerEvents).toBe("none")

        act(() => {
            flush()
        })

        expect(getByTestId("wrapper").style.pointerEvents).toBe("auto")
    })

    test("staleWrapper can show skeleton during stale window", () => {
        // NOTE: staleWrapper must always render `children` to keep the inner
        // tracked component mounted. Hide children with CSS when showing a
        // skeleton — do NOT conditionally omit them, or the reaction will be
        // disposed and the component can never recover from stale state.
        const store = mobx.observable({ value: 1 })
        const { scheduler, flush } = createManualScheduler()
        const deferredObserver = scheduledObserver(scheduler)

        const Component = deferredObserver(
            function Component() {
                return <span data-testid="value">{store.value}</span>
            },
            (children, isStale) => (
                <div>
                    {isStale && <div data-testid="skeleton">Loading...</div>}
                    <div data-testid="content" style={{ display: isStale ? "none" : "block" }}>
                        {children}
                    </div>
                </div>
            )
        )

        const { getByTestId, queryByTestId } = render(<Component />)
        expect(getByTestId("content").style.display).toBe("block")
        expect(queryByTestId("skeleton")).toBeNull()

        act(() => {
            store.value = 2
        })

        expect(getByTestId("skeleton")).toBeTruthy()
        expect(getByTestId("content").style.display).toBe("none")

        act(() => {
            flush()
        })

        expect(getByTestId("content").style.display).toBe("block")
        expect(queryByTestId("skeleton")).toBeNull()
        expect(getByTestId("value").textContent).toBe("2")
    })

    test("without staleWrapper, no extra wrapping occurs", () => {
        const store = mobx.observable({ value: 1 })
        const { scheduler, flush } = createManualScheduler()
        const deferredObserver = scheduledObserver(scheduler)

        let renderCount = 0
        const Component = deferredObserver(function Component() {
            renderCount++
            return <div data-testid="value">{store.value}</div>
        })

        const { getByTestId } = render(<Component />)
        expect(renderCount).toBe(1)
        expect(getByTestId("value").textContent).toBe("1")

        act(() => {
            store.value = 2
        })

        // No re-render yet — deferred
        expect(renderCount).toBe(1)

        act(() => {
            flush()
        })

        expect(renderCount).toBe(2)
        expect(getByTestId("value").textContent).toBe("2")
    })

    test("multiple instances with shared scheduler have independent stale state", () => {
        const storeA = mobx.observable({ value: "a1" })
        const storeB = mobx.observable({ value: "b1" })
        const { scheduler, flush } = createManualScheduler()
        const deferredObserver = scheduledObserver(scheduler)

        const staleWrapper = (children: React.ReactNode, isStale: boolean) => (
            <div data-stale={String(isStale)}>{children}</div>
        )

        const ComponentA = deferredObserver(function ComponentA() {
            return <span data-testid="valueA">{storeA.value}</span>
        }, staleWrapper)

        const ComponentB = deferredObserver(function ComponentB() {
            return <span data-testid="valueB">{storeB.value}</span>
        }, staleWrapper)

        const { getByTestId } = render(
            <>
                <ComponentA />
                <ComponentB />
            </>
        )

        // Both fresh initially
        const wrapperA = getByTestId("valueA").parentElement!
        const wrapperB = getByTestId("valueB").parentElement!
        expect(wrapperA.dataset.stale).toBe("false")
        expect(wrapperB.dataset.stale).toBe("false")

        // Only change storeA
        act(() => {
            storeA.value = "a2"
        })

        expect(wrapperA.dataset.stale).toBe("true")
        expect(wrapperB.dataset.stale).toBe("false")

        act(() => {
            flush()
        })

        expect(wrapperA.dataset.stale).toBe("false")
        expect(getByTestId("valueA").textContent).toBe("a2")
    })

    test("works with forwardRef", async () => {
        const store = mobx.observable({ value: 1 })
        const { scheduler, flush } = createManualScheduler()
        const deferredObserver = scheduledObserver(scheduler)

        const Component = deferredObserver(
            React.forwardRef<HTMLDivElement, {}>(function Component(props, ref) {
                return (
                    <div ref={ref} data-testid="value">
                        {store.value}
                    </div>
                )
            }),
            (children, isStale) => (
                <div data-testid="wrapper" data-stale={String(isStale)}>
                    {children}
                </div>
            )
        )

        const ref = React.createRef<HTMLDivElement>()
        const { getByTestId } = render(<Component ref={ref} />)

        expect(ref.current).toBeInstanceOf(HTMLDivElement)
        expect(getByTestId("value").textContent).toContain("1")
        expect(getByTestId("wrapper").dataset.stale).toBe("false")

        act(() => {
            store.value = 2
        })

        expect(getByTestId("wrapper").dataset.stale).toBe("true")

        act(() => {
            flush()
        })

        await waitFor(() => {
            expect(getByTestId("value").textContent).toContain("2")
        })
        expect(getByTestId("wrapper").dataset.stale).toBe("false")
    })

    test("onStale and onFresh callbacks fire on useScheduledObserver directly", () => {
        const store = mobx.observable({ value: 1 })
        const { scheduler, flush } = createManualScheduler()

        const staleCalls: boolean[] = []

        function Component() {
            return useScheduledObserver(
                () => <div data-testid="value">{store.value}</div>,
                scheduler,
                "test",
                {
                    onStale: () => staleCalls.push(true),
                    onFresh: () => staleCalls.push(false)
                }
            )
        }

        render(<Component />)
        expect(staleCalls).toEqual([])

        act(() => {
            store.value = 2
        })

        expect(staleCalls).toEqual([true])

        act(() => {
            flush()
        })

        expect(staleCalls).toEqual([true, false])
    })

    test("stale wrapper at toolbar level dims entire toolbar", async () => {
        const store = mobx.observable({
            items: [
                { id: 1, label: "Bold" },
                { id: 2, label: "Italic" }
            ]
        })
        const { scheduler, flush } = createManualScheduler()
        const deferredObserver = scheduledObserver(scheduler)

        function ToolbarItem({ item }: { item: { id: number; label: string } }) {
            return <button data-testid={`item-${item.id}`}>{item.label}</button>
        }

        const Toolbar = deferredObserver(
            function Toolbar() {
                return (
                    <div data-testid="toolbar-content">
                        {store.items.map(item => (
                            <ToolbarItem key={item.id} item={item} />
                        ))}
                    </div>
                )
            },
            (children, isStale) => (
                <div data-testid="toolbar-wrapper" style={{ opacity: isStale ? 0.5 : 1 }}>
                    {children}
                </div>
            )
        )

        const { getByTestId } = render(<Toolbar />)
        expect(getByTestId("toolbar-wrapper").style.opacity).toBe("1")
        expect(getByTestId("item-1").textContent).toBe("Bold")

        // Add an item
        act(() => {
            store.items.push({ id: 3, label: "Underline" })
        })

        // Toolbar dims, but items haven't updated yet
        expect(getByTestId("toolbar-wrapper").style.opacity).toBe("0.5")

        act(() => {
            flush()
        })

        expect(getByTestId("toolbar-wrapper").style.opacity).toBe("1")
        expect(getByTestId("item-3").textContent).toBe("Underline")
    })

    test("nested stale wrappers at different levels", async () => {
        const toolbarStore = mobx.observable({ title: "Tools" })
        const itemStore = mobx.observable({ label: "Bold" })
        const { scheduler, flush } = createManualScheduler()
        const deferredObserver = scheduledObserver(scheduler)

        const ToolbarItem = deferredObserver(
            function ToolbarItem() {
                return <button data-testid="item">{itemStore.label}</button>
            },
            (children, isStale) => (
                <div
                    data-testid="item-wrapper"
                    style={{ pointerEvents: isStale ? "none" : "auto" }}
                >
                    {children}
                </div>
            )
        )

        const Toolbar = deferredObserver(
            function Toolbar() {
                return (
                    <div>
                        <span data-testid="title">{toolbarStore.title}</span>
                        <ToolbarItem />
                    </div>
                )
            },
            (children, isStale) => (
                <div data-testid="toolbar-wrapper" style={{ opacity: isStale ? 0.5 : 1 }}>
                    {children}
                </div>
            )
        )

        const { getByTestId } = render(<Toolbar />)
        expect(getByTestId("toolbar-wrapper").style.opacity).toBe("1")
        expect(getByTestId("item-wrapper").style.pointerEvents).toBe("auto")

        // Change only the item store — only item goes stale
        act(() => {
            itemStore.label = "Italic"
        })

        // Toolbar is NOT stale (toolbarStore didn't change)
        // Item IS stale (itemStore changed)
        expect(getByTestId("toolbar-wrapper").style.opacity).toBe("1")
        expect(getByTestId("item-wrapper").style.pointerEvents).toBe("none")

        act(() => {
            flush()
        })

        expect(getByTestId("item-wrapper").style.pointerEvents).toBe("auto")
        expect(getByTestId("item").textContent).toBe("Italic")

        // Change only the toolbar store — only toolbar goes stale
        act(() => {
            toolbarStore.title = "Formatting"
        })

        expect(getByTestId("toolbar-wrapper").style.opacity).toBe("0.5")
        expect(getByTestId("item-wrapper").style.pointerEvents).toBe("auto")

        act(() => {
            flush()
        })

        expect(getByTestId("toolbar-wrapper").style.opacity).toBe("1")
        expect(getByTestId("title").textContent).toBe("Formatting")
    })
})

describe("comparison: observer vs scheduledObserver", () => {
    test("observer updates synchronously, scheduledObserver defers", async () => {
        const store = mobx.observable({ value: 1 })
        const { scheduler, flush } = createManualScheduler()

        // Regular observer
        let syncRenderCount = 0
        const SyncComponent = observer(function SyncComponent() {
            syncRenderCount++
            return <div data-testid="sync">{store.value}</div>
        })

        // Scheduled observer
        const deferredObserver = scheduledObserver(scheduler)
        let deferredRenderCount = 0
        const DeferredComponent = deferredObserver(function DeferredComponent() {
            deferredRenderCount++
            return <div data-testid="deferred">{store.value}</div>
        })

        const { getByTestId } = render(
            <>
                <SyncComponent />
                <DeferredComponent />
            </>
        )

        expect(syncRenderCount).toBe(1)
        expect(deferredRenderCount).toBe(1)

        // Change state
        act(() => {
            store.value = 2
        })

        // Sync component re-rendered immediately
        expect(syncRenderCount).toBe(2)
        expect(getByTestId("sync").textContent).toBe("2")

        // Deferred component has NOT re-rendered
        expect(deferredRenderCount).toBe(1)
        expect(getByTestId("deferred").textContent).toBe("1")

        // Flush deferred reactions
        act(() => {
            flush()
        })

        // Now deferred component has re-rendered
        await waitFor(() => {
            expect(getByTestId("deferred").textContent).toBe("2")
        })
        expect(deferredRenderCount).toBe(2)
    })
})
