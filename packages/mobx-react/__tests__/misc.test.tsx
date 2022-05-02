import React from "react"
import { extendObservable, observable } from "mobx"
import { observer } from "../src"
import { act, render } from "@testing-library/react"

test("issue mobx 405", () => {
    function ExampleState() {
        // @ts-ignore
        extendObservable(this, {
            name: "test",
            get greetings() {
                return "Hello my name is " + this.name
            }
        })
    }

    const ExampleView = observer(
        class T extends React.Component<any, any> {
            render() {
                return (
                    <div>
                        <input
                            type="text"
                            onChange={e => (this.props.exampleState.name = e.target.value)}
                            value={this.props.exampleState.name}
                        />
                        <span>{this.props.exampleState.greetings}</span>
                    </div>
                )
            }
        }
    )

    const exampleState = new ExampleState()
    const { container } = render(<ExampleView exampleState={exampleState} />)
    expect(container).toMatchInlineSnapshot(`
<div>
  <div>
    <input
      type="text"
      value="test"
    />
    <span>
      Hello my name is test
    </span>
  </div>
</div>
`)
})

test("#85 Should handle state changing in constructors", () => {
    const a = observable.box(2)
    const Child = observer(
        class Child extends React.Component {
            constructor(p) {
                super(p)
                a.set(3) // one shouldn't do this!
                this.state = {}
            }
            render() {
                return (
                    <div>
                        child:
                        {a.get()} -{" "}
                    </div>
                )
            }
        }
    )
    const ParentWrapper = observer(function Parent() {
        return (
            <span>
                <Child />
                parent:
                {a.get()}
            </span>
        )
    })
    const { container } = render(<ParentWrapper />)
    expect(container).toHaveTextContent("child:3 - parent:3")

    act(() => a.set(5))
    expect(container).toHaveTextContent("child:5 - parent:5")

    act(() => a.set(7))
    expect(container).toHaveTextContent("child:7 - parent:7")
})
