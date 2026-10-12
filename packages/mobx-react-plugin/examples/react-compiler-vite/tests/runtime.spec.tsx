import { StrictMode } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { App } from "../src/App"
import { store } from "../src/store"

// Vitest runs the sources through the same Vite plugin pipeline as `vite dev`
// (mobx-react-plugin -> React -> React Compiler), so this is the compiled app.

describe("MobX + React Compiler runtime", () => {
    let consoleError: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
        consoleError = vi.spyOn(console, "error")
    })

    afterEach(() => {
        cleanup()
        consoleError.mockRestore()
    })

    test("protected components update, the unsafe control stays stale, the pure component works", () => {
        render(
            <StrictMode>
                <App />
            </StrictMode>
        )

        expect(screen.getByTestId("protected-count").textContent).toBe("0")
        expect(screen.getByTestId("protected-name").textContent).toBe("A!")
        expect(screen.getByTestId("protected-todos").textContent).toBe("A")
        expect(screen.getByTestId("control-count").textContent).toBe("0")
        expect(screen.getByTestId("pure-clicks").textContent).toBe("0")

        const button = screen.getByRole("button", { name: "Mutate store" })
        act(() => {
            fireEvent.click(button)
            fireEvent.click(button)
            fireEvent.click(button)
        })

        expect(store.count).toBe(3)
        expect(screen.getByTestId("protected-count").textContent).toBe("3")
        expect(screen.getByTestId("protected-name").textContent).toBe("B!")
        expect(screen.getByTestId("protected-todos").textContent).toBe("A, B, B, B")

        // Intentionally broken control (facebook/react#37000): React Compiler cached the JSX.
        expect(screen.getByTestId("control-count").textContent).toBe("0")

        // Compiled by React Compiler and driven by React state: works.
        expect(screen.getByTestId("pure-clicks").textContent).toBe("3")

        expect(consoleError).not.toHaveBeenCalled()
    })
})
