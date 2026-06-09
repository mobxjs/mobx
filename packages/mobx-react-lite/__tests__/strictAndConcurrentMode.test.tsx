import { act, cleanup, render, RenderResult } from "@testing-library/react"
import mockConsole from "jest-mock-console"
import * as mobx from "mobx"
import * as React from "react"

import { ErrorBoundary } from "./utils/error-bondary"
import { observer } from "../src/observer"

afterEach(cleanup)

test("uncommitted observing components should not attempt state changes", async () => {
    const store = mobx.observable({ count: 0 })

    const TestComponent = observer(() => <div>{store.count}</div>)

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
        await act(async () => {
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

    const TestComponent = observer(() => {
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
    const Cmp = observer(() => {
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

    expect(container).toHaveTextContent("0")
    expect(observed).toBeCalledTimes(1)

    let resolve: () => void
    await act(async () => {
        o.promise = new Promise(r => (resolve = r))
    })

    expect(container).toHaveTextContent("loading...")
    expect(observed).toBeCalledTimes(2)
    expect(unobserved).toBeCalledTimes(2)

    observed.mockClear()
    unobserved.mockClear()
    await act(async () => {
        o.promise = null
        resolve!()
    })

    expect(container).toHaveTextContent(`${o.x}`)

    // ensure that we using same reaction and component state
    expect(observed).toBeCalledTimes(1)
    expect(unobserved).toBeCalledTimes(0)

    await act(async () => {
        o.x++
    })

    expect(container).toHaveTextContent(`${o.x}`)

    unmount()

    expect(observed).toBeCalledTimes(1)
    expect(unobserved).toBeCalledTimes(1)
    jest.useRealTimers()
})

describe("suspended components should not leak observations when suspensions happen before observations", () => {
    let x1: mobx.IObservableValue<number>
    let o1: PromiseWithResolvers<mobx.IObservableValue<number>>
    let x2: mobx.IObservableValue<number>
    let o2: PromiseWithResolvers<mobx.IObservableValue<number>>
    let value: PromiseWithResolvers<string>
    let Cmp: React.ComponentType<{}>
    let observationOrdering: string[]

    const trackObservationalGenerationsFor = (target: mobx.IObservableValue<any>, name: string) => {
        let generation = 0

        mobx.onBecomeObserved(target, () => {
            const gen = (generation += 1)
            observationOrdering.push(`observed(${name})[${gen}]`)
            const stop = mobx.onBecomeUnobserved(target, () => {
                observationOrdering.push(`unobserved(${name})[${gen}]`)
                stop()
            })
        })
    }

    beforeEach(() => {
        jest.useFakeTimers()
        observationOrdering = []

        x1 = mobx.observable.box(10)
        trackObservationalGenerationsFor(x1, "x1")

        x2 = mobx.observable.box(11)
        trackObservationalGenerationsFor(x2, "x2")

        o1 = Promise.withResolvers()
        o2 = Promise.withResolvers()
        value = Promise.withResolvers()
        Cmp = observer(() => {
            const x1 = simpleUse(o1.promise).get()
            const x2 = simpleUse(o2.promise).get()
            const v = simpleUse(value.promise)

            return (
                <>
                    {x1} {x2} {v}
                </>
            )
        })
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    describe("when rendered", () => {
        let rendered: RenderResult

        beforeEach(() => {
            rendered = render(
                <React.Suspense fallback={"loading..."}>
                    <Cmp key="v1" />
                </React.Suspense>
            )
        })

        it("renders the fallback (due to the first promise not being resolved)", () => {
            expect(rendered.baseElement).toHaveTextContent("loading...")
        })

        it("does not observe anything", () => {
            expect(observationOrdering).toEqual([])
        })

        describe("when the first promise resolves", () => {
            beforeEach(async () => {
                await act(async () => {
                    o1.resolve(x1)
                })
            })

            it("still renders the fallback (due to the second promise not being resolved)", () => {
                expect(rendered.baseElement).toHaveTextContent("loading...")
            })

            it("starts and stops the expected observations", () => {
                expect(observationOrdering).toEqual([
                    "observed(x1)[1]",
                    "unobserved(x1)[1]",
                    "observed(x1)[2]",
                    "unobserved(x1)[2]"
                ])
            })

            describe("when rerendered as a different instance", () => {
                beforeEach(() => {
                    observationOrdering = []
                    rendered.rerender(
                        <React.Suspense fallback={"loading..."}>
                            <Cmp key="v2" />
                        </React.Suspense>
                    )
                })

                it("still renders the fallback (due to the second promise not being resolved)", () => {
                    expect(rendered.baseElement).toHaveTextContent("loading...")
                })

                it("starts and stops the expected observations", () => {
                    expect(observationOrdering).toEqual([
                        "observed(x1)[3]",
                        "unobserved(x1)[3]",
                        "observed(x1)[4]",
                        "unobserved(x1)[4]"
                    ])
                })
            })

            describe("when the second promise resolves", () => {
                beforeEach(async () => {
                    observationOrdering = []
                    await act(async () => {
                        o2.resolve(x2)
                    })
                })

                it("still renders the fallback (due to the second promise not being resolved)", () => {
                    expect(rendered.baseElement).toHaveTextContent("loading...")
                })

                it("starts and stops the expected observations", () => {
                    expect(observationOrdering).toEqual([
                        "observed(x1)[3]",
                        "observed(x2)[1]",
                        "unobserved(x2)[1]",
                        "unobserved(x1)[3]",
                        "observed(x1)[4]",
                        "observed(x2)[2]",
                        "unobserved(x2)[2]",
                        "unobserved(x1)[4]"
                    ])
                })

                describe("when the third promise resolves", () => {
                    beforeEach(async () => {
                        observationOrdering = []
                        await act(async () => {
                            value.resolve("some-string")
                        })
                    })

                    it("now renders the expected contents", () => {
                        expect(rendered.baseElement.textContent).toEqual("10 11 some-string")
                    })

                    it("starts the expected observations", () => {
                        expect(observationOrdering).toEqual(["observed(x1)[5]", "observed(x2)[3]"])
                    })

                    describe("when some observed observable changes", () => {
                        beforeEach(async () => {
                            observationOrdering = []
                            await act(async () => {
                                mobx.runInAction(() => {
                                    x1.set(14)
                                })
                            })
                        })

                        it("rendering updates immediately", () => {
                            expect(rendered.baseElement.textContent).toEqual("14 11 some-string")
                        })

                        it("does not change the observational status of any observables", () => {
                            expect(observationOrdering).toEqual([])
                        })
                    })

                    describe("when the component unmounts", () => {
                        beforeEach(async () => {
                            observationOrdering = []
                            await act(async () => {
                                rendered.rerender(<div />)
                            })
                        })

                        it("stops the expected observations", () => {
                            expect(observationOrdering).toEqual([
                                "unobserved(x2)[3]",
                                "unobserved(x1)[5]"
                            ])
                        })
                    })
                })
            })
        })
    })
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

    const TestComponent1 = observer(() => <div>{store.count1}</div>)
    const TestComponent2 = observer(() => <div>{store.count2}</div>)

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

    // count1 should still be being observed by Component1,
    // but count2 should have had its reaction cleaned up.
    expect(count1IsObserved).toBeTruthy()
    expect(count2IsObserved).toBeFalsy()

    jest.useRealTimers()
})

test("abandoned components should not leak observations", async () => {
    const store = mobx.observable({ count: 0 })
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {})

    const observed = jest.fn()
    const unobserved = jest.fn()
    mobx.onBecomeObserved(store, "count", observed)
    mobx.onBecomeUnobserved(store, "count", unobserved)

    const TestComponent = observer(() => {
        store.count // establish dependency
        throw new Error("not rendered")
    })

    jest.useFakeTimers()

    render(
        <ErrorBoundary fallback="error">
            <TestComponent />
        </ErrorBoundary>
    )

    expect(observed).toHaveBeenCalledTimes(2)
    expect(unobserved).toHaveBeenCalledTimes(2)

    jest.useRealTimers()
    consoleErrorSpy.mockRestore()
})

const status = Symbol.for("status-of-promise-for-use-hook")
const result = Symbol.for("result-of-promise-for-use-hook")
const rejection = Symbol.for("rejection-of-promise-for-use-hook")

// Note: this is an approximated "use" for when real "use" of React 19 is not yet available.
export const simpleUse = maybePromise => {
    if (!(maybePromise instanceof Promise)) {
        return maybePromise
    }

    const promise = maybePromise

    switch (promise[status]) {
        case "fulfilled":
            return promise[result]

        case "rejected":
            throw promise[rejection]

        case "pending":
            throw promise

        default:
            promise[status] = "pending"

            promise.then(
                r => {
                    promise[status] = "fulfilled"
                    promise[result] = r
                },

                e => {
                    promise[status] = "rejected"
                    promise[rejection] = e
                }
            )

            throw promise
    }
}
