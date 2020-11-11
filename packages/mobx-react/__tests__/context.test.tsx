import React from "react"
import { observable } from "mobx"
import { Provider, observer, inject } from "../src"
import { withConsole } from "./utils/withConsole"
import { render, act } from "@testing-library/react"
import { any } from "prop-types"

test("no warnings in modern react", () => {
    const box = observable.box(3)
    const Child = inject("store")(
        observer(
            class Child extends React.Component<any, any> {
                render() {
                    return (
                        <div>
                            {this.props.store} + {box.get()}
                        </div>
                    )
                }
            }
        )
    )

    class App extends React.Component {
        render() {
            return (
                <div>
                    <React.StrictMode>
                        <Provider store="42">
                            <Child />
                        </Provider>
                    </React.StrictMode>
                </div>
            )
        }
    }

    const { container } = render(<App />)
    expect(container).toHaveTextContent("42 + 3")

    withConsole(["info", "warn", "error"], () => {
        act(() => {
            box.set(4)
        })
        expect(container).toHaveTextContent("42 + 4")

        expect(console.info).not.toHaveBeenCalled()
        expect(console.warn).not.toHaveBeenCalled()
        expect(console.error).not.toHaveBeenCalled()
    })
})

test("getDerivedStateFromProps works #447", () => {
    class Main extends React.Component<any, any> {
        static getDerivedStateFromProps(nextProps, prevState) {
            return {
                count: prevState.count + 1
            }
        }

        state = {
            count: 0
        }

        render() {
            return (
                <div>
                    <h2>{`${this.state.count ? "One " : "No "}${this.props.thing}`}</h2>
                </div>
            )
        }
    }

    const MainInjected = inject(({ store }) => ({ thing: store.thing }))(Main)

    const store = { thing: 3 }

    const App = () => (
        <Provider store={store}>
            <MainInjected />
        </Provider>
    )

    const { container } = render(<App />)
    expect(container).toHaveTextContent("One 3")
})

test("no double runs for getDerivedStateFromProps", () => {
    let derived = 0
    @observer
    class Main extends React.Component<any, any> {
        state = {
            activePropertyElementMap: {}
        }

        constructor(props) {
            // console.log("CONSTRUCTOR")
            super(props)
        }

        static getDerivedStateFromProps() {
            derived++
            // console.log("PREVSTATE", nextProps)
            return null
        }

        render() {
            return <div>Test-content</div>
        }
    }
    // This results in
    //PREVSTATE
    //CONSTRUCTOR
    //PREVSTATE
    let MainInjected = inject(() => ({
        componentProp: "def"
    }))(Main)
    // Uncomment the following line to see default behaviour (without inject)
    //CONSTRUCTOR
    //PREVSTATE
    //MainInjected = Main;

    const store = {}

    const App = () => (
        <Provider store={store}>
            <MainInjected injectedProp={"abc"} />
        </Provider>
    )

    const { container } = render(<App />)
    expect(container).toHaveTextContent("Test-content")
    expect(derived).toBe(1)
})
