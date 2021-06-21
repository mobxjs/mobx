"use strict"

import * as mobx from "../../../src/mobx"

describe("trace", () => {
    let consoleLogSpy
    beforeEach(() => {
        mobx._resetGlobalState()
        consoleLogSpy = jest.spyOn(console, "log").mockImplementation()
    })
    afterEach(() => {
        consoleLogSpy.mockRestore()
    })

    test("simple", () => {
        const expectedLogCalls: Array<any> = []
        const x = mobx.observable(
            {
                firstname: "Michel",
                lastname: "Weststrate",
                get fullname() {
                    /* test multi line comment
                    (run this unit test from VS code, and pass 'true'  as third argument to trace below to verify)
                */
                    const res = this.firstname + " " + this.lastname
                    mobx.trace(this, "fullname")
                    return res
                }
            },
            {},
            { name: "x" }
        )
        x.fullname
        expectedLogCalls.push(["[mobx.trace] 'x.fullname' tracing enabled"])

        x.fullname
        expectedLogCalls.push([
            "[mobx.trace] Computed value 'x.fullname' is being read outside a reactive context. Doing a full recompute."
        ])

        const dispose = mobx.autorun(
            () => {
                x.fullname
                mobx.trace()
            },
            { name: "autorun" }
        )
        expectedLogCalls.push(["[mobx.trace] 'autorun' tracing enabled"])

        mobx.transaction(() => {
            x.firstname = "John"
            expectedLogCalls.push([
                "[mobx.trace] 'x.fullname' is invalidated due to a change in: 'x.firstname'"
            ])
            x.lastname = "Doe"
        })

        expectedLogCalls.push([
            "[mobx.trace] 'autorun' is invalidated due to a change in: 'x.fullname'"
        ])

        dispose()

        expectedLogCalls.push([
            "[mobx.trace] Computed value 'x.fullname' was suspended and it will recompute on the next access."
        ])

        expect(expectedLogCalls).toEqual(consoleLogSpy.mock.calls)
    })

    test("Log only if derivation is actually about to re-run #2859", () => {
        const expectedLogCalls: Array<any> = []
        const x = mobx.observable(
            {
                foo: 0,
                get fooIsGreaterThan5() {
                    return this.foo > 5
                }
            },
            {},
            { name: "x" }
        )
        mobx.trace(x, "fooIsGreaterThan5")
        expectedLogCalls.push(["[mobx.trace] 'x.fooIsGreaterThan5' tracing enabled"])

        x.fooIsGreaterThan5
        expectedLogCalls.push([
            "[mobx.trace] Computed value 'x.fooIsGreaterThan5' is being read outside a reactive context. Doing a full recompute."
        ])

        const dispose = mobx.autorun(
            () => {
                mobx.trace(true)
                x.fooIsGreaterThan5
            },
            { name: "autorun" }
        )
        expectedLogCalls.push(["[mobx.trace] 'autorun' tracing enabled"])

        mobx.transaction(() => {
            x.foo = 1
            expectedLogCalls.push([
                "[mobx.trace] 'x.fooIsGreaterThan5' is invalidated due to a change in: 'x.foo'"
            ])
        })

        mobx.transaction(() => {
            x.foo = 6
            expectedLogCalls.push([
                "[mobx.trace] 'x.fooIsGreaterThan5' is invalidated due to a change in: 'x.foo'"
            ])
        })

        expectedLogCalls.push([
            "[mobx.trace] 'autorun' is invalidated due to a change in: 'x.fooIsGreaterThan5'"
        ])

        dispose()

        expectedLogCalls.push([
            "[mobx.trace] Computed value 'x.fooIsGreaterThan5' was suspended and it will recompute on the next access."
        ])

        expect(expectedLogCalls).toEqual(consoleLogSpy.mock.calls)
    })

    test("1850", () => {
        const x = mobx.observable({
            firstname: "Michel",
            lastname: "Weststrate",
            get fullname() {
                /* test multi line comment
                        (run this unit test from VS code, to manually verify serialization)
                    */
                const res = this.firstname + " " + this.lastname
                mobx.trace(this, "fullname", true)
                return res
            }
        })

        mobx.autorun(() => {
            x.fullname
        })
        expect(() => {
            x.firstname += "!"
        }).not.toThrow("Unexpected identifier")
    })
})
