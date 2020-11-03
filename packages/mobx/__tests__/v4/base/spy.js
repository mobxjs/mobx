"use strict"
const mobx = require("../mobx4")
const utils = require("../../v5/utils/test-utils")

test("spy output", () => {
    const events = []

    const stop = mobx.spy(c => events.push(c))

    doStuff()

    stop()

    doStuff()

    events.forEach(ev => {
        delete ev.object
        delete ev.fn
        delete ev.time
    })

    expect(events).toMatchSnapshot()
})

function doStuff() {
    const a = mobx.observable.box(2)
    a.set(3)

    const b = mobx.observable({
        c: 4
    })
    b.c = 5
    mobx.extendObservable(b, { d: 6 })
    b.d = 7

    const e = mobx.observable([1, 2])
    e.push(3, 4)
    e.shift()
    e[2] = 5

    const f = mobx.observable.map({ g: 1 })
    f.delete("h")
    f.delete("g")
    f.set("i", 5)
    f.set("i", 6)

    const j = mobx.computed(() => a.get() * 2)

    mobx.autorun(() => {
        j.get()
    })

    a.set(4)

    mobx.transaction(function myTransaction() {
        a.set(5)
        a.set(6)
    })

    mobx.action("myTestAction", newValue => {
        a.set(newValue)
    }).call({}, 7)
}

test("spy error", () => {
    utils.supressConsole(() => {
        mobx._getGlobalState().mobxGuid = 0

        const a = mobx.observable({
            x: 2,
            get y() {
                if (this.x === 3) throw "Oops"
                return this.x * 2
            }
        })

        const events = []
        const stop = mobx.spy(c => events.push(c))

        const d = mobx.autorun(() => a.y, { name: "autorun" })

        a.x = 3

        events.forEach(x => {
            delete x.fn
            delete x.object
            delete x.time
        })

        expect(events).toMatchSnapshot()

        d()
        stop()
    })
})

test("spy stop listen from handler, #1459", () => {
    const stop = mobx.spy(() => stop())
    mobx.spy(() => {})
    doStuff()
})
