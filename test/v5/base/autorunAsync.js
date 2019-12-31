/**
 * @type {typeof import("../../src/mobx")}
 */
const mobx = require("../../src/mobx.ts")

const utils = require("../utils/test-utils")

const { $mobx } = mobx

test("autorun 1", function(done) {
    let _fired = 0
    let _result = null
    let _cCalcs = 0
    const to = setTimeout

    function check(fired, cCalcs, result) {
        expect(_fired).toBe(fired)
        expect(_cCalcs).toBe(cCalcs)
        if (fired) expect(_result).toBe(result)
        _fired = 0
        _cCalcs = 0
    }

    const a = mobx.observable.box(2)
    const b = mobx.observable.box(3)
    const c = mobx.computed(function() {
        _cCalcs++
        return a.get() * b.get()
    })
    const d = mobx.observable.box(1)
    const autorun = function() {
        _fired++
        _result = d.get() > 0 ? a.get() * c.get() : d.get()
    }
    let disp = mobx.autorun(autorun, { delay: 20 })

    check(0, 0, null)
    disp()
    to(function() {
        check(0, 0, null)
        disp = mobx.autorun(autorun, { delay: 20 })

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
    let i = 0
    const a = mobx.observable({
        x: i
    })

    let autoRunsCalled = 0
    const d = mobx.autorun(
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

        expect(d[$mobx].name).toBe("named async")
        d()
    }, 100)
})

test("autorunAsync passes Reaction as an argument to view function", function(done) {
    const a = mobx.observable.box(1)

    let autoRunsCalled = 0

    mobx.autorun(
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
    const a = mobx.observable({
        x: 0,
        y: 1
    })

    let autoRunsCalled = 0
    let schedulingsCalled = 0

    mobx.autorun(
        function() {
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
    const a = mobx.observable({
        x: 0,
        y: 1
    })

    let autoRunsCalled = 0
    let schedulingsCalled = 0
    let exprCalled = 0

    const values = []

    mobx.reaction(
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
    const action = mobx.action(() => {})
    expect.assertions(1)
    expect(() => mobx.autorun(action)).toThrowError(/Autorun does not accept actions/)
})

test("whenWithTimeout should operate normally", done => {
    const a = mobx.observable.box(1)

    mobx.when(() => a.get() === 2, () => done(), {
        timeout: 500,
        onError: () => done.fail("error triggered")
    })

    setTimeout(mobx.action(() => a.set(2)), 200)
})

test("whenWithTimeout should timeout", done => {
    const a = mobx.observable.box(1)

    mobx.when(() => a.get() === 2, () => done.fail("should have timed out"), {
        timeout: 500,
        onError: e => {
            expect("" + e).toMatch(/WHEN_TIMEOUT/)
            done()
        }
    })

    setTimeout(mobx.action(() => a.set(2)), 1000)
})

test("whenWithTimeout should dispose", done => {
    const a = mobx.observable.box(1)

    const d1 = mobx.when(() => a.get() === 2, () => done.fail("1 should not finsih"), {
        timeout: 100,
        onError: () => done.fail("1 should not timeout")
    })

    const d2 = mobx.when(() => a.get() === 2, () => t.fail("2 should not finsih"), {
        timeout: 200,
        onError: () => done.fail("2 should not timeout")
    })

    d1()
    d2()

    setTimeout(
        mobx.action(() => {
            a.set(2)
            done()
        }),
        150
    )
})

describe("when opts requiresObservable", () => {
    test("warn when no observable", () => {
        utils.consoleWarn(() => {
            const disposer = mobx.when(() => 2, {
                requiresObservable: true
            })

            disposer.cancel()
        }, /is created\/updated without reading any observable value/)
    })

    test("Don't warn when observable", () => {
        const obsr = mobx.observable({
            x: 1
        })

        const messages = utils.supressConsole(() => {
            const disposer = mobx.when(() => obsr.x, {
                requiresObservable: true
            })

            disposer.cancel()
        })

        expect(messages.length).toBe(0)
    })
})
