import React, { createElement } from "react"
import {
    computed,
    isObservable,
    observable,
    reaction,
    transaction,
    IReactionDisposer,
    makeObservable
} from "mobx"
import { observer } from "../src"
import _ from "lodash"
import { act, render } from "@testing-library/react"

let topRenderCount = 0

const wizardModel = observable(
    {
        steps: [
            {
                title: "Size",
                active: true
            },
            {
                title: "Fabric",
                active: false
            },
            {
                title: "Finish",
                active: false
            }
        ],
        get activeStep() {
            return _.find(this.steps, "active")
        },
        activateNextStep: function () {
            const nextStep = this.steps[_.findIndex(this.steps, "active") + 1]
            if (!nextStep) {
                return false
            }
            this.setActiveStep(nextStep)
            return true
        },
        setActiveStep(modeToActivate) {
            const self = this
            transaction(() => {
                _.find(self.steps, "active").active = false
                modeToActivate.active = true
            })
        }
    } as any,
    {
        activateNextStep: observable.ref
    }
)

/** RENDERS **/

const Wizard = observer(
    class Wizard extends React.Component<any, any> {
        render() {
            return createElement(
                "div",
                null,
                <div>
                    <h1>Active Step: </h1>
                    <WizardStep step={this.props.model.activeStep} key="activeMode" tester />
                </div>,
                <div>
                    <h1>All Step: </h1>
                    <p>
                        Clicking on these steps will render the active step just once. This is what
                        I expected.
                    </p>
                    <WizardStep step={this.props.model.steps} key="modeList" />
                </div>
            )
        }
    }
)

const WizardStep = observer(
    class WizardStep extends React.Component<any, any> {
        renderCount = 0
        componentWillUnmount() {
            // console.log("Unmounting!")
        }
        render() {
            // weird test hack:
            if (this.props.tester === true) {
                topRenderCount++
            }
            return createElement(
                "div",
                { onClick: this.modeClickHandler },
                "RenderCount: " +
                    this.renderCount++ +
                    " " +
                    this.props.step.title +
                    ": isActive:" +
                    this.props.step.active
            )
        }
        modeClickHandler = () => {
            var step = this.props.step
            wizardModel.setActiveStep(step)
        }
    }
)

/** END RENDERERS **/

const changeStep = stepNumber => act(() => wizardModel.setActiveStep(wizardModel.steps[stepNumber]))

test("verify issue 21", () => {
    render(<Wizard model={wizardModel} />)
    expect(topRenderCount).toBe(1)
    changeStep(0)
    expect(topRenderCount).toBe(2)
    changeStep(2)
    expect(topRenderCount).toBe(3)
})

test("verify prop changes are picked up", () => {
    function createItem(subid, label) {
        const res = observable(
            {
                subid,
                id: 1,
                label: label,
                get text() {
                    events.push(["compute", this.subid])
                    return (
                        this.id +
                        "." +
                        this.subid +
                        "." +
                        this.label +
                        "." +
                        data.items.indexOf(this as any)
                    )
                }
            },
            {},
            { proxy: false }
        )
        res.subid = subid // non reactive
        return res
    }
    const data = observable({
        items: [createItem(1, "hi")]
    })
    const events: Array<any> = []
    const Child = observer(
        class Child extends React.Component<any, any> {
            componentDidUpdate(prevProps) {
                events.push(["update", prevProps.item.subid, this.props.item.subid])
            }
            render() {
                events.push(["render", this.props.item.subid, this.props.item.text])
                return <span>{this.props.item.text}</span>
            }
        }
    )

    const Parent = observer(
        class Parent extends React.Component<any, any> {
            render() {
                return (
                    <div onClick={changeStuff.bind(this)} id="testDiv">
                        {data.items.map(item => (
                            <Child key="fixed" item={item} />
                        ))}
                    </div>
                )
            }
        }
    )

    const Wrapper = () => <Parent />

    function changeStuff() {
        act(() => {
            transaction(() => {
                data.items[0].label = "hello" // schedules state change for Child
                data.items[0] = createItem(2, "test") // Child should still receive new prop!
            })

            // @ts-ignore
            this.setState({}) // trigger update
        })
    }

    const { container } = render(<Wrapper />)
    expect(events.sort()).toEqual(
        [
            ["compute", 1],
            ["render", 1, "1.1.hi.0"]
        ].sort()
    )
    events.splice(0)
    let testDiv = container.querySelector("#testDiv")! as HTMLElement
    testDiv.click()
    expect(events.sort()).toEqual(
        [
            ["compute", 1],
            ["update", 1, 2],
            ["compute", 2],
            ["render", 2, "1.2.test.0"]
        ].sort()
    )
    expect(container.textContent).toMatchInlineSnapshot(`"1.2.test.0"`)
})

test("verify props is reactive", () => {
    function createItem(subid, label) {
        const res = observable(
            {
                subid,
                id: 1,
                label: label,
                get text() {
                    events.push(["compute", this.subid])
                    return (
                        this.id +
                        "." +
                        this.subid +
                        "." +
                        this.label +
                        "." +
                        data.items.indexOf(this as any)
                    )
                }
            },
            {},
            { proxy: false }
        )
        res.subid = subid // non reactive
        return res
    }

    const data = observable({
        items: [createItem(1, "hi")]
    })
    const events: Array<any> = []

    class Child extends React.Component<any, any> {
        constructor(p) {
            super(p)
            makeObservable(this)
        }

        @computed
        get computedLabel() {
            events.push(["computed label", this.props.item.subid])
            return this.props.item.label
        }
        componentDidMount() {
            events.push(["mount"])
        }
        componentDidUpdate(prevProps) {
            events.push(["update", prevProps.item.subid, this.props.item.subid])
        }
        render() {
            events.push(["render", this.props.item.subid, this.props.item.text, this.computedLabel])
            return (
                <span>
                    {this.props.item.text}
                    {this.computedLabel}
                </span>
            )
        }
    }

    const ChildAsObserver = observer(Child)

    const Parent = observer(
        class Parent extends React.Component<any, any> {
            render() {
                return (
                    <div onClick={changeStuff.bind(this)} id="testDiv">
                        {data.items.map(item => (
                            <ChildAsObserver key="fixed" item={item} />
                        ))}
                    </div>
                )
            }
        }
    )

    const Wrapper = () => <Parent />

    function changeStuff() {
        act(() => {
            transaction(() => {
                // components start rendeirng a new item, but computed is still based on old value
                data.items = [createItem(2, "test")]
            })
        })
    }

    const { container } = render(<Wrapper />)
    expect(events.sort()).toEqual(
        [["mount"], ["compute", 1], ["computed label", 1], ["render", 1, "1.1.hi.0", "hi"]].sort()
    )

    events.splice(0)
    let testDiv = container.querySelector("#testDiv") as HTMLElement
    testDiv.click()

    expect(events.sort()).toEqual(
        [
            ["compute", 1],
            ["update", 1, 2],
            ["compute", 2],
            ["computed label", 2],
            ["render", 2, "1.2.test.0", "test"]
        ].sort()
    )
})

test("no re-render for shallow equal props", async () => {
    function createItem(subid, label) {
        const res = observable({
            subid,
            id: 1,
            label: label
        })
        res.subid = subid // non reactive
        return res
    }

    const data = observable({
        items: [createItem(1, "hi")],
        parentValue: 0
    })
    const events: Array<Array<any>> = []

    const Child = observer(
        class Child extends React.Component<any, any> {
            componentDidMount() {
                events.push(["mount"])
            }
            componentDidUpdate(prevProps) {
                events.push(["update", prevProps.item.subid, this.props.item.subid])
            }
            render() {
                events.push(["render", this.props.item.subid, this.props.item.label])
                return <span>{this.props.item.label}</span>
            }
        }
    )

    const Parent = observer(
        class Parent extends React.Component<any, any> {
            render() {
                // "object has become observable!"
                expect(isObservable(this.props.nonObservable)).toBeFalsy()
                events.push(["parent render", data.parentValue])
                return (
                    <div onClick={changeStuff.bind(this)} id="testDiv">
                        {data.items.map(item => (
                            <Child key="fixed" item={item} value={5} />
                        ))}
                    </div>
                )
            }
        }
    )

    const Wrapper = () => <Parent nonObservable={{}} />

    function changeStuff() {
        act(() => {
            data.items[0].label = "hi" // no change.
            data.parentValue = 1 // rerender parent
        })
    }

    const { container } = render(<Wrapper />)
    expect(events.sort()).toEqual([["parent render", 0], ["mount"], ["render", 1, "hi"]].sort())
    events.splice(0)
    let testDiv = container.querySelector("#testDiv") as HTMLElement
    testDiv.click()
    expect(events.sort()).toEqual([["parent render", 1]].sort())
})

test("lifecycle callbacks called with correct arguments", () => {
    var Comp = observer(
        class Comp extends React.Component<any, any> {
            componentDidUpdate(prevProps) {
                expect(prevProps.counter).toBe(0)
                expect(this.props.counter).toBe(1)
            }
            render() {
                return (
                    <div>
                        <span key="1">{[this.props.counter]}</span>
                        <button key="2" id="testButton" onClick={this.props.onClick} />
                    </div>
                )
            }
        }
    )
    const Root = class T extends React.Component<any, any> {
        state = { counter: 0 }
        onButtonClick = () => {
            act(() => this.setState({ counter: (this.state.counter || 0) + 1 }))
        }
        render() {
            return <Comp counter={this.state.counter || 0} onClick={this.onButtonClick} />
        }
    }
    const { container } = render(<Root />)
    let testButton = container.querySelector("#testButton") as HTMLElement
    testButton.click()
})

test("verify props are reactive in constructor", () => {
    const propValues: Array<any> = []
    let constructorCallsCount = 0

    const Component = observer(
        class Component extends React.Component<any, any> {
            disposer: IReactionDisposer
            constructor(props, context) {
                super(props, context)
                constructorCallsCount++
                this.disposer = reaction(
                    () => this.props.prop,
                    prop => propValues.push(prop),
                    {
                        fireImmediately: true
                    }
                )
            }

            componentWillUnmount() {
                this.disposer()
            }

            render() {
                return <div />
            }
        }
    )

    const { rerender } = render(<Component prop="1" />)
    rerender(<Component prop="2" />)
    rerender(<Component prop="3" />)
    rerender(<Component prop="4" />)
    expect(constructorCallsCount).toEqual(1)
    expect(propValues).toEqual(["1", "2", "3", "4"])
})
