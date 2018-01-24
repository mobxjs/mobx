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

    var a = m.observable(2)
    var b = m.observable(3)
    var c = m.computed(function() {
        _cCalcs++
        return a.get() * b.get()
    })
    var d = m.observable(1)
    var autorun = function() {
        _fired++
        _result = d.get() > 0 ? a.get() * c.get() : d.get()
    }
    var disp = m.autorunAsync(autorun, 20)

    check(0, 0, null)
    disp()
    to(function() {
        check(0, 0, null)
        disp = m.autorunAsync(autorun, 20)

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
    var d = m.autorunAsync(
        "named async",
        function() {
            autoRunsCalled++
            a.x = ++i
            setTimeout(function() {
                a.x = ++i
            }, 10)
        },
        10
    )

    setTimeout(function() {
        expect(autoRunsCalled).toBe(1)
        done()

        expect(d.$mobx.name).toBe("named async")
        d()
    }, 100)
})

test("autorunAsync passes Reaction as an argument to view function", function(done) {
    var a = m.observable(1)

    var autoRunsCalled = 0

    m.autorunAsync(r => {
        expect(typeof r.dispose).toBe("function")
        autoRunsCalled++
        if (a.get() === "pleaseDispose") r.dispose()
    }, 10)

    setTimeout(() => a.set(2), 250)
    setTimeout(() => a.set("pleaseDispose"), 400)
    setTimeout(() => a.set(3), 550)
    setTimeout(() => a.set(4), 700)

    setTimeout(function() {
        expect(autoRunsCalled).toBe(3)
        done()
    }, 1000)
})

test("autorunAsync warns when passed an action", function() {
    var action = m.action(() => {})
    expect.assertions(1)
    expect(() => m.autorunAsync(action)).toThrowError(/attempted to pass an action to autorunAsync/)
})
