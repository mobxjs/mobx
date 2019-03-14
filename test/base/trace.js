"use strict"

const mobx = require("../../src/mobx.ts")
const utils = require("../utils/test-utils")

const { computed, observable, autorun, runInAction, trace } = mobx

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

test("trace - #1803", () => {
    mobx._resetGlobalState()
    const baselog = console.log
    try {
        const lines = []
        console.log = function() {
            lines.push(arguments)
        }

        const a = observable.box(null, { name: "a" })

        const b = computed(
            () => {
                void a.get()
                return 2
            },
            { name: "b" }
        )

        const c = observable.box(null, { name: "c" })

        const final = computed(
            () => {
                trace()
                c.get()
                b.get()
                return {}
            },
            { name: "final" }
        )

        autorun(() => {
            console.log(final.get())
        })

        runInAction(() => {
            a.set(1)
            c.set(1)
        })

        runInAction(() => {
            a.set(2)
            c.set(2)
        })

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
                var res = this.firstname + " " + this.lastname
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
