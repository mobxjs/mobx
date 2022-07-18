import React from "react"
import { observer, Observer, useLocalStore, useAsObservableSource } from "../src"
import { render, act } from "@testing-library/react"

afterEach(() => {
    jest.useRealTimers()
})

let consoleWarnMock: jest.SpyInstance | undefined
afterEach(() => {
    consoleWarnMock?.mockRestore()
})

test("computed properties react to props when using hooks", async () => {
    jest.useFakeTimers()
    consoleWarnMock = jest.spyOn(console, "warn").mockImplementation(() => {})

    const seen: Array<string> = []

    const Child = ({ x }) => {
        const props = useAsObservableSource({ x })
        const store = useLocalStore(() => ({
            get getPropX() {
                return props.x
            }
        }))

        return (
            <Observer>{() => (seen.push(store.getPropX), (<div>{store.getPropX}</div>))}</Observer>
        )
    }

    const Parent = () => {
        const [state, setState] = React.useState({ x: 0 })
        seen.push("parent")
        React.useEffect(() => {
            setTimeout(() => {
                act(() => {
                    setState({ x: 2 })
                })
            })
        }, [])
        return <Child x={state.x} />
    }

    const { container } = render(<Parent />)
    expect(container).toHaveTextContent("0")

    act(() => {
        jest.runAllTimers()
    })
    expect(seen).toEqual(["parent", 0, "parent", 2])
    expect(container).toHaveTextContent("2")
    expect(consoleWarnMock).toMatchSnapshot()
})

test("computed properties result in double render when using observer instead of Observer", async () => {
    jest.useFakeTimers()

    const seen: Array<string> = []

    const Child = observer(({ x }) => {
        const props = useAsObservableSource({ x })
        const store = useLocalStore(() => ({
            get getPropX() {
                return props.x
            }
        }))

        seen.push(store.getPropX)
        return <div>{store.getPropX}</div>
    })

    const Parent = () => {
        const [state, setState] = React.useState({ x: 0 })
        seen.push("parent")
        React.useEffect(() => {
            setTimeout(() => {
                act(() => {
                    setState({ x: 2 })
                })
            }, 100)
        }, [])
        return <Child x={state.x} />
    }

    const { container } = render(<Parent />)
    expect(container).toHaveTextContent("0")

    act(() => {
        jest.runAllTimers()
    })
    expect(seen).toEqual([
        "parent",
        0,
        "parent",
        2,
        2 // should contain "2" only once! But with hooks, one update is scheduled based the fact that props change, the other because the observable source changed.
    ])
    expect(container).toHaveTextContent("2")
})
