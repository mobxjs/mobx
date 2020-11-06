import { act, cleanup, render } from "@testing-library/react"
import { renderHook } from "@testing-library/react-hooks"
import mockConsole from "jest-mock-console"
import { autorun, configure, observable } from "mobx"
import * as React from "react"
import { useEffect, useState } from "react"

import { Observer, observer, useLocalObservable } from "../src"
import { resetMobx } from "./utils"
import { useObserver } from "../src/useObserver"

afterEach(cleanup)
afterEach(resetMobx)

describe("base useAsObservableSource should work", () => {
    it("with useObserver", () => {
        let counterRender = 0
        let observerRender = 0

        function Counter({ multiplier }: { multiplier: number }) {
            counterRender++
            const observableProps = useLocalObservable(() => ({ multiplier }))
            Object.assign(observableProps, { multiplier })
            const store = useLocalObservable(() => ({
                count: 10,
                get multiplied() {
                    return observableProps.multiplier * this.count
                },
                inc() {
                    this.count += 1
                }
            }))

            return useObserver(
                () => (
                    observerRender++,
                    (
                        <div>
                            Multiplied count: <span>{store.multiplied}</span>
                            <button id="inc" onClick={store.inc}>
                                Increment
                            </button>
                        </div>
                    )
                )
            )
        }

        function Parent() {
            const [multiplier, setMultiplier] = useState(1)

            return (
                <div>
                    <Counter multiplier={multiplier} />
                    <button id="incmultiplier" onClick={() => setMultiplier(m => m + 1)} />
                </div>
            )
        }

        const { container } = render(<Parent />)

        expect(container.querySelector("span")!.innerHTML).toBe("10")
        expect(counterRender).toBe(1)
        expect(observerRender).toBe(1)

        act(() => {
            ;(container.querySelector("#inc")! as any).click()
        })
        expect(container.querySelector("span")!.innerHTML).toBe("11")
        expect(counterRender).toBe(2) // 1 would be better!
        expect(observerRender).toBe(2)

        act(() => {
            ;(container.querySelector("#incmultiplier")! as any).click()
        })
        expect(container.querySelector("span")!.innerHTML).toBe("22")
        expect(counterRender).toBe(4) // TODO: avoid double rendering here!
        expect(observerRender).toBe(4) // TODO: avoid double rendering here!
    })

    it("with <Observer>", () => {
        let counterRender = 0
        let observerRender = 0

        function Counter({ multiplier }: { multiplier: number }) {
            counterRender++
            const store = useLocalObservable(() => ({
                multiplier,
                count: 10,
                get multiplied() {
                    return this.multiplier * this.count
                },
                inc() {
                    this.count += 1
                }
            }))

            useEffect(() => {
                store.multiplier = multiplier
            }, [multiplier])
            return (
                <Observer>
                    {() => {
                        observerRender++
                        return (
                            <div>
                                Multiplied count: <span>{store.multiplied}</span>
                                <button id="inc" onClick={store.inc}>
                                    Increment
                                </button>
                            </div>
                        )
                    }}
                </Observer>
            )
        }

        function Parent() {
            const [multiplier, setMultiplier] = useState(1)

            return (
                <div>
                    <Counter multiplier={multiplier} />
                    <button id="incmultiplier" onClick={() => setMultiplier(m => m + 1)} />
                </div>
            )
        }

        const { container } = render(<Parent />)

        expect(container.querySelector("span")!.innerHTML).toBe("10")
        expect(counterRender).toBe(1)
        expect(observerRender).toBe(1)

        act(() => {
            ;(container.querySelector("#inc")! as any).click()
        })
        expect(container.querySelector("span")!.innerHTML).toBe("11")
        expect(counterRender).toBe(1)
        expect(observerRender).toBe(2)

        act(() => {
            ;(container.querySelector("#incmultiplier")! as any).click()
        })
        expect(container.querySelector("span")!.innerHTML).toBe("22")
        expect(counterRender).toBe(2)
        expect(observerRender).toBe(4)
    })

    it("with observer()", () => {
        let counterRender = 0

        const Counter = observer(({ multiplier }: { multiplier: number }) => {
            counterRender++

            const store = useLocalObservable(() => ({
                multiplier,
                count: 10,
                get multiplied() {
                    return this.multiplier * this.count
                },
                inc() {
                    this.count += 1
                }
            }))

            useEffect(() => {
                store.multiplier = multiplier
            }, [multiplier])

            return (
                <div>
                    Multiplied count: <span>{store.multiplied}</span>
                    <button id="inc" onClick={store.inc}>
                        Increment
                    </button>
                </div>
            )
        })

        function Parent() {
            const [multiplier, setMultiplier] = useState(1)

            return (
                <div>
                    <Counter multiplier={multiplier} />
                    <button id="incmultiplier" onClick={() => setMultiplier(m => m + 1)} />
                </div>
            )
        }

        const { container } = render(<Parent />)

        expect(container.querySelector("span")!.innerHTML).toBe("10")
        expect(counterRender).toBe(1)

        act(() => {
            ;(container.querySelector("#inc")! as any).click()
        })
        expect(container.querySelector("span")!.innerHTML).toBe("11")
        expect(counterRender).toBe(2)

        act(() => {
            ;(container.querySelector("#incmultiplier")! as any).click()
        })
        expect(container.querySelector("span")!.innerHTML).toBe("22")
        expect(counterRender).toBe(4) // TODO: should be 3
    })
})

test("useAsObservableSource with effects should work", () => {
    const multiplierSeenByEffect: number[] = []
    const valuesSeenByEffect: number[] = []
    const thingsSeenByEffect: Array<[number, number, number]> = []

    function Counter({ multiplier }: { multiplier: number }) {
        const store = useLocalObservable(() => ({
            multiplier,
            count: 10,
            get multiplied() {
                return this.multiplier * this.count
            },
            inc() {
                this.count += 1
            }
        }))

        useEffect(() => {
            store.multiplier = multiplier
        }, [multiplier])

        useEffect(
            () =>
                autorun(() => {
                    multiplierSeenByEffect.push(store.multiplier)
                }),
            []
        )
        useEffect(
            () =>
                autorun(() => {
                    valuesSeenByEffect.push(store.count)
                }),
            []
        )
        useEffect(
            () =>
                autorun(() => {
                    thingsSeenByEffect.push([store.multiplier, store.multiplied, multiplier]) // multiplier is trapped!
                }),
            []
        )

        return (
            <button id="inc" onClick={store.inc}>
                Increment
            </button>
        )
    }

    function Parent() {
        const [multiplier, setMultiplier] = useState(1)

        return (
            <div>
                <Counter multiplier={multiplier} />
                <button id="incmultiplier" onClick={() => setMultiplier(m => m + 1)} />
            </div>
        )
    }

    const { container } = render(<Parent />)

    act(() => {
        ;(container.querySelector("#inc")! as any).click()
    })

    act(() => {
        ;(container.querySelector("#incmultiplier")! as any).click()
    })

    expect(valuesSeenByEffect).toEqual([10, 11])
    expect(multiplierSeenByEffect).toEqual([1, 2])
    expect(thingsSeenByEffect).toEqual([
        [1, 10, 1],
        [1, 11, 1],
        [2, 22, 1]
    ])
})

describe("combining observer with props and stores", () => {
    it("keeps track of observable values", () => {
        const TestComponent = observer((props: any) => {
            const localStore = useLocalObservable(() => ({
                get value() {
                    return props.store.x + 5 * props.store.y
                }
            }))

            return <div>{localStore.value}</div>
        })
        const store = observable({ x: 5, y: 1 })
        const { container } = render(<TestComponent store={store} />)
        const div = container.querySelector("div")!
        expect(div.textContent).toBe("10")
        act(() => {
            store.y = 2
        })
        expect(div.textContent).toBe("15")
        act(() => {
            store.x = 10
        })
        expect(div.textContent).toBe("20")
    })

    it("allows non-observables to be used if specified as as source", () => {
        const renderedValues: number[] = []

        const TestComponent = observer((props: any) => {
            const localStore = useLocalObservable(() => ({
                y: props.y,
                get value() {
                    return props.store.x + 5 * this.y
                }
            }))
            localStore.y = props.y
            renderedValues.push(localStore.value)
            return <div>{localStore.value}</div>
        })
        const store = observable({ x: 5 })
        const { container, rerender } = render(<TestComponent store={store} y={1} />)
        const div = container.querySelector("div")!
        expect(div.textContent).toBe("10")
        rerender(<TestComponent store={store} y={2} />)
        expect(div.textContent).toBe("15")
        act(() => {
            store.x = 10
        })

        expect(renderedValues).toEqual([10, 15, 15, 20]) // TODO: should have one 15 less

        expect(container.querySelector("div")!.textContent).toBe("20")
    })
})

describe("enforcing actions", () => {
    it("'never' should work", () => {
        configure({ enforceActions: "never" })
        const { result } = renderHook(() => {
            const [thing, setThing] = React.useState("world")
            useLocalObservable(() => ({ hello: thing }))
            useEffect(() => setThing("react"), [])
        })
        expect(result.error).not.toBeDefined()
    })
    it("only when 'observed' should work", () => {
        configure({ enforceActions: "observed" })
        const { result } = renderHook(() => {
            const [thing, setThing] = React.useState("world")
            useLocalObservable(() => ({ hello: thing }))
            useEffect(() => setThing("react"), [])
        })
        expect(result.error).not.toBeDefined()
    })
    it("'always' should work", () => {
        configure({ enforceActions: "always" })
        const { result } = renderHook(() => {
            const [thing, setThing] = React.useState("world")
            useLocalObservable(() => ({ hello: thing }))
            useEffect(() => setThing("react"), [])
        })
        expect(result.error).not.toBeDefined()
    })
})

it("doesn't update a component while rendering a different component - #274", () => {
    // https://github.com/facebook/react/pull/17099

    const Parent = observer((props: any) => {
        const observableProps = useLocalObservable(() => props)
        useEffect(() => {
            Object.assign(observableProps, props)
        }, [props])

        return <Child observableProps={observableProps} />
    })

    const Child = observer(({ observableProps }: any) => {
        return observableProps.foo
    })

    const { container, rerender } = render(<Parent foo={1} />)
    expect(container.textContent).toBe("1")

    const restoreConsole = mockConsole()
    rerender(<Parent foo={2} />)
    expect(console.error).not.toHaveBeenCalled()
    restoreConsole()
    expect(container.textContent).toBe("2")
})
