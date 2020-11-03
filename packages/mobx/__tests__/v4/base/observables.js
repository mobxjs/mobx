"use strict"

const mobx = require("../mobx4")
const m = mobx
const { $mobx, makeObservable, observable, computed, transaction, autorun, extendObservable } = mobx
const utils = require("../../v5/utils/test-utils")

const voidObserver = function () {}

function buffer() {
    const b = []
    const res = function (x) {
        if (typeof x.newValue === "object") {
            const copy = { ...x.newValue }
            delete copy[$mobx]
            b.push(copy)
        } else {
            b.push(x.newValue)
        }
    }
    res.toArray = function () {
        return b
    }
    return res
}

test("argumentless observable", () => {
    const a = observable.box()

    expect(m.isObservable(a)).toBe(true)
    expect(a.get()).toBe(undefined)
})

test("basic", function () {
    const x = observable.box(3)
    const b = buffer()
    m.observe(x, b)
    expect(3).toBe(x.get())

    x.set(5)
    expect(5).toBe(x.get())
    expect([5]).toEqual(b.toArray())
    expect(mobx._isComputingDerivation()).toBe(false)
})

test("basic2", function () {
    const x = observable.box(3)
    const z = computed(function () {
        return x.get() * 2
    })
    const y = computed(function () {
        return x.get() * 3
    })

    m.observe(z, voidObserver)

    expect(z.get()).toBe(6)
    expect(y.get()).toBe(9)

    x.set(5)
    expect(z.get()).toBe(10)
    expect(y.get()).toBe(15)

    expect(mobx._isComputingDerivation()).toBe(false)
})

test("computed with asStructure modifier", function () {
    const x1 = observable.box(3)
    const x2 = observable.box(5)
    const y = m.computed(
        function () {
            return {
                sum: x1.get() + x2.get()
            }
        },
        { compareStructural: true }
    )
    const b = buffer()
    m.observe(y, b, true)

    expect(8).toBe(y.get().sum)

    x1.set(4)
    expect(9).toBe(y.get().sum)

    m.transaction(function () {
        // swap values, computation results is structuraly unchanged
        x1.set(5)
        x2.set(4)
    })

    expect(b.toArray()).toEqual([{ sum: 8 }, { sum: 9 }])
    expect(mobx._isComputingDerivation()).toBe(false)
})

test("dynamic", function (done) {
    try {
        const x = observable.box(3)
        const y = m.computed(function () {
            return x.get()
        })
        const b = buffer()
        m.observe(y, b, true)

        expect(3).toBe(y.get()) // First evaluation here..

        x.set(5)
        expect(5).toBe(y.get())

        expect(b.toArray()).toEqual([3, 5])
        expect(mobx._isComputingDerivation()).toBe(false)

        done()
    } catch (e) {
        console.log(e.stack)
    }
})

test("dynamic2", function (done) {
    try {
        const x = observable.box(3)
        const y = computed(function () {
            return x.get() * x.get()
        })

        expect(9).toBe(y.get())
        const b = buffer()
        m.observe(y, b)

        x.set(5)
        expect(25).toBe(y.get())

        //no intermediate value 15!
        expect([25]).toEqual(b.toArray())
        expect(mobx._isComputingDerivation()).toBe(false)

        done()
    } catch (e) {
        console.log(e.stack)
    }
})

test("box uses equals", function (done) {
    try {
        const x = observable.box("a", {
            equals: (oldValue, newValue) => {
                return oldValue.toLowerCase() === newValue.toLowerCase()
            }
        })

        const b = buffer()
        m.observe(x, b)

        x.set("A")
        x.set("b")
        x.set("B")
        x.set("C")

        expect(["b", "C"]).toEqual(b.toArray())
        expect(mobx._isComputingDerivation()).toBe(false)

        done()
    } catch (e) {
        console.log(e.stack)
    }
})

test("box uses equals2", function (done) {
    try {
        const x = observable.box("01", {
            equals: (oldValue, newValue) => {
                return parseInt(oldValue) === parseInt(newValue)
            }
        })

        const y = computed(function () {
            return parseInt(x)
        })

        const b = buffer()
        m.observe(y, b)

        x.set("2")
        x.set("02")
        x.set("002")
        x.set("03")

        expect([2, 3]).toEqual(b.toArray())
        expect(mobx._isComputingDerivation()).toBe(false)

        done()
    } catch (e) {
        console.log(e.stack)
    }
})

test("readme1", function (done) {
    try {
        const b = buffer()

        const vat = observable.box(0.2)
        const order = {}
        order.price = observable.box(10)
        // Prints: New price: 24
        // in TS, just: value(() => this.price() * (1+vat()))
        order.priceWithVat = computed(function () {
            return order.price.get() * (1 + vat.get())
        })

        m.observe(order.priceWithVat, b)

        order.price.set(20)
        expect([24]).toEqual(b.toArray())
        order.price.set(10)
        expect([24, 12]).toEqual(b.toArray())
        expect(mobx._isComputingDerivation()).toBe(false)

        done()
    } catch (e) {
        console.log(e.stack)
        throw e
    }
})

test("batch", function () {
    const a = observable.box(2)
    const b = observable.box(3)
    const c = computed(function () {
        return a.get() * b.get()
    })
    const d = computed(function () {
        return c.get() * b.get()
    })
    const buf = buffer()
    m.observe(d, buf)

    a.set(4)
    b.set(5)
    // Note, 60 should not happen! (that is d begin computed before c after update of b)
    expect(buf.toArray()).toEqual([36, 100])

    const x = mobx.transaction(function () {
        a.set(2)
        b.set(3)
        a.set(6)
        expect(d.value_).toBe(100) // not updated; in transaction
        expect(d.get()).toBe(54) // consistent due to inspection
        return 2
    })

    expect(x).toBe(2) // test return value
    expect(buf.toArray()).toEqual([36, 100, 54]) // only one new value for d
})

test("transaction with inspection", function () {
    const a = observable.box(2)
    let calcs = 0
    const b = computed(function () {
        calcs++
        return a.get() * 2
    })

    // if not inspected during transaction, postpone value to end
    mobx.transaction(function () {
        a.set(3)
        expect(b.get()).toBe(6)
        expect(calcs).toBe(1)
    })
    expect(b.get()).toBe(6)
    expect(calcs).toBe(2)

    // if inspected, evaluate eagerly
    mobx.transaction(function () {
        a.set(4)
        expect(b.get()).toBe(8)
        expect(calcs).toBe(3)
    })
    expect(b.get()).toBe(8)
    expect(calcs).toBe(4)
})

test("transaction with inspection 2", function () {
    const a = observable.box(2)
    let calcs = 0
    let b
    mobx.autorun(function () {
        calcs++
        b = a.get() * 2
    })

    // if not inspected during transaction, postpone value to end
    mobx.transaction(function () {
        a.set(3)
        expect(b).toBe(4)
        expect(calcs).toBe(1)
    })
    expect(b).toBe(6)
    expect(calcs).toBe(2)

    // if inspected, evaluate eagerly
    mobx.transaction(function () {
        a.set(4)
        expect(b).toBe(6)
        expect(calcs).toBe(2)
    })
    expect(b).toBe(8)
    expect(calcs).toBe(3)
})

test("scope", function () {
    const vat = observable.box(0.2)
    const Order = function () {
        this.price = observable.box(20)
        this.amount = observable.box(2)
        this.total = computed(
            function () {
                return (1 + vat.get()) * this.price.get() * this.amount.get()
            },
            { context: this }
        )
    }

    const order = new Order()
    m.observe(order.total, voidObserver)
    order.price.set(10)
    order.amount.set(3)
    expect(36).toBe(order.total.get())
    expect(mobx._isComputingDerivation()).toBe(false)
})

test("props1", function () {
    const vat = observable.box(0.2)
    const Order = function () {
        mobx.extendObservable(this, {
            price: 20,
            amount: 2,
            get total() {
                return (1 + vat.get()) * this.price * this.amount // price and amount are now properties!
            }
        })
    }

    const order = new Order()
    expect(48).toBe(order.total)
    order.price = 10
    order.amount = 3
    expect(36).toBe(order.total)

    const totals = []
    const sub = mobx.autorun(function () {
        totals.push(order.total)
    })
    order.amount = 4
    sub()
    order.amount = 5
    expect(totals).toEqual([36, 48])

    expect(mobx._isComputingDerivation()).toBe(false)
})

test("props2", function () {
    const vat = observable.box(0.2)
    const Order = function () {
        mobx.extendObservable(this, {
            price: 20,
            amount: 2,
            get total() {
                return (1 + vat.get()) * this.price * this.amount // price and amount are now properties!
            }
        })
    }

    const order = new Order()
    expect(48).toBe(order.total)
    order.price = 10
    order.amount = 3
    expect(36).toBe(order.total)
})

test("props4", function () {
    function Bzz() {
        mobx.extendObservable(this, {
            fluff: [1, 2],
            get sum() {
                return this.fluff.reduce(function (a, b) {
                    return a + b
                }, 0)
            }
        })
    }

    const x = new Bzz()
    x.fluff
    expect(x.sum).toBe(3)
    x.fluff.push(3)
    expect(x.sum).toBe(6)
    x.fluff = [5, 6]
    expect(x.sum).toBe(11)
    x.fluff.push(2)
    expect(x.sum).toBe(13)
})

test("object enumerable props", function () {
    const x = mobx.observable({
        a: 3,
        get b() {
            return 2 * this.a
        }
    })
    mobx.extendObservable(x, { c: 4 })
    const ar = []
    for (const key in x) ar.push(key)
    expect(ar).toEqual(["a", "c"])
})

test("observe property", function () {
    const sb = []
    const mb = []

    const Wrapper = function (chocolateBar) {
        mobx.extendObservable(this, {
            chocolateBar: chocolateBar,
            get calories() {
                return this.chocolateBar.calories
            }
        })
    }

    const snickers = mobx.observable({
        calories: null
    })
    const mars = mobx.observable({
        calories: undefined
    })

    const wrappedSnickers = new Wrapper(snickers)
    const wrappedMars = new Wrapper(mars)

    const disposeSnickers = mobx.autorun(function () {
        sb.push(wrappedSnickers.calories)
    })
    const disposeMars = mobx.autorun(function () {
        mb.push(wrappedMars.calories)
    })
    snickers.calories = 10
    mars.calories = 15

    disposeSnickers()
    disposeMars()
    snickers.calories = 5
    mars.calories = 7

    expect(sb).toEqual([null, 10])
    expect(mb).toEqual([undefined, 15])
})

test("observe object", function () {
    let events = []
    const a = observable({
        a: 1,
        get da() {
            return this.a * 2
        }
    })
    const stop = m.observe(a, function (change) {
        expect(change.observableKind).toEqual("object")
        delete change.observableKind
        delete change.debugObjectName
        events.push(change)
    })

    a.a = 2
    mobx.extendObservable(a, {
        b: 3
    })
    a.a = 4
    a.b = 5
    expect(events).toEqual([
        {
            type: "update",
            object: a,
            name: "a",
            newValue: 2,
            oldValue: 1
        },
        {
            type: "add",
            object: a,
            newValue: 3,
            name: "b"
        },
        {
            type: "update",
            object: a,
            name: "a",
            newValue: 4,
            oldValue: 2
        },
        {
            type: "update",
            object: a,
            name: "b",
            newValue: 5,
            oldValue: 3
        }
    ])

    stop()
    events = []
    a.a = 6
    expect(events.length).toBe(0)
})

test("mobx.observe", function () {
    const events = []
    const o = observable({ b: 2 })
    const ar = observable([3])
    const map = mobx.observable.map({})

    const push = function (event) {
        delete event.debugObjectName
        events.push(event)
    }

    const stop2 = mobx.observe(o, push)
    const stop3 = mobx.observe(ar, push)
    const stop4 = mobx.observe(map, push)

    o.b = 5
    ar[0] = 6
    map.set("d", 7)

    stop2()
    stop3()
    stop4()

    o.b = 9
    ar[0] = 10
    map.set("d", 11)

    expect(events).toEqual([
        {
            type: "update",
            observableKind: "object",
            object: o,
            name: "b",
            newValue: 5,
            oldValue: 2
        },
        {
            type: "update",
            observableKind: "array",
            object: ar,
            index: 0,
            newValue: 6,
            oldValue: 3
        },
        {
            type: "add",
            observableKind: "map",
            object: map,
            newValue: 7,
            name: "d"
        }
    ])
})

test("change count optimization", function () {
    let bCalcs = 0
    let cCalcs = 0
    const a = observable.box(3)
    const b = computed(function () {
        bCalcs += 1
        return 4 + a.get() - a.get()
    })
    const c = computed(function () {
        cCalcs += 1
        return b.get()
    })

    m.observe(c, voidObserver)

    expect(b.get()).toBe(4)
    expect(c.get()).toBe(4)
    expect(bCalcs).toBe(1)
    expect(cCalcs).toBe(1)

    a.set(5)

    expect(b.get()).toBe(4)
    expect(c.get()).toBe(4)
    expect(bCalcs).toBe(2)
    expect(cCalcs).toBe(1)

    expect(mobx._isComputingDerivation()).toBe(false)
})

test("observables removed", function () {
    let calcs = 0
    const a = observable.box(1)
    const b = observable.box(2)
    const c = computed(function () {
        calcs++
        if (a.get() === 1) return b.get() * a.get() * b.get()
        return 3
    })

    expect(calcs).toBe(0)
    m.observe(c, voidObserver)
    expect(c.get()).toBe(4)
    expect(calcs).toBe(1)
    a.set(2)
    expect(c.get()).toBe(3)
    expect(calcs).toBe(2)

    b.set(3) // should not retrigger calc
    expect(c.get()).toBe(3)
    expect(calcs).toBe(2)

    a.set(1)
    expect(c.get()).toBe(9)
    expect(calcs).toBe(3)

    expect(mobx._isComputingDerivation()).toBe(false)
})

test("lazy evaluation", function () {
    let bCalcs = 0
    let cCalcs = 0
    let dCalcs = 0
    let observerChanges = 0

    const a = observable.box(1)
    const b = computed(function () {
        bCalcs += 1
        return a.get() + 1
    })

    const c = computed(function () {
        cCalcs += 1
        return b.get() + 1
    })

    expect(bCalcs).toBe(0)
    expect(cCalcs).toBe(0)
    expect(c.get()).toBe(3)
    expect(bCalcs).toBe(1)
    expect(cCalcs).toBe(1)

    expect(c.get()).toBe(3)
    expect(bCalcs).toBe(2)
    expect(cCalcs).toBe(2)

    a.set(2)
    expect(bCalcs).toBe(2)
    expect(cCalcs).toBe(2)

    expect(c.get()).toBe(4)
    expect(bCalcs).toBe(3)
    expect(cCalcs).toBe(3)

    const d = computed(function () {
        dCalcs += 1
        return b.get() * 2
    })

    const handle = m.observe(
        d,
        function () {
            observerChanges += 1
        },
        false
    )
    expect(bCalcs).toBe(4)
    expect(cCalcs).toBe(3)
    expect(dCalcs).toBe(1) // d is evaluated, so that its dependencies are known

    a.set(3)
    expect(d.get()).toBe(8)
    expect(bCalcs).toBe(5)
    expect(cCalcs).toBe(3)
    expect(dCalcs).toBe(2)

    expect(c.get()).toBe(5)
    expect(bCalcs).toBe(5)
    expect(cCalcs).toBe(4)
    expect(dCalcs).toBe(2)

    expect(b.get()).toBe(4)
    expect(bCalcs).toBe(5)
    expect(cCalcs).toBe(4)
    expect(dCalcs).toBe(2)

    handle() // unlisten
    expect(d.get()).toBe(8)
    expect(bCalcs).toBe(6) // gone to sleep
    expect(cCalcs).toBe(4)
    expect(dCalcs).toBe(3)

    expect(observerChanges).toBe(1)

    expect(mobx._isComputingDerivation()).toBe(false)
})

test("multiple view dependencies", function () {
    let bCalcs = 0
    let dCalcs = 0
    const a = observable.box(1)
    const b = computed(function () {
        bCalcs++
        return 2 * a.get()
    })
    const c = observable.box(2)
    const d = computed(function () {
        dCalcs++
        return 3 * c.get()
    })

    let zwitch = true
    const buffer = []
    let fCalcs = 0
    const dis = mobx.autorun(function () {
        fCalcs++
        if (zwitch) buffer.push(b.get() + d.get())
        else buffer.push(d.get() + b.get())
    })

    zwitch = false
    c.set(3)
    expect(bCalcs).toBe(1)
    expect(dCalcs).toBe(2)
    expect(fCalcs).toBe(2)
    expect(buffer).toEqual([8, 11])

    c.set(4)
    expect(bCalcs).toBe(1)
    expect(dCalcs).toBe(3)
    expect(fCalcs).toBe(3)
    expect(buffer).toEqual([8, 11, 14])

    dis()
    c.set(5)
    expect(bCalcs).toBe(1)
    expect(dCalcs).toBe(3)
    expect(fCalcs).toBe(3)
    expect(buffer).toEqual([8, 11, 14])
})

test("nested observable2", function () {
    const factor = observable.box(0)
    const price = observable.box(100)
    let totalCalcs = 0
    let innerCalcs = 0

    const total = computed(function () {
        totalCalcs += 1 // outer observable shouldn't recalc if inner observable didn't publish a real change
        return (
            price.get() *
            computed(function () {
                innerCalcs += 1
                return factor.get() % 2 === 0 ? 1 : 3
            }).get()
        )
    })

    const b = []
    m.observe(
        total,
        function (x) {
            b.push(x.newValue)
        },
        true
    )

    price.set(150)
    factor.set(7) // triggers innerCalc twice, because changing the outcome triggers the outer calculation which recreates the inner calculation
    factor.set(5) // doesn't trigger outer calc
    factor.set(3) // doesn't trigger outer calc
    factor.set(4) // triggers innerCalc twice
    price.set(20)

    expect(b).toEqual([100, 150, 450, 150, 20])
    expect(innerCalcs).toBe(9)
    expect(totalCalcs).toBe(5)
})

test("observe", function () {
    const x = observable.box(3)
    const x2 = computed(function () {
        return x.get() * 2
    })
    const b = []

    const cancel = mobx.autorun(function () {
        b.push(x2.get())
    })

    x.set(4)
    x.set(5)
    expect(b).toEqual([6, 8, 10])
    cancel()
    x.set(7)
    expect(b).toEqual([6, 8, 10])
})

test("when", function () {
    const x = observable.box(3)

    let called = 0
    mobx.when(
        function () {
            return x.get() === 4
        },
        function () {
            called += 1
        }
    )

    x.set(5)
    expect(called).toBe(0)
    x.set(4)
    expect(called).toBe(1)
    x.set(3)
    expect(called).toBe(1)
    x.set(4)
    expect(called).toBe(1)
})

test("when 2", function () {
    const x = observable.box(3)

    let called = 0
    const d = mobx.when(
        function () {
            return x.get() === 3
        },
        function () {
            called += 1
        },
        { name: "when x is 3" }
    )

    expect(called).toBe(1)
    x.set(5)
    x.set(3)
    expect(called).toBe(1)

    expect(d[$mobx].name_).toBe("when x is 3")
})

function stripSpyOutput(events) {
    events.forEach(ev => {
        delete ev.time
        delete ev.fn
        delete ev.object
    })
    return events
}

test("issue 50", function (done) {
    m._resetGlobalState()
    mobx._getGlobalState().mobxGuid = 0
    const x = observable({
        a: true,
        b: false,
        get c() {
            events.push("calc c")
            return this.b
        }
    })

    let result
    const events = []
    const disposer1 = mobx.autorun(function ar() {
        events.push("auto")
        result = [x.a, x.b, x.c].join(",")
    })

    const disposer2 = mobx.spy(function (info) {
        events.push(info)
    })

    setTimeout(function () {
        mobx.transaction(function () {
            events.push("transstart")
            x.a = !x.a
            x.b = !x.b
            events.push("transpreend")
        })
        events.push("transpostend")
        expect(result).toBe("false,true,true")
        expect(x.c).toBe(x.b)

        expect(stripSpyOutput(events)).toMatchSnapshot()

        disposer1()
        disposer2()
        done()
    }, 500)
})

test("verify transaction events", function () {
    m._resetGlobalState()
    mobx._getGlobalState().mobxGuid = 0

    const x = observable({
        b: 1,
        get c() {
            events.push("calc c")
            return this.b
        }
    })

    const events = []
    const disposer1 = mobx.autorun(function ar() {
        events.push("auto")
        x.c
    })

    const disposer2 = mobx.spy(function (info) {
        events.push(info)
    })

    mobx.transaction(function () {
        events.push("transstart")
        x.b = 1
        x.b = 2
        events.push("transpreend")
    })
    events.push("transpostend")

    expect(stripSpyOutput(events)).toMatchSnapshot()

    disposer1()
    disposer2()
})

test("verify array in transaction", function () {
    const ar = observable([])
    let aCount = 0
    let aValue

    mobx.autorun(function () {
        aCount++
        aValue = 0
        for (let i = 0; i < ar.length; i++) aValue += ar[i]
    })

    mobx.transaction(function () {
        ar.push(2)
        ar.push(3)
        ar.push(4)
        ar.unshift(1)
    })
    expect(aValue).toBe(10)
    expect(aCount).toBe(2)
})

test("delay autorun until end of transaction", function () {
    m._resetGlobalState()
    mobx._getGlobalState().mobxGuid = 0
    const events = []
    const x = observable({
        a: 2,
        get b() {
            events.push("calc y")
            return this.a
        }
    })
    let disposer1
    const disposer2 = mobx.spy(function (info) {
        events.push(info)
    })
    let didRun = false

    mobx.transaction(function () {
        mobx.transaction(function () {
            disposer1 = mobx.autorun(function test() {
                didRun = true
                events.push("auto")
                x.b
            })

            expect(didRun).toBe(false)

            x.a = 3
            x.a = 4

            events.push("end1")
        })
        expect(didRun).toBe(false)
        x.a = 5
        events.push("end2")
    })

    expect(didRun).toBe(true)
    events.push("post trans1")
    x.a = 6
    events.push("post trans2")
    disposer1()
    x.a = 3
    events.push("post trans3")

    expect(stripSpyOutput(events)).toMatchSnapshot()

    disposer2()
})

test("computed values believe NaN === NaN", function () {
    const a = observable.box(2)
    const b = observable.box(3)
    const c = computed(function () {
        return String(a.get() * b.get())
    })
    const buf = buffer()
    m.observe(c, buf)

    a.set(NaN)
    b.set(NaN)
    a.set(NaN)
    a.set(2)
    b.set(3)

    expect(buf.toArray()).toEqual(["NaN", "6"])
})

test("computed values believe deep NaN === deep NaN when using compareStructural", function () {
    const a = observable({ b: { a: 1 } })
    const c = computed(
        function () {
            return a.b
        },
        { compareStructural: true }
    )

    const buf = new buffer()
    m.observe(c, newValue => {
        buf(newValue)
    })

    a.b = { a: NaN }
    a.b = { a: NaN }
    a.b = { a: NaN }
    a.b = { a: 2 }
    a.b = { a: NaN }

    const bufArray = buf.toArray()
    expect(isNaN(bufArray[0].b)).toBe(true)
    expect(bufArray[1]).toEqual({ a: 2 })
    expect(isNaN(bufArray[2].b)).toEqual(true)
    expect(bufArray.length).toBe(3)
})

test("issue 71, transacting running transformation", function () {
    const state = mobx.observable({
        things: []
    })

    function Thing(value) {
        mobx.extendObservable(this, {
            value: value,
            get pos() {
                return state.things.indexOf(this)
            },
            get isVisible() {
                return this.pos !== -1
            }
        })

        mobx.when(
            () => {
                return this.isVisible
            },
            () => {
                if (this.pos < 4) state.things.push(new Thing(value + 1))
            }
        )
    }

    let copy
    let vSum
    mobx.autorun(function () {
        copy = state.things.map(function (thing) {
            return thing.value
        })
        vSum = state.things.reduce(function (a, thing) {
            return a + thing.value
        }, 0)
    })

    expect(copy).toEqual([])

    mobx.transaction(function () {
        state.things.push(new Thing(1))
    })

    expect(copy).toEqual([1, 2, 3, 4, 5])
    expect(vSum).toBe(15)

    state.things.splice(0, 2)
    state.things.push(new Thing(6))

    expect(copy).toEqual([3, 4, 5, 6, 7])
    expect(vSum).toBe(25)
})

test("eval in transaction", function () {
    let bCalcs = 0
    const x = mobx.observable({
        a: 1,
        get b() {
            bCalcs++
            return this.a * 2
        }
    })
    let c

    mobx.autorun(function () {
        c = x.b
    })

    expect(bCalcs).toBe(1)
    expect(c).toBe(2)

    mobx.transaction(function () {
        x.a = 3
        expect(x.b).toBe(6)
        expect(bCalcs).toBe(2)
        expect(c).toBe(2)

        x.a = 4
        expect(x.b).toBe(8)
        expect(bCalcs).toBe(3)
        expect(c).toBe(2)
    })
    expect(bCalcs).toBe(3) // 2 or 3 would be fine as well
    expect(c).toBe(8)
})

test("forcefully tracked reaction should still yield valid results", function () {
    const x = observable.box(3)
    let z
    let runCount = 0
    const identity = function () {
        runCount++
        z = x.get()
    }
    const a = new mobx.Reaction("test", function () {
        this.track(identity)
    })
    a.runReaction_()

    expect(z).toBe(3)
    expect(runCount).toBe(1)

    transaction(function () {
        x.set(4)
        a.track(identity)
        expect(a.isScheduled()).toBe(true)
        expect(z).toBe(4)
        expect(runCount).toBe(2)
    })

    expect(z).toBe(4)
    expect(runCount).toBe(2) // x is observed, so it should recompute only on dependency change

    transaction(function () {
        x.set(5)
        expect(a.isScheduled()).toBe(true)
        a.track(identity)
        expect(z).toBe(5)
        expect(runCount).toBe(3)
        expect(a.isScheduled()).toBe(true)

        x.set(6)
        expect(z).toBe(5)
        expect(runCount).toBe(3)
    })
    expect(a.isScheduled()).toBe(false)
    expect(z).toBe(6)
    expect(runCount).toBe(4)
})

test("autoruns created in autoruns should kick off", function () {
    const x = observable.box(3)
    const x2 = []
    let d

    const a = m.autorun(function () {
        if (d) {
            // dispose previous autorun
            d()
        }
        d = m.autorun(function () {
            x2.push(x.get() * 2)
        })
    })

    // a should be observed by the inner autorun, not the outer
    expect(a[$mobx].observing_.length).toBe(0)
    expect(d[$mobx].observing_.length).toBe(1)

    x.set(4)
    expect(x2).toEqual([6, 8])
})

test("#502 extendObservable throws on objects created with Object.create(null)", () => {
    const a = Object.create(null)
    mobx.extendObservable(a, { b: 3 })
    expect(mobx.isObservableProp(a, "b")).toBe(true)
})

test("#328 atom throwing exception if observing stuff in onObserved", () => {
    const b = mobx.observable.box(1)
    const a = mobx.createAtom("test atom", () => {
        b.get()
    })
    const d = mobx.autorun(() => {
        a.reportObserved() // threw
    })
    d()
})

test("prematurely ended autoruns are cleaned up properly", () => {
    const a = mobx.observable.box(1)
    const b = mobx.observable.box(2)
    const c = mobx.observable.box(3)
    let called = 0

    const d = mobx.autorun(() => {
        called++
        if (a.get() === 2) {
            d() // dispose
            b.get() // consume
            a.set(3) // cause itself to re-run, but, disposed!
        } else {
            c.get()
        }
    })

    expect(called).toBe(1)

    a.set(2)

    expect(called).toBe(2)
})

test("unoptimizable subscriptions are diffed correctly", () => {
    const a = mobx.observable.box(1)
    const b = mobx.observable.box(1)
    const c = mobx.computed(() => {
        a.get()
        return 3
    })
    let called = 0
    let val = 0

    const d = mobx.autorun(() => {
        called++
        a.get()
        c.get() // reads a as well
        val = a.get()
        if (
            b.get() === 1 // only on first run
        )
            a.get() // second run: one read less for a
    })

    expect(called).toBe(1)
    expect(val).toBe(1)

    b.set(2)

    expect(called).toBe(2)
    expect(val).toBe(1)

    a.set(2)

    expect(called).toBe(3)
    expect(val).toBe(2)

    d()
})

test("atom events #427", () => {
    let start = 0
    let stop = 0
    let runs = 0

    const a = mobx.createAtom(
        "test",
        () => start++,
        () => stop++
    )
    expect(a.reportObserved()).toEqual(false)

    expect(start).toBe(0)
    expect(stop).toBe(0)

    let d = mobx.autorun(() => {
        runs++
        expect(a.reportObserved()).toBe(true)
        expect(start).toBe(1)
        expect(a.reportObserved()).toBe(true)
        expect(start).toBe(1)
    })

    expect(runs).toBe(1)
    expect(start).toBe(1)
    expect(stop).toBe(0)
    a.reportChanged()
    expect(runs).toBe(2)
    expect(start).toBe(1)
    expect(stop).toBe(0)

    d()
    expect(runs).toBe(2)
    expect(start).toBe(1)
    expect(stop).toBe(1)

    expect(a.reportObserved()).toBe(false)
    expect(start).toBe(1)
    expect(stop).toBe(1)

    d = mobx.autorun(() => {
        expect(a.reportObserved()).toBe(true)
        expect(start).toBe(2)
        a.reportObserved()
        expect(start).toBe(2)
    })

    expect(start).toBe(2)
    expect(stop).toBe(1)
    a.reportChanged()
    expect(start).toBe(2)
    expect(stop).toBe(1)

    d()
    expect(stop).toBe(2)
})

test("verify calculation count", () => {
    const calcs = []
    const a = observable.box(1)
    const b = mobx.computed(() => {
        calcs.push("b")
        return a.get()
    })
    const c = mobx.computed(() => {
        calcs.push("c")
        return b.get()
    })
    const d = mobx.autorun(() => {
        calcs.push("d")
        return b.get()
    })
    const e = mobx.autorun(() => {
        calcs.push("e")
        return c.get()
    })
    const f = mobx.computed(() => {
        calcs.push("f")
        return c.get()
    })

    expect(f.get()).toBe(1)

    calcs.push("change")
    a.set(2)

    expect(f.get()).toBe(2)

    calcs.push("transaction")
    transaction(() => {
        expect(b.get()).toBe(2)
        expect(c.get()).toBe(2)
        expect(f.get()).toBe(2)
        expect(f.get()).toBe(2)
        calcs.push("change")
        a.set(3)
        expect(b.get()).toBe(3)
        expect(b.get()).toBe(3)
        calcs.push("try c")
        expect(c.get()).toBe(3)
        expect(c.get()).toBe(3)
        calcs.push("try f")
        expect(f.get()).toBe(3)
        expect(f.get()).toBe(3)
        calcs.push("end transaction")
    })

    expect(calcs).toEqual([
        "d",
        "b",
        "e",
        "c",
        "f",
        "change",
        "b",
        "d",
        "c",
        "e",
        "f", // would have expected b c e d f, but alas
        "transaction",
        "f",
        "change",
        "b",
        "try c",
        "c",
        "try f",
        "f",
        "end transaction",
        "d",
        "e"
    ])

    d()
    e()
})

test("support computed property getters / setters", () => {
    let a = observable({
        size: 1,
        get volume() {
            return this.size * this.size
        }
    })

    expect(a.volume).toBe(1)
    a.size = 3
    expect(a.volume).toBe(9)

    expect(() => (a.volume = 9)).toThrowError(
        /It is not possible to assign a new value to a computed value/
    )

    a = {}
    mobx.extendObservable(a, {
        size: 2,
        get volume() {
            return this.size * this.size
        },
        set volume(v) {
            this.size = Math.sqrt(v)
        }
    })

    const values = []
    const d = mobx.autorun(() => values.push(a.volume))

    a.volume = 9
    mobx.transaction(() => {
        a.volume = 100
        a.volume = 64
    })

    expect(values).toEqual([4, 9, 64])
    expect(a.size).toEqual(8)

    d()
})

test("computed getter / setter for plan objects should succeed", function () {
    const b = observable({
        a: 3,
        get propX() {
            return this.a * 2
        },
        set propX(v) {
            this.a = v
        }
    })

    const values = []
    mobx.autorun(function () {
        return values.push(b.propX)
    })
    expect(b.propX).toBe(6)
    b.propX = 4
    expect(b.propX).toBe(8)

    expect(values).toEqual([6, 8])
})

test("helpful error for self referencing setter", function () {
    const a = observable({
        x: 1,
        get y() {
            return this.x
        },
        set y(v) {
            this.y = v // woops...;-)
        }
    })

    expect(() => (a.y = 2)).toThrowError(/The setter of computed value/)
})

test("#558 boxed observables stay boxed observables", function () {
    const a = observable({
        x: observable.box(3)
    })

    expect(typeof a.x).toBe("object")
    expect(typeof a.x.get).toBe("function")
})

test("iscomputed", function () {
    expect(mobx.isComputed(observable.box(3))).toBe(false)
    expect(
        mobx.isComputed(
            mobx.computed(function () {
                return 3
            })
        )
    ).toBe(true)

    const x = observable({
        a: 3,
        get b() {
            return this.a
        }
    })

    expect(mobx.isComputedProp(x, "a")).toBe(false)
    expect(mobx.isComputedProp(x, "b")).toBe(true)
})

test("603 - transaction should not kill reactions", () => {
    const a = observable.box(1)
    let b = 1
    const d = mobx.autorun(() => {
        b = a.get()
    })

    try {
        mobx.transaction(() => {
            a.set(2)
            throw 3
        })
    } catch (e) {
        // empty
    }

    const g = m._getGlobalState()
    expect(g.inBatch).toEqual(0)
    expect(g.pendingReactions.length).toEqual(0)
    expect(g.pendingUnobservations.length).toEqual(0)
    expect(g.trackingDerivation).toEqual(null)

    expect(b).toBe(2)
    a.set(3)
    expect(b).toBe(3)
    d()
})

test("#561 test toPrimitive() of observable objects", function () {
    if (typeof Symbol !== "undefined" && Symbol.toPrimitive) {
        let x = observable.box(3)

        expect(x.valueOf()).toBe(3)
        expect(x[Symbol.toPrimitive]()).toBe(3)

        expect(+x).toBe(3)
        expect(++x).toBe(4)

        const y = observable.box(3)

        expect(y + 7).toBe(10)

        const z = computed(() => ({ a: 3 }))
        expect(3 + z).toBe("3[object Object]")
    } else {
        let x = observable.box(3)

        expect(x.valueOf()).toBe(3)
        expect(x["@@toPrimitive"]()).toBe(3)

        expect(+x).toBe(3)
        expect(++x).toBe(4)

        const y = observable.box(3)

        expect(y + 7).toBe(10)

        const z = computed(() => ({ a: 3 }))
        expect("3" + z["@@toPrimitive"]()).toBe("3[object Object]")
    }
})

test("computed equals function only invoked when necessary", () => {
    utils.supressConsole(() => {
        const comparisons = []
        const loggingComparer = (from, to) => {
            comparisons.push({ from, to })
            return from === to
        }

        const left = mobx.observable.box("A")
        const right = mobx.observable.box("B")
        const combinedToLowerCase = mobx.computed(
            () => left.get().toLowerCase() + right.get().toLowerCase(),
            { equals: loggingComparer }
        )

        const values = []
        let disposeAutorun = mobx.autorun(() => values.push(combinedToLowerCase.get()))

        // No comparison should be made on the first value
        expect(comparisons).toEqual([])

        // First change will cause a comparison
        left.set("C")
        expect(comparisons).toEqual([{ from: "ab", to: "cb" }])

        // Transition *to* CaughtException in the computed won't cause a comparison
        left.set(null)
        expect(comparisons).toEqual([{ from: "ab", to: "cb" }])

        // Transition *between* CaughtException-s in the computed won't cause a comparison
        right.set(null)
        expect(comparisons).toEqual([{ from: "ab", to: "cb" }])

        // Transition *from* CaughtException in the computed won't cause a comparison
        left.set("D")
        right.set("E")
        expect(comparisons).toEqual([{ from: "ab", to: "cb" }])

        // Another value change will cause a comparison
        right.set("F")
        expect(comparisons).toEqual([
            { from: "ab", to: "cb" },
            { from: "de", to: "df" }
        ])

        // Becoming unobserved, then observed won't cause a comparison
        disposeAutorun()
        disposeAutorun = mobx.autorun(() => values.push(combinedToLowerCase.get()))
        expect(comparisons).toEqual([
            { from: "ab", to: "cb" },
            { from: "de", to: "df" }
        ])

        expect(values).toEqual(["ab", "cb", "de", "df", "df"])

        disposeAutorun()
    })
})

// document that extendObservable is not inheritance compatible,
// and make sure this does work with decorate
test("Issue 1092 - Should not access attributes of siblings in the prot. chain", () => {
    // The parent is an observable
    // and has an attribute
    const parent = {}
    mobx.extendObservable(parent, {
        staticObservable: 11
    })

    // Child1 "inherit" from the parent
    // and has an observable attribute
    const child1 = Object.create(parent)
    mobx.extendObservable(child1, {
        attribute: 7
    })

    // Child2 also "inherit" from the parent
    // But does not have any observable attribute
    const child2 = Object.create(parent)

    // The second child should not be aware of the attribute of his
    // sibling child1
    expect(typeof child2.attribute).toBe("undefined")

    expect(parent.staticObservable).toBe(11)
    parent.staticObservable = 12
    expect(parent.staticObservable).toBe(12)
})

test("Issue 1092 - We should be able to define observable on all siblings", () => {
    expect.assertions(1)

    // The parent is an observable
    const parent = {}
    mobx.extendObservable(parent, {})

    // Child1 "inherit" from the parent
    // and has an observable attribute
    const child1 = Object.create(parent)
    mobx.extendObservable(child1, {
        attribute: 7
    })

    // Child2 also "inherit" from the parent
    // But does not have any observable attribute
    const child2 = Object.create(parent)
    expect(() => {
        mobx.extendObservable(child2, {
            attribute: 8
        })
    }).not.toThrow()
})

test("Issue 1120 - isComputed should return false for a non existing property", () => {
    expect(mobx.isComputedProp({}, "x")).toBe(false)
    expect(mobx.isComputedProp(observable({}), "x")).toBe(false)
})

test("computed comparer works with decorate (plain)", () => {
    const sameTime = (from, to) => from.hour === to.hour && from.minute === to.minute
    function Time(hour, minute) {
        this.hour = hour
        this.minute = minute
        makeObservable(this, {
            hour: observable,
            minute: observable,
            time: computed({ equals: sameTime })
        })
    }

    Object.defineProperty(Time.prototype, "time", {
        configurable: true,
        enumerable: true,
        get() {
            return { hour: this.hour, minute: this.minute }
        }
    })
    const time = new Time(9, 0)

    const changes = []
    const disposeAutorun = autorun(() => changes.push(time.time))

    expect(changes).toEqual([{ hour: 9, minute: 0 }])
    time.hour = 9
    expect(changes).toEqual([{ hour: 9, minute: 0 }])
    time.minute = 0
    expect(changes).toEqual([{ hour: 9, minute: 0 }])
    time.hour = 10
    expect(changes).toEqual([
        { hour: 9, minute: 0 },
        { hour: 10, minute: 0 }
    ])
    time.minute = 30
    expect(changes).toEqual([
        { hour: 9, minute: 0 },
        { hour: 10, minute: 0 },
        { hour: 10, minute: 30 }
    ])

    disposeAutorun()
})

test("computed comparer works with decorate (plain) - 2", () => {
    const sameTime = (from, to) => from.hour === to.hour && from.minute === to.minute
    function Time(hour, minute) {
        extendObservable(
            this,
            {
                hour,
                minute,
                get time() {
                    return { hour: this.hour, minute: this.minute }
                }
            },
            {
                time: computed({ equals: sameTime })
            }
        )
    }
    const time = new Time(9, 0)

    const changes = []
    const disposeAutorun = autorun(() => changes.push(time.time))

    expect(changes).toEqual([{ hour: 9, minute: 0 }])
    time.hour = 9
    expect(changes).toEqual([{ hour: 9, minute: 0 }])
    time.minute = 0
    expect(changes).toEqual([{ hour: 9, minute: 0 }])
    time.hour = 10
    expect(changes).toEqual([
        { hour: 9, minute: 0 },
        { hour: 10, minute: 0 }
    ])
    time.minute = 30
    expect(changes).toEqual([
        { hour: 9, minute: 0 },
        { hour: 10, minute: 0 },
        { hour: 10, minute: 30 }
    ])

    disposeAutorun()
})

test("computed comparer works with decorate (plain) - 3", () => {
    const sameTime = (from, to) => from.hour === to.hour && from.minute === to.minute
    const time = observable.object(
        {
            hour: 9,
            minute: 0,
            get time() {
                return { hour: this.hour, minute: this.minute }
            }
        },
        {
            time: computed({ equals: sameTime })
        }
    )

    const changes = []
    const disposeAutorun = autorun(() => changes.push(time.time))

    expect(changes).toEqual([{ hour: 9, minute: 0 }])
    time.hour = 9
    expect(changes).toEqual([{ hour: 9, minute: 0 }])
    time.minute = 0
    expect(changes).toEqual([{ hour: 9, minute: 0 }])
    time.hour = 10
    expect(changes).toEqual([
        { hour: 9, minute: 0 },
        { hour: 10, minute: 0 }
    ])
    time.minute = 30
    expect(changes).toEqual([
        { hour: 9, minute: 0 },
        { hour: 10, minute: 0 },
        { hour: 10, minute: 30 }
    ])

    disposeAutorun()
})

test("can create computed with setter", () => {
    let y = 1
    let x = mobx.computed(() => y, {
        set: v => {
            y = v * 2
        }
    })
    expect(x.get()).toBe(1)
    x.set(3)
    expect(x.get()).toBe(6)
})

test("can make non-extenible objects observable", () => {
    const base = { x: 3 }
    Object.freeze(base)
    const o = mobx.observable(base)
    o.x = 4
    expect(o.x).toBe(4)
    expect(mobx.isObservableProp(o, "x")).toBeTruthy()
})

test("keeping computed properties alive does not run before access", () => {
    let calcs = 0
    observable(
        {
            x: 1,
            get y() {
                calcs++
                return this.x * 2
            }
        },
        {
            y: mobx.computed({ keepAlive: true })
        }
    )

    expect(calcs).toBe(0) // initially there is no calculation done
})

test("(for objects) keeping computed properties alive does not run before access", () => {
    let calcs = 0
    class Foo {
        @observable x = 1

        constructor() {
            makeObservable(this)
        }

        @computed({ keepAlive: true })
        get y() {
            calcs++
            return this.x * 2
        }
    }
    new Foo()

    expect(calcs).toBe(0) // initially there is no calculation done
})

test("keeping computed properties alive runs on first access", () => {
    let calcs = 0
    const x = observable(
        {
            x: 1,
            get y() {
                calcs++
                return this.x * 2
            }
        },
        {
            y: mobx.computed({ keepAlive: true })
        }
    )

    expect(calcs).toBe(0)
    expect(x.y).toBe(2) // perform calculation on access
    expect(calcs).toBe(1)
})

test("keeping computed properties alive caches values on subsequent accesses", () => {
    let calcs = 0
    const x = observable(
        {
            x: 1,
            get y() {
                calcs++
                return this.x * 2
            }
        },
        {
            y: mobx.computed({ keepAlive: true })
        }
    )

    expect(x.y).toBe(2) // first access: do calculation
    expect(x.y).toBe(2) // second access: use cached value, no calculation
    expect(calcs).toBe(1) // only one calculation: cached!
})

test("keeping computed properties alive does not recalculate when dirty", () => {
    let calcs = 0
    const x = observable(
        {
            x: 1,
            get y() {
                calcs++
                return this.x * 2
            }
        },
        {
            y: mobx.computed({ keepAlive: true })
        }
    )

    expect(x.y).toBe(2) // first access: do calculation
    expect(calcs).toBe(1)
    x.x = 3 // mark as dirty: no calculation
    expect(calcs).toBe(1)
    expect(x.y).toBe(6)
})

test("keeping computed properties alive recalculates when accessing it dirty", () => {
    let calcs = 0
    const x = observable(
        {
            x: 1,
            get y() {
                calcs++
                return this.x * 2
            }
        },
        {
            y: mobx.computed({ keepAlive: true })
        }
    )

    expect(x.y).toBe(2) // first access: do calculation
    expect(calcs).toBe(1)
    x.x = 3 // mark as dirty: no calculation
    expect(calcs).toBe(1)
    expect(x.y).toBe(6) // second access: do calculation because it is dirty
    expect(calcs).toBe(2)
})

test("(for objects) keeping computed properties alive recalculates when accessing it dirty", () => {
    let calcs = 0
    class Foo {
        @observable x = 1

        constructor() {
            makeObservable(this)
        }

        @computed({ keepAlive: true })
        get y() {
            calcs++
            return this.x * 2
        }
    }
    const x = new Foo()

    expect(x.y).toBe(2) // first access: do calculation
    expect(calcs).toBe(1)
    x.x = 3 // mark as dirty: no calculation
    expect(calcs).toBe(1)
    expect(x.y).toBe(6) // second access: do calculation because it is dirty
    expect(calcs).toBe(2)
})

test("tuples", () => {
    // See #1391
    function tuple() {
        const res = new Array(arguments.length)
        for (let i = 0; i < arguments.length; i++) mobx.extendObservable(res, { [i]: arguments[i] })
        return res
    }

    const myStuff = tuple(1, 3)
    const events = []

    mobx.reaction(
        () => myStuff[0],
        val => events.push(val)
    )
    myStuff[1] = 17 // should not react
    myStuff[0] = 2 // should react
    expect(events).toEqual([2])

    expect(myStuff.map(x => x * 2)).toEqual([4, 34])
})
