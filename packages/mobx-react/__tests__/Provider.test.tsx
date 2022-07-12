import React from "react"
import { Provider } from "../src"
import { render } from "@testing-library/react"
import { MobXProviderContext } from "../src/Provider"
import { withConsole } from "./utils/withConsole"

describe("Provider", () => {
    it("should work in a simple case", () => {
        function A() {
            return (
                <Provider foo="bar">
                    <MobXProviderContext.Consumer>{({ foo }) => foo}</MobXProviderContext.Consumer>
                </Provider>
            )
        }

        const { container } = render(<A />)
        expect(container).toHaveTextContent("bar")
    })

    it("should not provide the children prop", () => {
        function A() {
            return (
                <Provider>
                    <MobXProviderContext.Consumer>
                        {stores =>
                            Reflect.has(stores, "children")
                                ? "children was provided"
                                : "children was not provided"
                        }
                    </MobXProviderContext.Consumer>
                </Provider>
            )
        }

        const { container } = render(<A />)
        expect(container).toHaveTextContent("children was not provided")
    })

    it("supports overriding stores", () => {
        function B() {
            return (
                <MobXProviderContext.Consumer>
                    {({ overridable, nonOverridable }) => `${overridable} ${nonOverridable}`}
                </MobXProviderContext.Consumer>
            )
        }

        function A() {
            return (
                <Provider overridable="original" nonOverridable="original">
                    <B />
                    <Provider overridable="overridden">
                        <B />
                    </Provider>
                </Provider>
            )
        }
        const { container } = render(<A />)
        expect(container).toMatchInlineSnapshot(`
<div>
  original original
  overridden original
</div>
`)
    })

    it("should throw an error when changing stores", () => {
        function A({ foo }) {
            return (
                <Provider foo={foo}>
                    <MobXProviderContext.Consumer>{({ foo }) => foo}</MobXProviderContext.Consumer>
                </Provider>
            )
        }

        const { rerender } = render(<A foo={1} />)

        withConsole(() => {
            expect(() => {
                rerender(<A foo={2} />)
            }).toThrow("The set of provided stores has changed.")
        })
    })
})
