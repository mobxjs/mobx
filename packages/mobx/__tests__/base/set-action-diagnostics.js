"use strict"

const { observable, autorun, configure, runInAction, intercept } = require("../../src/mobx.ts")

// Deletion must use the same action diagnostics as insertion and observable maps.
describe("observable set deletion action diagnostics", () => {
    test.each(["delete", "clear", "replace"])(
        "%s warns when observed state changes outside actions",
        operation => {
            const values = observable.set([1, 2])
            const dispose = autorun(() => Array.from(values))
            const warn = jest.spyOn(console, "warn").mockImplementation(() => {})
            configure({ enforceActions: "observed" })
            try {
                if (operation === "delete") values.delete(1)
                if (operation === "clear") values.clear()
                if (operation === "replace") values.replace([])
                expect(warn).toHaveBeenCalledWith(
                    expect.stringContaining(
                        "changing (observed) observable values without using an action"
                    )
                )
                expect(values.has(1)).toBe(false)
            } finally {
                configure({ enforceActions: "never" })
                dispose()
                warn.mockRestore()
            }
        }
    )

    test.each(["always", "observed", "never"])(
        "unobserved deletion respects %s",
        enforceActions => {
            const values = observable.set([1])
            const warn = jest.spyOn(console, "warn").mockImplementation(() => {})
            configure({ enforceActions })
            try {
                expect(values.delete(1)).toBe(true)
                expect(warn.mock.calls.length).toBe(enforceActions === "always" ? 1 : 0)
            } finally {
                configure({ enforceActions: "never" })
                warn.mockRestore()
            }
        }
    )

    test("action deletion remains quiet and preserves notifications and interception", () => {
        const values = observable.set([1, 2])
        const seen = []
        const dispose = autorun(() => seen.push(Array.from(values)))
        const stopIntercept = intercept(values, change => (change.oldValue === 2 ? null : change))
        const warn = jest.spyOn(console, "warn").mockImplementation(() => {})
        configure({ enforceActions: "always" })
        try {
            runInAction(() => {
                expect(values.delete(1)).toBe(true)
                expect(values.delete(2)).toBe(false)
                expect(values.delete(3)).toBe(false)
            })
            expect(seen).toEqual([[1, 2], [2]])
            expect(warn).not.toHaveBeenCalled()
        } finally {
            configure({ enforceActions: "never" })
            dispose()
            stopIntercept()
            warn.mockRestore()
        }
    })
})
