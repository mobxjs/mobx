import React from "react"
import PropTypes from "prop-types"
import { observer } from "../src"
import { render, act } from "@testing-library/react"
import { observable } from "mobx"

const StatelessComp = ({ testProp }) => <div>result: {testProp}</div>

StatelessComp.propTypes = {
    testProp: PropTypes.string
}
StatelessComp.defaultProps = {
    testProp: "default value for prop testProp"
}

// skipping because `propTypes` and `defaultProps` are dropped in React 19
describe.skip("stateless component with propTypes", () => {
    const StatelessCompObserver: React.FunctionComponent<any> = observer(StatelessComp)

    test("default property value should be propagated", () => {
        expect(StatelessComp.defaultProps.testProp).toBe("default value for prop testProp")
        expect(StatelessCompObserver.defaultProps!.testProp).toBe("default value for prop testProp")
    })

    const originalConsoleError = console.error
    let beenWarned = false
    console.error = () => (beenWarned = true)
    // eslint-disable-next-line no-unused-vars
    const wrapper = <StatelessCompObserver testProp={10} />
    console.error = originalConsoleError

    test("an error should be logged with a property type warning", () => {
        expect(beenWarned).toBeTruthy()
    })

    test("render test correct", async () => {
        const { container } = render(<StatelessCompObserver testProp="hello world" />)
        expect(container.textContent).toBe("result: hello world")
    })
})

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
