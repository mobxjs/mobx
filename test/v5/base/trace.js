"use strict"

const mobx = require("../../../src/v5/mobx.ts")
const utils = require("../utils/test-utils")

test("trace", () => {
    mobx._resetGlobalState()
    const baselog = console.log
    try {
        const lines = []
        console.log = function() {
            lines.push(arguments)
        }

        const x = mobx.observable({
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
        })

        lines.push("- INIT -")
        x.fullname

        lines.push("- SECOND READ -")
        x.fullname

        lines.push("- REACTION -")

        const d = mobx.autorun(
            d => {
                x.fullname
                d.trace()
            },
            { name: "loggerzz" }
        )

        lines.push("- CHANGE -")

        mobx.transaction(() => {
            x.firstname = "John"
            x.lastname = "Doe"
        })

        lines.push("- DISPOSE -")

        d()

        expect(lines).toMatchSnapshot()
    } finally {
        console.log = baselog
    }
})

test("1850", () => {
    utils.supressConsole(() => {
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
