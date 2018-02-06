"use strict"

const mobx = require("../../src/mobx.ts")

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
                var res = this.firstname + " " + this.lastname
                mobx.trace(this, "fullname")
                return res
            }
        })

        lines.push("- INIT -")
        x.fullname

        lines.push("- SECOND READ -")
        x.fullname

        lines.push("- REACTION -")

        const d = mobx.autorun("loggerzz", d => {
            x.fullname
            d.trace()
        })

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
