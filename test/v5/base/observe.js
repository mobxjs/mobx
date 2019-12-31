const m = require("../../src/mobx.ts")

test("observe object and map properties", function() {
    const map = m.observable.map({ a: 1 })
    const events = []

    expect(function() {
        m.observe(map, "b", function() {})
    }).toThrow(/the entry 'b' does not exist in the observable map/)

    const d1 = m.observe(map, "a", function(e) {
        events.push([e.newValue, e.oldValue])
    })

    map.set("a", 2)
    map.set("a", 3)
    d1()
    map.set("a", 4)

    const o = m.observable({
        a: 5
    })

    expect(function() {
        m.observe(o, "b", function() {})
    }).toThrow(/no observable property 'b' found on the observable object/)
    const d2 = m.observe(o, "a", function(e) {
        events.push([e.newValue, e.oldValue])
    })

    o.a = 6
    o.a = 7
    d2()
    o.a = 8

    expect(events).toEqual([[2, 1], [3, 2], [6, 5], [7, 6]])
})

test("observe computed values", function() {
    const events = []

    const v = m.observable.box(0)
    const f = m.observable.box(0)
    const c = m.computed(function() {
        return v.get()
    })

    c.observe(function(e) {
        v.get()
        f.get()
        events.push([e.newValue, e.oldValue])
    })

    v.set(6)
    f.set(10)

    expect(events).toEqual([[6, 0]])
})
