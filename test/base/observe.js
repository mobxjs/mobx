var m = require("../../src/mobx.ts")

test("observe object and map properties", function() {
    var map = m.observable.map({ a: 1 })
    var events = []

    expect(function() {
        m.observe(map, "b", function() {})
    }).toThrow()

    var d1 = m.observe(map, "a", function(e) {
        events.push([e.newValue, e.oldValue])
    })

    map.set("a", 2)
    map.set("a", 3)
    d1()
    map.set("a", 4)

    var o = m.observable({
        a: 5
    })

    expect(function() {
        m.observe(o, "b", function() {})
    }).toThrow()
    var d2 = m.observe(o, "a", function(e) {
        events.push([e.newValue, e.oldValue])
    })

    o.a = 6
    o.a = 7
    d2()
    o.a = 8

    expect(events).toEqual([[2, 1], [3, 2], [6, 5], [7, 6]])
})

test("observe computed values", function() {
    var events = []

    var v = m.observable(0)
    var f = m.observable(0)
    var c = m.computed(function() {
        return v.get()
    })

    var d2 = c.observe(function(e) {
        v.get()
        f.get()
        events.push([e.newValue, e.oldValue])
    })

    v.set(6)
    f.set(10)

    expect(events).toEqual([[6, 0]])
})
