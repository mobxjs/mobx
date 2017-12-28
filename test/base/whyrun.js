"use strict"

const mobx = require("../../")
const noop = () => {}

test("whyrun", () => {
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

    expect(whyRun(x, "fullname").match(/\[idle\]/)).toBeTruthy()
    expect(whyRun(x, "fullname").match(/suspended/)).toBeTruthy()

    const d = mobx.autorun("loggerzz", () => {
        x.fullname
        whyRun()
    })

    expect(lastButOneLine.match(/\[active\]/)).toBeTruthy()
    expect(lastButOneLine.match(/\.firstname/)).toBeTruthy()
    expect(lastButOneLine.match(/\.lastname/)).toBeTruthy()

    expect(lastLine.match(/loggerzz/)).toBeTruthy()
    expect(lastLine.match(/\[running\]/)).toBeTruthy()
    expect(lastLine.match(/\.fullname/)).toBeTruthy()

    expect(whyRun(x, "fullname").match(/\[idle\]/)).toBeTruthy()
    expect(whyRun(x, "fullname").match(/\.firstname/)).toBeTruthy()
    expect(whyRun(x, "fullname").match(/\.lastname/)).toBeTruthy()
    expect(whyRun(x, "fullname").match(/loggerzz/)).toBeTruthy()

    expect(whyRun(d).match(/\[idle\]/)).toBeTruthy()
    expect(whyRun(d).match(/\.fullname/)).toBeTruthy()

    expect(whyRun(d).match(/loggerzz/)).toBeTruthy()

    mobx.transaction(() => {
        x.firstname = "Veria"
        expect(whyRun(x, "fullname").match(/\[idle\]/)).toBeTruthy()

        expect(whyRun(d).match(/\[scheduled\]/)).toBeTruthy()
    })

    expect(lastButOneLine.match(/will re-run/)).toBeTruthy()
    expect(lastButOneLine.match(/\.firstname/)).toBeTruthy()
    expect(lastButOneLine.match(/\.lastname/)).toBeTruthy()
    expect(lastButOneLine.match(/\loggerzz/)).toBeTruthy()

    expect(lastLine.match(/\[running\]/)).toBeTruthy()
    expect(lastLine.match(/\.fullname/)).toBeTruthy()

    expect(whyRun(x, "fullname").match(/\[idle\]/)).toBeTruthy()
    expect(whyRun(x, "fullname").match(/\.firstname/)).toBeTruthy()
    expect(whyRun(x, "fullname").match(/\.lastname/)).toBeTruthy()
    expect(whyRun(x, "fullname").match(/loggerzz/)).toBeTruthy()

    expect(whyRun(d).match(/\[idle\]/)).toBeTruthy()
    expect(whyRun(d).match(/\.fullname/)).toBeTruthy()
    expect(whyRun(d).match(/loggerzz/)).toBeTruthy()

    d()

    expect(whyRun(d).match(/\[stopped\]/)).toBeTruthy()
    expect(whyRun(x, "fullname").match(/\[idle\]/)).toBeTruthy()
    expect(whyRun(x, "fullname").match(/suspended/)).toBeTruthy()
})
