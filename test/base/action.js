"use strict"

var mobx = require("../../src/mobx.ts")
var utils = require("../utils/test-utils")

test("action should wrap in transaction", () => {
    var values = []

    var observable = mobx.observable.box(0)
    var d = mobx.autorun(() => values.push(observable.get()))

    var increment = mobx.action("increment", amount => {
        observable.set(observable.get() + amount * 2)
        observable.set(observable.get() - amount) // oops
    })

    expect(mobx.isAction(increment)).toBe(true)
    expect(mobx.isAction(function() {})).toBe(false)

    increment(7)

    expect(values).toEqual([0, 7])
})

test("action modifications should be picked up 1", () => {
    var a = mobx.observable.box(1)
    var i = 3
    var b = 0

    mobx.autorun(() => {
        b = a.get() * 2
    })

    expect(b).toBe(2)

    var action = mobx.action(() => {
        a.set(++i)
    })

    action()
    expect(b).toBe(8)

    action()
    expect(b).toBe(10)
})

test("action modifications should be picked up 1", () => {
    var a = mobx.observable.box(1)
    var b = 0

    mobx.autorun(() => {
        b = a.get() * 2
    })

    expect(b).toBe(2)

    var action = mobx.action(() => {
        a.set(a.get() + 1) // ha, no loop!
    })

    action()
    expect(b).toBe(4)

    action()
    expect(b).toBe(6)
})

test("action modifications should be picked up 3", () => {
    var a = mobx.observable.box(1)
    var b = 0

    var doubler = mobx.computed(() => a.get() * 2)

    doubler.observe(() => {
        b = doubler.get()
    }, true)

    expect(b).toBe(2)

    var action = mobx.action(() => {
        a.set(a.get() + 1) // ha, no loop!
    })

    action()
    expect(b).toBe(4)

    action()
    expect(b).toBe(6)
})

test("test action should be untracked", () => {
    var a = mobx.observable.box(3)
    var b = mobx.observable.box(4)
    var latest = 0
    var runs = 0

    var action = mobx.action(baseValue => {
        b.set(baseValue * 2)
        latest = b.get() // without action this would trigger loop
    })

    var d = mobx.autorun(() => {
        runs++
        var current = a.get()
        action(current)
    })

    expect(b.get()).toBe(6)
    expect(latest).toBe(6)

    a.set(7)
    expect(b.get()).toBe(14)
    expect(latest).toBe(14)

    a.set(8)
    expect(b.get()).toBe(16)
    expect(latest).toBe(16)

    b.set(7) // should have no effect
    expect(a.get()).toBe(8)
    expect(b.get()).toBe(7)
    expect(latest).toBe(16) // effect not triggered

    a.set(3)
    expect(b.get()).toBe(6)
    expect(latest).toBe(6)

    expect(runs).toBe(4)

    d()
})

test("should be possible to create autorun in action", () => {
    var a = mobx.observable.box(1)
    var values = []

    var adder = mobx.action(inc => {
        return mobx.autorun(() => {
            values.push(a.get() + inc)
        })
    })

    var d1 = adder(2)
    a.set(3)
    var d2 = adder(17)
    a.set(24)
    d1()
    a.set(11)
    d2()
    a.set(100)

    expect(values).toEqual([3, 5, 20, 26, 41, 28]) // n.b. order could swap as autorun creation order doesn't guarantee stuff
})

test("should be possible to change unobserved state in an action called from computed", () => {
    var a = mobx.observable.box(2)

    var testAction = mobx.action(() => {
        a.set(3)
    })

    var c = mobx.computed(() => {
        testAction()
    })

    expect.assertions(1)
    mobx.autorun(() => {
        expect(() => {
            c.get()
        }).not.toThrow(/bla/)
    })

    mobx._resetGlobalState()
})

test("should be possible to change observed state in an action called from computed if run inside _allowStateChangesInsideComputed", () => {
    const a = mobx.observable.box(2)
    const d = mobx.autorun(() => {
        a.get()
    })

    const testAction = mobx.action(() => {
        mobx._allowStateChangesInsideComputed(() => {
            a.set(3)
        })
        expect(a.get()).toBe(3)
        expect(() => {
            a.set(4)
        }).toThrowError(
            /Computed values are not allowed to cause side effects by changing observables that are already being observed/
        )
    })

    const c = mobx.computed(() => {
        testAction()
        return a.get()
    })

    c.get()

    mobx._resetGlobalState()
    d()
})

test("should be possible to change observed state in an action called from computed if run inside _allowStateChangesInsideComputed - 2", () => {
    const a = mobx.observable.box(2)
    const d = mobx.autorun(() => {
        a.get()
    })

    const testAction = mobx.action(() => {
        a.set(3)
    })

    const c = mobx.computed(() => {
        mobx._allowStateChanges(true, () => {
            testAction()
        })
        return a.get()
    })

    c.get()

    mobx._resetGlobalState()
    d()
})


test("should not be possible to change observed state in an action called from computed", () => {
    var a = mobx.observable.box(2)
    var d = mobx.autorun(() => {
        a.get()
    })

    var testAction = mobx.action(() => {
        a.set(3)
    })

    var c = mobx.computed(() => {
        testAction()
        return a.get()
    })

    expect(() => {
        c.get()
    }).toThrowError(
        /Computed values are not allowed to cause side effects by changing observables that are already being observed/
    )

    mobx._resetGlobalState()
    d()
})

test("action in autorun should be untracked", () => {
    var a = mobx.observable.box(2)
    var b = mobx.observable.box(3)

    var data = []
    var multiplier = mobx.action(val => val * b.get())

    var d = mobx.autorun(() => {
        data.push(multiplier(a.get()))
    })

    a.set(3)
    b.set(4)
    a.set(5)

    d()

    a.set(6)

    expect(data).toEqual([6, 9, 20])
})

test("action should not be converted to computed when using (extend)observable", () => {
    var a = mobx.observable({
        a: 1,
        b: mobx.action(function() {
            this.a++
        })
    })

    expect(mobx.isAction(a.b)).toBe(true)
    a.b()
    expect(a.a).toBe(2)

    mobx.extendObservable(a, {
        c: mobx.action(function() {
            this.a *= 3
        })
    })

    expect(mobx.isAction(a.c)).toBe(true)
    a.c()
    expect(a.a).toBe(6)
})

test("#286 exceptions in actions should not affect global state", () => {
    var autorunTimes = 0
    function Todos() {
        mobx.extendObservable(this, {
            count: 0,
            add: mobx.action(function() {
                this.count++
                if (this.count === 2) {
                    throw new Error("An Action Error!")
                }
            })
        })
    }
    const todo = new Todos()
    mobx.autorun(() => {
        autorunTimes++
        return todo.count
    })
    try {
        todo.add()
        expect(autorunTimes).toBe(2)
        todo.add()
    } catch (e) {
        expect(autorunTimes).toBe(3)
        todo.add()
        expect(autorunTimes).toBe(4)
    }
})

test("runInAction", () => {
    mobx.configure({ enforceActions: "observed" })
    var values = []
    var events = []
    var spyDisposer = mobx.spy(ev => {
        if (ev.type === "action")
            events.push({
                name: ev.name,
                arguments: ev.arguments
            })
    })

    var observable = mobx.observable.box(0)
    var d = mobx.autorun(() => values.push(observable.get()))

    var res = mobx.runInAction("increment", () => {
        observable.set(observable.get() + 6 * 2)
        observable.set(observable.get() - 3) // oops
        return 2
    })

    expect(res).toBe(2)
    expect(values).toEqual([0, 9])

    res = mobx.runInAction(() => {
        observable.set(observable.get() + 5 * 2)
        observable.set(observable.get() - 4) // oops
        return 3
    })

    expect(res).toBe(3)
    expect(values).toEqual([0, 9, 15])
    expect(events).toEqual([
        { arguments: [], name: "increment" },
        { arguments: [], name: "<unnamed action>" }
    ])

    mobx.configure({ enforceActions: "never" })
    spyDisposer()

    d()
})

test("action in autorun does not keep / make computed values alive", () => {
    let calls = 0
    const myComputed = mobx.computed(() => calls++)
    const callComputedTwice = () => {
        myComputed.get()
        myComputed.get()
    }

    const runWithMemoizing = fun => {
        mobx.autorun(fun)()
    }

    callComputedTwice()
    expect(calls).toBe(2)

    runWithMemoizing(callComputedTwice)
    expect(calls).toBe(3)

    callComputedTwice()
    expect(calls).toBe(5)

    runWithMemoizing(function() {
        mobx.runInAction(callComputedTwice)
    })
    expect(calls).toBe(6)

    callComputedTwice()
    expect(calls).toBe(8)
})

test("computed values and actions", () => {
    let calls = 0

    const number = mobx.observable.box(1)
    const squared = mobx.computed(() => {
        calls++
        return number.get() * number.get()
    })
    const changeNumber10Times = mobx.action(() => {
        squared.get()
        squared.get()
        for (let i = 0; i < 10; i++) number.set(number.get() + 1)
    })

    changeNumber10Times()
    expect(calls).toBe(1)

    mobx.autorun(() => {
        changeNumber10Times()
        expect(calls).toBe(2)
    })()
    expect(calls).toBe(2)

    changeNumber10Times()
    expect(calls).toBe(3)
})

test("extendObservable respects action decorators", () => {
    const x = mobx.observable(
        {
            a1() {
                return this
            },
            a2() {
                return this
            },
            a3() {
                return this
            }
        },
        {
            a1: mobx.action,
            a2: mobx.action.bound
        }
    )
    expect(mobx.isAction(x.a1)).toBe(true)
    expect(mobx.isAction(x.a2)).toBe(true)
    expect(mobx.isAction(x.a3)).toBe(false)

    const global = (function() {
        return this
    })()

    const { a1, a2, a3 } = x
    expect(a1.call(x)).toBe(x)
    // expect(a1()).toBe(global)
    expect(a2.call(x)).toBeTruthy() // it is not this! proxies :) see test in proxies.js
    expect(a2()).toBeTruthy()
    expect(a3.call(x)).toBe(x)
    // expect(a3()).toBe(global)
})

test("expect warning for invalid decorator", () => {
    expect(() => {
        mobx.observable({ x: 1 }, { x: undefined })
    }).toThrow(/Not a valid decorator for 'x', got: undefined/)
})

test("expect warning superfluos decorator", () => {
    expect(() => {
        mobx.observable({ x() {} }, { y: mobx.action })
    }).toThrow(/Trying to declare a decorator for unspecified property 'y'/)
})

test("bound actions bind", () => {
    var called = 0
    var x = mobx.observable(
        {
            y: 0,
            z: function(v) {
                this.y += v
                this.y += v
            },
            get yValue() {
                called++
                return this.y
            }
        },
        {
            z: mobx.action.bound
        }
    )

    var d = mobx.autorun(() => {
        x.yValue
    })
    var events = []
    var d2 = mobx.spy(e => events.push(e))

    var runner = x.z
    runner(3)
    expect(x.yValue).toBe(6)
    expect(called).toBe(2)

    expect(events.filter(e => e.type === "action").map(e => e.name)).toEqual(["z"])
    expect(Object.keys(x)).toEqual(["y"])

    d()
    d2()
})

test("Fix #1367", () => {
    const x = mobx.extendObservable(
        {},
        {
            method() {}
        },
        {
            method: mobx.action
        }
    )
    expect(mobx.isAction(x.method)).toBe(true)
})
