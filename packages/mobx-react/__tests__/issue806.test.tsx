import React from "react"
import { configure, observable } from "mobx"
import { observer } from "../src"
import { render } from "@testing-library/react"
import { withConsole } from "./utils/withConsole"

@observer
class Issue806Component extends React.Component<any> {
    render() {
        return (
            <span>
                {this.props.a}
                <Issue806Component2 propA={this.props.a} propB={this.props.b} />
            </span>
        )
    }
}

@observer
class Issue806Component2 extends React.Component<any> {
    render() {
        return (
            <span>
                {this.props.propA} - {this.props.propB}
            </span>
        )
    }
}

test("verify issue 806", () => {
    configure({
        observableRequiresReaction: true
    })

    const x = observable({
        a: 1
    })

    withConsole(["warn"], () => {
        render(<Issue806Component a={"a prop value"} b={"b prop value"} x={x} />)
        expect(console.warn).not.toHaveBeenCalled()
    })

    // make sure observableRequiresReaction is still working outside component
    withConsole(["warn"], () => {
        x.a.toString()
        expect(console.warn).toBeCalledTimes(1)
        expect(console.warn).toHaveBeenCalledWith(
            "[mobx] Observable 'ObservableObject@1.a' being read outside a reactive context."
        )
    })
})
