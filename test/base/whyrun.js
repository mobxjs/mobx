"use strict"

const mobx = require("../../src/mobx.ts")
const noop = () => {}

test("whyrun", () => {
    mobx._resetGlobalState()
    const baselog = console.log
    let lastButOneLine = ""
    let lastLine = ""

    const whyRun = function() {
        lastButOneLine = lastLine
        console.log = noop
        lastLine = mobx.whyRun.apply(null, arguments)
        console.log = baselog
        return lastLine
    }

    const x = mobx.observable({
        firstname: "Michel",
        lastname: "Weststrate",
        get fullname() {
            var res = this.firstname + " " + this.lastname
            whyRun()
            return res
        }
    })

    x.fullname
    // TODO: enable this assertion
    // t.ok(lastLine.match(/suspended/), "just accessed fullname"); // no normal report, just a notification that nothing is being derived atm

    expect(whyRun(x, "fullname")).toMatchSnapshot()

    const d = mobx.autorun("loggerzz", () => {
        x.fullname
        whyRun()
    })

    expect(lastButOneLine).toMatchSnapshot()

    expect(lastLine).toMatchSnapshot()

    expect(whyRun(x, "fullname")).toMatchSnapshot()

    expect(whyRun(d)).toMatchSnapshot()

    mobx.transaction(() => {
        x.firstname = "Veria"
        expect(whyRun(x, "fullname").match(/\[idle\]/)).toBeTruthy()

        expect(whyRun(d).match(/\[scheduled\]/)).toBeTruthy()
    })

    expect(lastButOneLine).toMatchSnapshot()

    expect(lastLine).toMatchSnapshot()

    expect(whyRun(x, "fullname")).toMatchSnapshot()

    expect(whyRun(d)).toMatchSnapshot()

    d()

    expect(whyRun(d)).toMatchSnapshot()
    expect(whyRun(x, "fullname")).toMatchSnapshot()
})

test("trace", () => {
    mobx.extras.resetGlobalState()
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
