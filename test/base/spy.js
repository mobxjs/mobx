"use strict"
var mobx = require("../../")

test("spy output", () => {
    var events = []

    var stop = mobx.spy(c => events.push(c))

    doStuff()

    stop()

    doStuff()

    events.forEach(ev => {
        delete ev.object
        delete ev.fn
        delete ev.time
    })

    expect(events.length).toBe(doStuffEvents.length)
    //t.deepEqual(events, doStuffEvents);

    events.forEach((ev, idx) => {
        expect(ev).toEqual(doStuffEvents[idx])
    })

    expect(events.filter(ev => ev.spyReportStart === true).length > 0).toBeTruthy()

    expect(events.filter(ev => ev.spyReportStart === true).length).toBe(events.filter(ev => ev.spyReportEnd === true).length)
})

function doStuff() {
    var a = mobx.observable(2)
    a.set(3)

    var b = mobx.observable({
        c: 4
    })
    b.c = 5
    mobx.extendObservable(b, { d: 6 })
    b.d = 7

    var e = mobx.observable([1, 2])
    e.push(3, 4)
    e.shift()
    e[2] = 5

    var f = mobx.map({ g: 1 })
    f.delete("h")
    f.delete("g")
    f.set("i", 5)
    f.set("i", 6)

    var j = mobx.computed(() => a.get() * 2)

    var stop = mobx.autorun(() => {
        j.get()
    })

    a.set(4)

    mobx.transaction(function myTransaction() {
        a.set(5)
        a.set(6)
    })

    mobx
        .action("myTestAction", newValue => {
            a.set(newValue)
        })
        .call({}, 7)
}

const doStuffEvents = [
    { newValue: 2, type: "create" },
    { newValue: 3, oldValue: 2, type: "update", spyReportStart: true },
    { spyReportEnd: true },
    { name: "c", newValue: 4, spyReportStart: true, type: "add" },
    { spyReportEnd: true },
    { name: "c", newValue: 5, oldValue: 4, spyReportStart: true, type: "update" },
    { spyReportEnd: true },
    { name: "d", newValue: 6, spyReportStart: true, type: "add" },
    { spyReportEnd: true },
    { name: "d", newValue: 7, oldValue: 6, spyReportStart: true, type: "update" },
    { spyReportEnd: true },
    {
        added: [1, 2],
        addedCount: 2,
        index: 0,
        removed: [],
        removedCount: 0,
        spyReportStart: true,
        type: "splice"
    },
    { spyReportEnd: true },
    {
        added: [3, 4],
        addedCount: 2,
        index: 2,
        removed: [],
        removedCount: 0,
        spyReportStart: true,
        type: "splice"
    },
    { spyReportEnd: true },
    {
        added: [],
        addedCount: 0,
        index: 0,
        removed: [1],
        removedCount: 1,
        spyReportStart: true,
        type: "splice"
    },
    { spyReportEnd: true },
    { index: 2, newValue: 5, oldValue: 4, spyReportStart: true, type: "update" },
    { spyReportEnd: true },
    { name: "g", newValue: 1, spyReportStart: true, type: "add" },
    { spyReportEnd: true },
    { name: "g", oldValue: 1, spyReportStart: true, type: "delete" },
    { spyReportEnd: true },
    { name: "i", newValue: 5, spyReportStart: true, type: "add" },
    { spyReportEnd: true },
    { name: "i", newValue: 6, oldValue: 5, spyReportStart: true, type: "update" },
    { spyReportEnd: true },
    { spyReportStart: true, type: "reaction" },
    { type: "compute" },
    { spyReportEnd: true },
    { newValue: 4, oldValue: 3, spyReportStart: true, type: "update" },
    { type: "compute" },
    { spyReportStart: true, type: "reaction" },
    { spyReportEnd: true },
    { spyReportEnd: true },
    { newValue: 5, oldValue: 4, spyReportStart: true, type: "update" },
    { spyReportEnd: true },
    { newValue: 6, oldValue: 5, spyReportStart: true, type: "update" },
    { spyReportEnd: true },
    { type: "compute" },
    { spyReportStart: true, type: "reaction" },
    { spyReportEnd: true },
    { name: "myTestAction", spyReportStart: true, arguments: [7], type: "action" },
    { newValue: 7, oldValue: 6, spyReportStart: true, type: "update" },
    { spyReportEnd: true },
    { type: "compute" },
    { spyReportStart: true, type: "reaction" },
    { spyReportEnd: true },
    { spyReportEnd: true }
]

test("spy error", () => {
    mobx.extras.getGlobalState().mobxGuid = 0

    const a = mobx.observable({
        x: 2,
        get y() {
            if (this.x === 3) throw "Oops"
            return this.x * 2
        }
    })

    var events = []
    var stop = mobx.spy(c => events.push(c))

    var d = mobx.autorun("autorun", () => a.y)

    a.x = 3

    events.forEach(x => {
        delete x.fn
        delete x.object
        delete x.time
    })

    expect(events).toEqual([
        { spyReportStart: true, type: "reaction" },
        { type: "compute" },
        { spyReportEnd: true },
        { name: "x", newValue: 3, oldValue: 2, spyReportStart: true, type: "update" },
        { type: "compute" },
        { spyReportStart: true, type: "reaction" },
        {
            error: "Oops",
            message:
                "[mobx] Encountered an uncaught exception that was thrown by a reaction or observer component, in: 'Reaction[autorun]",
            type: "error"
        },
        { spyReportEnd: true },
        { spyReportEnd: true }
    ])

    d()
    stop()
})
