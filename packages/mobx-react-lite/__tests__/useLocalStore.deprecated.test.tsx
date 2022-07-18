import * as React from "react"
import { act, cleanup, fireEvent, render } from "@testing-library/react"

import { Observer, observer, useLocalStore } from "../src"
import { useEffect, useState } from "react"
import { autorun } from "mobx"

afterEach(cleanup)

let consoleWarnMock: jest.SpyInstance | undefined
afterEach(() => {
    consoleWarnMock?.mockRestore()
})

test("base useLocalStore should work", () => {
    consoleWarnMock = jest.spyOn(console, "warn").mockImplementation(() => {})
    let counterRender = 0
    let observerRender = 0
    let outerStoreRef: any

    function Counter() {
        counterRender++
        const store = (outerStoreRef = useLocalStore(() => ({
            count: 0,
            count2: 0, // not used in render
            inc() {
                this.count += 1
            }
        })))

        return (
            <Observer>
                {() => {
                    observerRender++
                    return (
                        <div>
                            Count: <span>{store.count}</span>
                            <button onClick={store.inc}>Increment</button>
                        </div>
                    )
                }}
            </Observer>
        )
    }

    const { container } = render(<Counter />)

    expect(container.querySelector("span")!.innerHTML).toBe("0")
    expect(counterRender).toBe(1)
    expect(observerRender).toBe(1)

    act(() => {
        container.querySelector("button")!.click()
    })
    expect(container.querySelector("span")!.innerHTML).toBe("1")
    expect(counterRender).toBe(1)
    expect(observerRender).toBe(2)

    act(() => {
        outerStoreRef.count++
    })
    expect(container.querySelector("span")!.innerHTML).toBe("2")
    expect(counterRender).toBe(1)
    expect(observerRender).toBe(3)

    act(() => {
        outerStoreRef.count2++
    })
    // No re-render!
    expect(container.querySelector("span")!.innerHTML).toBe("2")
    expect(counterRender).toBe(1)
    expect(observerRender).toBe(3)
    expect(consoleWarnMock).toMatchSnapshot()
})

describe("is used to keep observable within component body", () => {
    it("value can be changed over renders", () => {
        const TestComponent = () => {
            const obs = useLocalStore(() => ({
                x: 1,
                y: 2
            }))
            return (
                <div onClick={() => (obs.x += 1)}>
                    {obs.x}-{obs.y}
                </div>
            )
        }
        const { container, rerender } = render(<TestComponent />)
        const div = container.querySelector("div")!
        expect(div.textContent).toBe("1-2")
        fireEvent.click(div)
        // observer not used, need to render from outside
        rerender(<TestComponent />)
        expect(div.textContent).toBe("2-2")
    })

    it("works with observer as well", () => {
        let renderCount = 0

        const TestComponent = observer(() => {
            renderCount++

            const obs = useLocalStore(() => ({
                x: 1,
                y: 2
            }))
            return (
                <div onClick={() => (obs.x += 1)}>
                    {obs.x}-{obs.y}
                </div>
            )
        })
        const { container } = render(<TestComponent />)
        const div = container.querySelector("div")!
        expect(div.textContent).toBe("1-2")
        fireEvent.click(div)
        expect(div.textContent).toBe("2-2")
        fireEvent.click(div)
        expect(div.textContent).toBe("3-2")

        // though render 3 times, mobx.observable only called once
        expect(renderCount).toBe(3)
    })

    it("actions can be used", () => {
        const TestComponent = observer(() => {
            const obs = useLocalStore(() => ({
                x: 1,
                y: 2,
                inc() {
                    obs.x += 1
                }
            }))
            return (
                <div onClick={obs.inc}>
                    {obs.x}-{obs.y}
                </div>
            )
        })
        const { container } = render(<TestComponent />)
        const div = container.querySelector("div")!
        expect(div.textContent).toBe("1-2")
        fireEvent.click(div)
        expect(div.textContent).toBe("2-2")
    })

    it("computed properties works as well", () => {
        const TestComponent = observer(() => {
            const obs = useLocalStore(() => ({
                x: 1,
                y: 2,
                get z() {
                    return obs.x + obs.y
                }
            }))
            return <div onClick={() => (obs.x += 1)}>{obs.z}</div>
        })
        const { container } = render(<TestComponent />)
        const div = container.querySelector("div")!
        expect(div.textContent).toBe("3")
        fireEvent.click(div)
        expect(div.textContent).toBe("4")
    })

    it("computed properties can use local functions", () => {
        const TestComponent = observer(() => {
            const obs = useLocalStore(() => ({
                x: 1,
                y: 2,
                getMeThatX() {
                    return this.x
                },
                get z() {
                    return this.getMeThatX() + obs.y
                }
            }))
            return <div onClick={() => (obs.x += 1)}>{obs.z}</div>
        })
        const { container } = render(<TestComponent />)
        const div = container.querySelector("div")!
        expect(div.textContent).toBe("3")
        fireEvent.click(div)
        expect(div.textContent).toBe("4")
    })

    it("transactions are respected", () => {
        const seen: number[] = []

        const TestComponent = observer(() => {
            const obs = useLocalStore(() => ({
                x: 1,
                inc(delta: number) {
                    this.x += delta
                    this.x += delta
                }
            }))

            useEffect(
                () =>
                    autorun(() => {
                        seen.push(obs.x)
                    }),
                []
            )

            return (
                <div
                    onClick={() => {
                        obs.inc(2)
                    }}
                >
                    Test
                </div>
            )
        })
        const { container } = render(<TestComponent />)
        const div = container.querySelector("div")!
        fireEvent.click(div)
        expect(seen).toEqual([1, 5]) // No 3!
    })

    it("Map can used instead of object", () => {
        const TestComponent = observer(() => {
            const map = useLocalStore(() => new Map([["initial", 10]]))
            return (
                <div onClick={() => map.set("later", 20)}>
                    {Array.from(map).map(([key, value]) => (
                        <div key={key}>
                            {key} - {value}
                        </div>
                    ))}
                </div>
            )
        })
        const { container } = render(<TestComponent />)
        const div = container.querySelector("div")!
        expect(div.textContent).toBe("initial - 10")
        fireEvent.click(div)
        expect(div.textContent).toBe("initial - 10later - 20")
    })

    describe("with props", () => {
        it("and useObserver", () => {
            consoleWarnMock = jest.spyOn(console, "warn").mockImplementation(() => {})
            let counterRender = 0
            let observerRender = 0

            function Counter({ multiplier }: { multiplier: number }) {
                counterRender++

                const store = useLocalStore(
                    props => ({
                        count: 10,
                        get multiplied() {
                            return props.multiplier * this.count
                        },
                        inc() {
                            this.count += 1
                        }
                    }),
                    { multiplier }
                )

                return (
                    <Observer>
                        {() => (
                            observerRender++,
                            (
                                <div>
                                    Multiplied count: <span>{store.multiplied}</span>
                                    <button id="inc" onClick={store.inc}>
                                        Increment
                                    </button>
                                </div>
                            )
                        )}
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
            expect(counterRender).toBe(1) // or 2
            expect(observerRender).toBe(2)

            act(() => {
                ;(container.querySelector("#incmultiplier")! as any).click()
            })
            expect(container.querySelector("span")!.innerHTML).toBe("22")
            expect(counterRender).toBe(2)
            expect(observerRender).toBe(3)
            expect(consoleWarnMock).toMatchSnapshot()
        })

        it("with <Observer>", () => {
            let counterRender = 0
            let observerRender = 0

            function Counter({ multiplier }: { multiplier: number }) {
                counterRender++

                const store = useLocalStore(
                    props => ({
                        count: 10,
                        get multiplied() {
                            return props.multiplier * this.count
                        },
                        inc() {
                            this.count += 1
                        }
                    }),
                    { multiplier }
                )

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
            expect(observerRender).toBe(3)
        })

        it("with observer()", () => {
            let counterRender = 0

            const Counter = observer(({ multiplier }: { multiplier: number }) => {
                counterRender++

                const store = useLocalStore(
                    props => ({
                        count: 10,
                        get multiplied() {
                            return props.multiplier * this.count
                        },
                        inc() {
                            this.count += 1
                        }
                    }),
                    { multiplier }
                )

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
})
