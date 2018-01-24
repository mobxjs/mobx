var m = require("../../src/mobx.ts")

test("untracked 1", function() {
    var cCalcs = 0,
        dCalcs = 0
    var a = m.observable(1)
    var b = m.observable(2)
    var c = m.computed(function() {
        cCalcs++
        return (
            a.get() +
            m.untracked(function() {
                return b.get()
            })
        )
    })
    var result

    var d = m.autorun(function() {
        dCalcs++
        result = c.get()
    })

    expect(result).toBe(3)
    expect(cCalcs).toBe(1)
    expect(dCalcs).toBe(1)

    b.set(3)
    expect(result).toBe(3)
    expect(cCalcs).toBe(1)
    expect(dCalcs).toBe(1)

    a.set(2)
    expect(result).toBe(5)
    expect(cCalcs).toBe(2)
    expect(dCalcs).toBe(2)
})
