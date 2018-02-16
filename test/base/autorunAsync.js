var m = require("../../src/mobx.ts")

test("autorun 1", function(done) {
    var _fired = 0
    var _result = null
    var _cCalcs = 0
    var to = setTimeout

    function check(fired, cCalcs, result) {
        expect(_fired).toBe(fired)
        expect(_cCalcs).toBe(cCalcs)
        if (fired) expect(_result).toBe(result)
        _fired = 0
        _cCalcs = 0
    }

    var a = m.observable.box(2)
    var b = m.observable.box(3)
    var c = m.computed(function() {
        _cCalcs++
        return a.get() * b.get()
    })
    var d = m.observable.box(1)
    var autorun = function() {
        _fired++
        _result = d.get() > 0 ? a.get() * c.get() : d.get()
    }
    var disp = m.autorun(autorun, { delay: 20 })

    check(0, 0, null)
    disp()
    to(function() {
        check(0, 0, null)
        disp = m.autorun(autorun, { delay: 20 })

        to(function() {
            check(1, 1, 12)
            a.set(4)
            b.set(5)
            a.set(6)
            check(0, 0, null) // a change triggered async rerun, compute will trigger after 20ms of async timeout
            to(function() {
                check(1, 1, 180)
                d.set(2)

                to(function() {
                    check(1, 0, 180)

                    d.set(-2)
                    to(function() {
                        check(1, 0, -2)

                        a.set(7)
                        to(function() {
                            check(0, 0, 0) // change a has no effect

                            a.set(4)
                            b.set(2)
                            d.set(2)

                            to(function() {
                                check(1, 1, 32)

                                disp()
                                a.set(1)
                                b.set(2)
                                d.set(4)
                                to(function() {
                                    check(0, 0, 0)
                                    done()
                                }, 30)
                            }, 30)
                        }, 30)
                    }, 30)
                }, 30)
            }, 30)
        }, 30)
    }, 30)
})

test("autorun should not result in loop", function(done) {
    var i = 0
    var a = m.observable({
        x: i
    })

    var autoRunsCalled = 0
    var d = m.autorun(
        function() {
            autoRunsCalled++
            a.x = ++i
            setTimeout(function() {
                a.x = ++i
            }, 10)
        },
        { delay: 10, name: "named async" }
    )

    setTimeout(function() {
        expect(autoRunsCalled).toBe(1)
        done()

        expect(d.$mobx.name).toBe("named async")
        d()
    }, 100)
})

test("autorunAsync passes Reaction as an argument to view function", function(done) {
    var a = m.observable.box(1)

    var autoRunsCalled = 0

    m.autorun(
        r => {
            expect(typeof r.dispose).toBe("function")
            autoRunsCalled++
            if (a.get() === "pleaseDispose") r.dispose()
        },
        { delay: 10 }
    )

    setTimeout(() => a.set(2), 250)
    setTimeout(() => a.set("pleaseDispose"), 400)
    setTimeout(() => a.set(3), 550)
    setTimeout(() => a.set(4), 700)

    setTimeout(function() {
        expect(autoRunsCalled).toBe(3)
        done()
    }, 1000)
})

test("autorunAsync accepts a scheduling function", function(done) {
    var a = m.observable({
        x: 0,
        y: 1
    })

    var autoRunsCalled = 0
    var schedulingsCalled = 0

    debugger
    m.autorun(
        function(r) {
            autoRunsCalled++
            expect(a.y).toBe(a.x + 1)

            if (a.x < 10) {
                // Queue the two actions separately, if this was autorun it would fail
                setTimeout(function() {
                    a.x = a.x + 1
                }, 0)
                setTimeout(function() {
                    a.y = a.y + 1
                }, 0)
            }
        },
        {
            scheduler: function(fn) {
                schedulingsCalled++
                setTimeout(fn, 0)
            }
        }
    )

    setTimeout(function() {
        expect(autoRunsCalled).toBe(11)
        expect(schedulingsCalled).toBe(11)
        done()
    }, 1000)
})

test("reaction accepts a scheduling function", function(done) {
    var a = m.observable({
        x: 0,
        y: 1
    })

    var autoRunsCalled = 0
    var schedulingsCalled = 0
    var exprCalled = 0

    var values = []

    m.reaction(
        () => {
            exprCalled++
            return a.x
        },
        () => {
            autoRunsCalled++
            values.push(a.x)
        },
        {
            fireImmediately: true,
            scheduler: function(fn) {
                schedulingsCalled++
                setTimeout(fn, 2)
            }
        }
    )

    a.x++
    a.x++
    a.x++
    setTimeout(() => {
        a.x++
        a.x++
        a.x++
    }, 20)

    setTimeout(function() {
        expect(exprCalled).toBe(3) // start, 2 batches
        expect(autoRunsCalled).toBe(3) // start, 2 batches
        expect(schedulingsCalled).toBe(2) // skipped first time due to fireImmediately
        expect(values).toEqual([0, 3, 6])
        done()
    }, 100)
})

test("autorunAsync warns when passed an action", function() {
    var action = m.action(() => {})
    expect.assertions(1)
    expect(() => m.autorun(action)).toThrowError(/Autorun does not accept actions/)
})
