import { act, cleanup, render } from "@testing-library/react"
import { renderHook } from "@testing-library/react-hooks"
import { autorun, configure, observable } from "mobx"
import * as React from "react"
import { useEffect, useState } from "react"

import { Observer, observer, useAsObservableSource, useLocalStore } from "../src"
import { resetMobx } from "./utils"

afterEach(cleanup)
afterEach(resetMobx)

let consoleWarnMock: jest.SpyInstance | undefined
afterEach(() => {
    consoleWarnMock?.mockRestore()
})

describe("base useAsObservableSource should work", () => {
    it("with <Observer>", () => {
        consoleWarnMock = jest.spyOn(console, "warn").mockImplementation(() => {})
        let counterRender = 0
        let observerRender = 0

        function Counter({ multiplier }: { multiplier: number }) {
            counterRender++
            const observableProps = useAsObservableSource({ multiplier })

            const store = useLocalStore(() => ({
                count: 10,
                get multiplied() {
                    return observableProps.multiplier * this.count
                },
                inc() {
                    this.count += 1
                }
            }))

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
        expect(consoleWarnMock).toMatchSnapshot()
    })

    it("with observer()", () => {
        let counterRender = 0

        const Counter = observer(({ multiplier }: { multiplier: number }) => {
            counterRender++

            const observableProps = useAsObservableSource({ multiplier })
            const store = useLocalStore(() => ({
                count: 10,
                get multiplied() {
                    return observableProps.multiplier * this.count
                },
                inc() {
                    this.count += 1
                }
            }))

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
        const observableProps = useAsObservableSource({ multiplier })
        const store = useLocalStore(() => ({
            count: 10,
            get multiplied() {
                return observableProps.multiplier * this.count
            },
            inc() {
                this.count += 1
            }
        }))

        useEffect(
            () =>
                autorun(() => {
                    multiplierSeenByEffect.push(observableProps.multiplier)
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
                    thingsSeenByEffect.push([
                        observableProps.multiplier,
                        store.multiplied,
                        multiplier
                    ]) // multiplier is trapped!
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
            const localStore = useLocalStore(() => ({
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
            const obsProps = useAsObservableSource({ y: props.y })
            const localStore = useLocalStore(() => ({
                get value() {
                    return props.store.x + 5 * obsProps.y
                }
            }))

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

        // TODO: re-enable this line. When debugging, the correct value is returned from render,
        // which is also visible with renderedValues, however, querying the dom doesn't show the correct result
        // possible a bug with @testing-library/react?
        // expect(container.querySelector("div")!.textContent).toBe("20") // TODO: somehow this change is not visible in the tester!
    })
})

describe("enforcing actions", () => {
    it("'never' should work", () => {
        configure({ enforceActions: "never" })
        const { result } = renderHook(() => {
            const [thing, setThing] = React.useState("world")
            useAsObservableSource({ hello: thing })
            useEffect(() => setThing("react"), [])
        })
        expect(result.error).not.toBeDefined()
    })
    it("only when 'observed' should work", () => {
        configure({ enforceActions: "observed" })
        const { result } = renderHook(() => {
            const [thing, setThing] = React.useState("world")
            useAsObservableSource({ hello: thing })
            useEffect(() => setThing("react"), [])
        })
        expect(result.error).not.toBeDefined()
    })
    it("'always' should work", () => {
        configure({ enforceActions: "always" })
        const { result } = renderHook(() => {
            const [thing, setThing] = React.useState("world")
            useAsObservableSource({ hello: thing })
            useEffect(() => setThing("react"), [])
        })
        expect(result.error).not.toBeDefined()
    })
})
