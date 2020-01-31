const m = require("../../../src/v4/mobx.ts")

test("untracked 1", function() {
    let cCalcs = 0,
        dCalcs = 0
    const a = m.observable.box(1)
    const b = m.observable.box(2)
    const c = m.computed(function() {
        cCalcs++
        return (
            a.get() +
            m.untracked(function() {
                return b.get()
            })
        )
    })
    let result

    m.autorun(function() {
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
