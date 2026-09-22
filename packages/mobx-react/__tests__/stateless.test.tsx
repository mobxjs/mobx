import React from "react"
import { observer } from "../src"
import { render, act } from "@testing-library/react"
import { observable } from "mobx"

test("stateless component with context support", () => {
    const C = React.createContext<any>({})

    const StateLessCompWithContext = () => (
        <C.Consumer>{value => <div>context: {value.testContext}</div>}</C.Consumer>
    )

    const StateLessCompWithContextObserver = observer(StateLessCompWithContext)

    const ContextProvider = () => (
        <C.Provider value={{ testContext: "hello world" }}>
            <StateLessCompWithContextObserver />
        </C.Provider>
    )

    const { container } = render(<ContextProvider />)
    expect(container.textContent).toBe("context: hello world")
})

describe("stateless component with forwardRef", () => {
    const a = observable({
        x: 1
    })
    const ForwardRefCompObserver: React.ForwardRefExoticComponent<any> = observer(
        React.forwardRef(({ testProp }, ref) => {
            return (
                <div>
                    result: {testProp}, {ref ? "got ref" : "no ref"}, a.x: {a.x}
                </div>
            )
        })
    )

    test("render test correct", () => {
        const { container } = render(
            <ForwardRefCompObserver testProp="hello world" ref={React.createRef()} />
        )
        expect(container).toMatchSnapshot()
    })

    test("is reactive", () => {
        const { container } = render(
            <ForwardRefCompObserver testProp="hello world" ref={React.createRef()} />
        )
        act(() => {
            a.x++
        })
        expect(container).toMatchSnapshot()
    })
})
