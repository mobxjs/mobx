import * as mobx from "mobx"
import { _resetGlobalState } from "mobx"
import * as React from "react"
import { useEffect } from "react"
import { observer, useLocalObservable } from "mobx-react"
import { render } from "@testing-library/react"

let consoleWarnMock: jest.SpyInstance | undefined
afterEach(() => {
    consoleWarnMock?.mockRestore()
})

afterEach(() => {
    _resetGlobalState()
})

describe("enforcing actions", () => {
    it("'never' should work", () => {
        consoleWarnMock = jest.spyOn(console, "warn").mockImplementation(() => {})
        mobx.configure({ enforceActions: "never" })

        const Parent = observer(() => {
            const obs = useLocalObservable(() => ({
                x: 1
            }))
            useEffect(() => {
                obs.x++
            }, [])

            return <div>{obs.x}</div>
        })

        render(<Parent />)
        expect(consoleWarnMock).not.toBeCalled()
    })

    it("'observed' should work", () => {
        consoleWarnMock = jest.spyOn(console, "warn").mockImplementation(() => {})
        mobx.configure({ enforceActions: "observed" })

        const Parent = observer(() => {
            const obs = useLocalObservable(() => ({
                x: 1
            }))
            useEffect(() => {
                obs.x++
            }, [])

            return <div>{obs.x}</div>
        })

        render(<Parent />)
        expect(consoleWarnMock).toBeCalledTimes(1)
    })

    it("'always' should work", () => {
        consoleWarnMock = jest.spyOn(console, "warn").mockImplementation(() => {})
        mobx.configure({ enforceActions: "always" })

        const Parent = observer(() => {
            const obs = useLocalObservable(() => ({
                x: 1
            }))
            useEffect(() => {
                obs.x++
            }, [])

            return <div>{obs.x}</div>
        })

        render(<Parent />)
        expect(consoleWarnMock).toBeCalledTimes(1)
    })
})
