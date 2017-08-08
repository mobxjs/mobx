var test = require("tape")
var mobx = require("..")
var reaction = mobx.reaction

test("basic", t => {
    var a = mobx.observable(1)
    var values = []

    var d = reaction(
        () => a.get(),
        newValue => {
            values.push(newValue)
        }
    )

    a.set(2)
    a.set(3)
    d()
    a.set(4)

    t.deepEqual(values, [2, 3])
    t.end()
})

test("effect fireImmediately is honored", t => {
    var a = mobx.observable(1)
    var values = []

    var d = reaction(
        () => a.get(),
        newValue => {
            values.push(newValue)
        },
        true
    )

    a.set(2)
    a.set(3)
    d()
    a.set(4)

    t.deepEqual(values, [1, 2, 3])
    t.end()
})

test("effect is untracked", t => {
    var a = mobx.observable(1)
    var b = mobx.observable(2)
    var values = []

    var d = reaction(
        () => a.get(),
        newValue => {
            values.push(newValue * b.get())
        },
        true
    )

    a.set(2)
    b.set(7) // shoudn't trigger a new change
    a.set(3)
    d()
    a.set(4)

    t.deepEqual(values, [2, 4, 21])
    t.end()
})

test("effect debounce is honored", t => {
    t.plan(2)

    var a = mobx.observable(1)
    var values = []
    var exprCount = 0

    var d = reaction(
        () => {
            exprCount++
            return a.get()
        },
        newValue => {
            values.push(newValue)
        },
        {
            delay: 100
        }
    )

    setTimeout(() => a.set(2), 30)
    setTimeout(() => a.set(3), 150) // should not be visible, combined with the next
    setTimeout(() => a.set(4), 160)
    setTimeout(() => a.set(5), 300)
    setTimeout(() => d(), 500)
    setTimeout(() => a.set(6), 700)

    setTimeout(() => {
        t.deepEqual(values, [2, 4, 5])
        t.equal(exprCount, 4)
    }, 900)
})

test("effect debounce + fire immediately is honored", t => {
    t.plan(2)

    var a = mobx.observable(1)
    var values = []
    var exprCount = 0

    var d = reaction(
        () => {
            exprCount++
            return a.get()
        },
        newValue => {
            values.push(newValue)
        },
        {
            fireImmediately: true,
            delay: 100
        }
    )

    setTimeout(() => a.set(3), 150)
    setTimeout(() => a.set(4), 300)

    setTimeout(() => {
        d()
        t.deepEqual(values, [1, 3, 4])
        t.equal(exprCount, 3)
    }, 500)
})

test("passes Reaction as an argument to expression function", t => {
    var a = mobx.observable(1)
    var values = []

    reaction(
        r => {
            if (a.get() === "pleaseDispose") r.dispose()
            return a.get()
        },
        newValue => {
            values.push(newValue)
        },
        true
    )

    a.set(2)
    a.set(2)
    a.set("pleaseDispose")
    a.set(3)
    a.set(4)

    t.deepEqual(values, [1, 2, "pleaseDispose"])
    t.end()
})

test("passes Reaction as an argument to effect function", t => {
    var a = mobx.observable(1)
    var values = []

    reaction(
        () => a.get(),
        (newValue, r) => {
            if (a.get() === "pleaseDispose") r.dispose()
            values.push(newValue)
        },
        true
    )

    a.set(2)
    a.set(2)
    a.set("pleaseDispose")
    a.set(3)
    a.set(4)

    t.deepEqual(values, [1, 2, "pleaseDispose"])
    t.end()
})

test("can dispose reaction on first run", t => {
    var a = mobx.observable(1)

    var valuesExpr1st = []
    reaction(
        () => a.get(),
        (newValue, r) => {
            r.dispose()
            valuesExpr1st.push(newValue)
        },
        true
    )

    var valuesEffect1st = []
    reaction(
        r => {
            r.dispose()
            return a.get()
        },
        newValue => {
            valuesEffect1st.push(newValue)
        },
        true
    )

    var valuesExpr = []
    reaction(
        () => a.get(),
        (newValue, r) => {
            r.dispose()
            valuesExpr.push(newValue)
        }
    )

    var valuesEffect = []
    reaction(
        r => {
            r.dispose()
            return a.get()
        },
        newValue => {
            valuesEffect.push(newValue)
        }
    )

    a.set(2)
    a.set(3)

    t.deepEqual(valuesExpr1st, [1])
    t.deepEqual(valuesEffect1st, [1])
    t.deepEqual(valuesExpr, [2])
    t.deepEqual(valuesEffect, [])
    t.end()
})

test("#278 do not rerun if expr output doesn't change", t => {
    var a = mobx.observable(1)
    var values = []

    var d = reaction(
        () => (a.get() < 10 ? a.get() : 11),
        newValue => {
            values.push(newValue)
        }
    )

    a.set(2)
    a.set(3)
    a.set(10)
    a.set(11)
    a.set(12)
    a.set(4)
    a.set(5)
    a.set(13)

    d()
    a.set(4)

    t.deepEqual(values, [2, 3, 11, 4, 5, 11])
    t.end()
})

test("#278 do not rerun if expr output doesn't change structurally", t => {
    var users = mobx.observable([
        {
            name: "jan",
            get uppername() {
                return this.name.toUpperCase()
            }
        },
        {
            name: "piet",
            get uppername() {
                return this.name.toUpperCase()
            }
        }
    ])
    var values = []

    var d = reaction(
        () => users.map(user => user.uppername),
        newValue => {
            values.push(newValue)
        },
        {
            fireImmediately: true,
            compareStructural: true
        }
    )

    users[0].name = "john"
    users[0].name = "JoHn"
    users[0].name = "jOHN"
    users[1].name = "johan"

    d()
    users[1].name = "w00t"

    t.deepEqual(values, [["JAN", "PIET"], ["JOHN", "PIET"], ["JOHN", "JOHAN"]])
    t.end()
})

test("do not rerun if prev & next expr output is NaN", t => {
    var v = mobx.observable("a")
    var values = []
    var valuesS = []

    var d = reaction(
        () => v.get(),
        newValue => {
            values.push(String(newValue))
        },
        { fireImmediately: true }
    )
    var dd = reaction(
        () => v.get(),
        newValue => {
            valuesS.push(String(newValue))
        },
        { fireImmediately: true, compareStructural: true }
    )

    v.set(NaN)
    v.set(NaN)
    v.set(NaN)
    v.set("b")

    d()
    dd()

    t.deepEqual(values, ["a", "NaN", "b"])
    t.deepEqual(valuesS, ["a", "NaN", "b"])
    t.end()
})

test("reaction uses equals", t => {
    const o = mobx.observable("a")
    const values = []
    const disposeReaction = mobx.reaction(
        () => o.get(),
        value => values.push(value.toLowerCase()),
        { equals: (from, to) => from.toUpperCase() === to.toUpperCase(), fireImmediately: true }
    )
    t.deepEqual(values, ["a"])
    o.set("A")
    t.deepEqual(values, ["a"])
    o.set("B")
    t.deepEqual(values, ["a", "b"])
    o.set("A")
    t.deepEqual(values, ["a", "b", "a"])

    disposeReaction()

    t.end()
})

test("reaction equals function only invoked when necessary", t => {
    const comparisons = []
    const loggingComparer = (from, to) => {
        comparisons.push({ from, to })
        return from === to
    }

    const left = mobx.observable("A")
    const right = mobx.observable("B")

    const values = []
    const disposeReaction = mobx.reaction(
        () => left.get().toLowerCase() + right.get().toLowerCase(),
        value => values.push(value),
        { equals: loggingComparer, fireImmediately: true }
    )

    // No comparison should be made on the first value
    t.deepEqual(comparisons, [])

    // First change will cause a comparison
    left.set("C")
    t.deepEqual(comparisons, [{ from: "ab", to: "cb" }])

    // Exception in the reaction expression won't cause a comparison
    left.set(null)
    t.deepEqual(comparisons, [{ from: "ab", to: "cb" }])

    // Another exception in the reaction expression won't cause a comparison
    right.set(null)
    t.deepEqual(comparisons, [{ from: "ab", to: "cb" }])

    // Transition from exception in the expression will cause a comparison with the last valid value
    left.set("D")
    right.set("E")
    t.deepEqual(comparisons, [{ from: "ab", to: "cb" }, { from: "cb", to: "de" }])

    // Another value change will cause a comparison
    right.set("F")
    t.deepEqual(comparisons, [
        { from: "ab", to: "cb" },
        { from: "cb", to: "de" },
        { from: "de", to: "df" }
    ])

    t.deepEqual(values, ["ab", "cb", "de", "df"])

    disposeReaction()

    t.end()
})
