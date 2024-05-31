import React from "react"
import { disposeOnUnmount, observer } from "../src"
import { render } from "@testing-library/react"
import { MockedComponentClass } from "react-dom/test-utils"

interface ClassC extends MockedComponentClass {
    methodA?: any
    methodB?: any
    methodC?: any
    methodD?: any
}

function testComponent(C: ClassC, afterMount?: Function, afterUnmount?: Function) {
    const ref = React.createRef<ClassC>()
    const { unmount } = render(<C ref={ref} />)

    let cref = ref.current
    expect(cref?.methodA).not.toHaveBeenCalled()
    expect(cref?.methodB).not.toHaveBeenCalled()
    if (afterMount) {
        afterMount(cref)
    }

    unmount()

    expect(cref?.methodA).toHaveBeenCalledTimes(1)
    expect(cref?.methodB).toHaveBeenCalledTimes(1)
    if (afterUnmount) {
        afterUnmount(cref)
    }
}

describe("without observer", () => {
    test("class without componentWillUnmount", async () => {
        class C extends React.Component {
            @disposeOnUnmount
            methodA = jest.fn()
            @disposeOnUnmount
            methodB = jest.fn()
            @disposeOnUnmount
            methodC = null
            @disposeOnUnmount
            methodD = undefined

            render() {
                return null
            }
        }

        testComponent(C)
    })

    test("class with componentWillUnmount in the prototype", () => {
        let called = 0

        class C extends React.Component {
            @disposeOnUnmount
            methodA = jest.fn()
            @disposeOnUnmount
            methodB = jest.fn()
            @disposeOnUnmount
            methodC = null
            @disposeOnUnmount
            methodD = undefined

            render() {
                return null
            }

            componentWillUnmount() {
                called++
            }
        }

        testComponent(
            C,
            () => {
                expect(called).toBe(0)
            },
            () => {
                expect(called).toBe(1)
            }
        )
    })

    test.skip("class with componentWillUnmount as an arrow function", () => {
        let called = 0

        class C extends React.Component {
            @disposeOnUnmount
            methodA = jest.fn()
            @disposeOnUnmount
            methodB = jest.fn()
            @disposeOnUnmount
            methodC = null
            @disposeOnUnmount
            methodD = undefined

            render() {
                return null
            }

            componentWillUnmount = () => {
                called++
            }
        }

        testComponent(
            C,
            () => {
                expect(called).toBe(0)
            },
            () => {
                expect(called).toBe(1)
            }
        )
    })

    test("class without componentWillUnmount using non decorator version", () => {
        let methodC = jest.fn()
        let methodD = jest.fn()
        class C extends React.Component {
            render() {
                return null
            }

            methodA = disposeOnUnmount(this, jest.fn())
            methodB = disposeOnUnmount(this, jest.fn())

            constructor(props) {
                super(props)
                disposeOnUnmount(this, [methodC, methodD])
            }
        }

        testComponent(
            C,
            () => {
                expect(methodC).not.toHaveBeenCalled()
                expect(methodD).not.toHaveBeenCalled()
            },
            () => {
                expect(methodC).toHaveBeenCalledTimes(1)
                expect(methodD).toHaveBeenCalledTimes(1)
            }
        )
    })
})

describe("with observer", () => {
    test("class without componentWillUnmount", () => {
        @observer
        class C extends React.Component {
            @disposeOnUnmount
            methodA = jest.fn()
            @disposeOnUnmount
            methodB = jest.fn()
            @disposeOnUnmount
            methodC = null
            @disposeOnUnmount
            methodD = undefined

            render() {
                return null
            }
        }

        testComponent(C)
    })

    test("class with componentWillUnmount in the prototype", () => {
        let called = 0

        @observer
        class C extends React.Component {
            @disposeOnUnmount
            methodA = jest.fn()
            @disposeOnUnmount
            methodB = jest.fn()
            @disposeOnUnmount
            methodC = null
            @disposeOnUnmount
            methodD = undefined

            render() {
                return null
            }

            componentWillUnmount() {
                called++
            }
        }

        testComponent(
            C,
            () => {
                expect(called).toBe(0)
            },
            () => {
                expect(called).toBe(1)
            }
        )
    })

    test.skip("class with componentWillUnmount as an arrow function", () => {
        let called = 0

        @observer
        class C extends React.Component {
            @disposeOnUnmount
            methodA = jest.fn()
            @disposeOnUnmount
            methodB = jest.fn()
            @disposeOnUnmount
            methodC = null
            @disposeOnUnmount
            methodD = undefined

            render() {
                return null
            }

            componentWillUnmount = () => {
                called++
            }
        }

        testComponent(
            C,
            () => {
                expect(called).toBe(0)
            },
            () => {
                expect(called).toBe(1)
            }
        )
    })

    test("class without componentWillUnmount using non decorator version", () => {
        let methodC = jest.fn()
        let methodD = jest.fn()

        @observer
        class C extends React.Component {
            render() {
                return null
            }

            methodA = disposeOnUnmount(this, jest.fn())
            methodB = disposeOnUnmount(this, jest.fn())

            constructor(props) {
                super(props)
                disposeOnUnmount(this, [methodC, methodD])
            }
        }

        testComponent(
            C,
            () => {
                expect(methodC).not.toHaveBeenCalled()
                expect(methodD).not.toHaveBeenCalled()
            },
            () => {
                expect(methodC).toHaveBeenCalledTimes(1)
                expect(methodD).toHaveBeenCalledTimes(1)
            }
        )
    })
})

it("componentDidMount should be different between components", () => {
    function doTest(withObserver) {
        const events: Array<string> = []

        class A extends React.Component {
            didMount
            willUnmount

            componentDidMount() {
                this.didMount = "A"
                events.push("mountA")
            }

            componentWillUnmount() {
                this.willUnmount = "A"
                events.push("unmountA")
            }

            render() {
                return null
            }
        }

        class B extends React.Component {
            didMount
            willUnmount

            componentDidMount() {
                this.didMount = "B"
                events.push("mountB")
            }

            componentWillUnmount() {
                this.willUnmount = "B"
                events.push("unmountB")
            }

            render() {
                return null
            }
        }

        if (withObserver) {
            // @ts-ignore
            // eslint-disable-next-line no-class-assign
            A = observer(A)
            // @ts-ignore
            // eslint-disable-next-line no-class-assign
            B = observer(B)
        }

        const aRef = React.createRef<A>()
        const { rerender, unmount } = render(<A ref={aRef} />)
        const caRef = aRef.current

        expect(caRef?.didMount).toBe("A")
        expect(caRef?.willUnmount).toBeUndefined()
        expect(events).toEqual(["mountA"])

        const bRef = React.createRef<B>()
        rerender(<B ref={bRef} />)
        const cbRef = bRef.current

        expect(caRef?.didMount).toBe("A")
        expect(caRef?.willUnmount).toBe("A")

        expect(cbRef?.didMount).toBe("B")
        expect(cbRef?.willUnmount).toBeUndefined()
        expect(events).toEqual(["mountA", "unmountA", "mountB"])

        unmount()

        expect(caRef?.didMount).toBe("A")
        expect(caRef?.willUnmount).toBe("A")

        expect(cbRef?.didMount).toBe("B")
        expect(cbRef?.willUnmount).toBe("B")
        expect(events).toEqual(["mountA", "unmountA", "mountB", "unmountB"])
    }

    doTest(true)
    doTest(false)
})

test("base cWU should not be called if overridden", () => {
    let baseCalled = 0
    let dCalled = 0
    let oCalled = 0

    class C extends React.Component {
        componentWillUnmount() {
            baseCalled++
        }

        constructor(props) {
            super(props)
            this.componentWillUnmount = () => {
                oCalled++
            }
        }

        render() {
            return null
        }

        @disposeOnUnmount
        fn() {
            dCalled++
        }
    }
    const { unmount } = render(<C />)
    unmount()
    expect(dCalled).toBe(1)
    expect(oCalled).toBe(1)
    expect(baseCalled).toBe(0)
})

test("should error on inheritance", () => {
    class C extends React.Component {
        render() {
            return null
        }
    }

    expect(() => {
        // eslint-disable-next-line no-unused-vars
        class B extends C {
            @disposeOnUnmount
            fn() {}
        }
    }).toThrow("disposeOnUnmount only supports direct subclasses")
})

test("should error on inheritance - 2", () => {
    class C extends React.Component {
        render() {
            return null
        }
    }

    class B extends C {
        fn
        constructor(props) {
            super(props)
            expect(() => {
                this.fn = disposeOnUnmount(this, function () {})
            }).toThrow("disposeOnUnmount only supports direct subclasses")
        }
    }

    render(<B />)
})

describe("should work with arrays", () => {
    test("as a function", () => {
        class C extends React.Component {
            methodA = jest.fn()
            methodB = jest.fn()

            componentDidMount() {
                disposeOnUnmount(this, [this.methodA, this.methodB])
            }

            render() {
                return null
            }
        }

        testComponent(C)
    })

    test("as a decorator", () => {
        class C extends React.Component {
            methodA = jest.fn()
            methodB = jest.fn()

            @disposeOnUnmount
            disposers = [this.methodA, this.methodB]

            render() {
                return null
            }
        }

        testComponent(C)
    })
})

it("runDisposersOnUnmount only runs disposers from the declaring instance", () => {
    class A extends React.Component {
        @disposeOnUnmount
        a = jest.fn()

        b = jest.fn()

        constructor(props) {
            super(props)
            disposeOnUnmount(this, this.b)
        }

        render() {
            return null
        }
    }

    const ref1 = React.createRef<A>()
    const ref2 = React.createRef<A>()
    const { unmount } = render(<A ref={ref1} />)
    render(<A ref={ref2} />)
    const inst1 = ref1.current
    const inst2 = ref2.current
    unmount()

    expect(inst1?.a).toHaveBeenCalledTimes(1)
    expect(inst1?.b).toHaveBeenCalledTimes(1)
    expect(inst2?.a).toHaveBeenCalledTimes(0)
    expect(inst2?.b).toHaveBeenCalledTimes(0)
})
