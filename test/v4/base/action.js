"use strict"

const mobx = require("../mobx4")
const utils = require("../utils/test-utils")

test("action should wrap in transaction", () => {
    const values = []

    const observable = mobx.observable.box(0)
    mobx.autorun(() => values.push(observable.get()))

    const increment = mobx.action("increment", amount => {
        observable.set(observable.get() + amount * 2)
        observable.set(observable.get() - amount) // oops
    })

    expect(mobx.isAction(increment)).toBe(true)
    expect(mobx.isAction(function() {})).toBe(false)

    increment(7)

    expect(values).toEqual([0, 7])
})

test("action modifications should be picked up 1", () => {
    const a = mobx.observable.box(1)
    let i = 3
    let b = 0

    mobx.autorun(() => {
        b = a.get() * 2
    })

    expect(b).toBe(2)

    const action = mobx.action(() => {
        a.set(++i)
    })

    action()
    expect(b).toBe(8)

    action()
    expect(b).toBe(10)
})

test("action modifications should be picked up 1", () => {
    const a = mobx.observable.box(1)
    let b = 0

    mobx.autorun(() => {
        b = a.get() * 2
    })

    expect(b).toBe(2)

    const action = mobx.action(() => {
        a.set(a.get() + 1) // ha, no loop!
    })

    action()
    expect(b).toBe(4)

    action()
    expect(b).toBe(6)
})

test("action modifications should be picked up 3", () => {
    const a = mobx.observable.box(1)
    let b = 0

    const doubler = mobx.computed(() => a.get() * 2)

    doubler.observe(() => {
        b = doubler.get()
    }, true)

    expect(b).toBe(2)

    const action = mobx.action(() => {
        a.set(a.get() + 1) // ha, no loop!
    })

    action()
    expect(b).toBe(4)

    action()
    expect(b).toBe(6)
})

test("test action should be untracked", () => {
    const a = mobx.observable.box(3)
    const b = mobx.observable.box(4)
    let latest = 0
    let runs = 0

    const action = mobx.action(baseValue => {
        b.set(baseValue * 2)
        latest = b.get() // without action this would trigger loop
    })

    const d = mobx.autorun(() => {
        runs++
        const current = a.get()
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

test("should be possible to change unobserved state in an action called from computed", () => {
    const a = mobx.observable.box(2)

    const testAction = mobx.action(() => {
        a.set(3)
    })

    const c = mobx.computed(() => {
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
            // a second level computed should throw
            expect(() => c2.get()).toThrowError(
                /Computed values are not allowed to cause side effects by changing observables that are already being observed/
            )
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

    const c2 = mobx.computed(() => {
        a.set(6)
        return a.get()
    })

    c.get()

    mobx._resetGlobalState()
    d()
})

test("should not be possible to change observed state in an action called from computed", () => {
    const a = mobx.observable.box(2)
    const d = mobx.autorun(() => {
        a.get()
    })

    const testAction = mobx.action(() => {
        a.set(3)
    })

    const c = mobx.computed(() => {
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
    const a = mobx.observable.box(2)
    const b = mobx.observable.box(3)

    const data = []
    const multiplier = mobx.action(val => val * b.get())

    const d = mobx.autorun(() => {
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
    const a = mobx.observable({
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
    let autorunTimes = 0
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
    const values = []
    const events = []
    const spyDisposer = mobx.spy(ev => {
        if (ev.type === "action")
            events.push({
                name: ev.name,
                arguments: ev.arguments
            })
    })

    const observable = mobx.observable.box(0)
    const d = mobx.autorun(() => values.push(observable.get()))

    let res = mobx.runInAction("increment", () => {
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
            a2: mobx.action.bound,
            a3: false
        }
    )
    expect(mobx.isAction(x.a1)).toBe(true)
    expect(mobx.isAction(x.a2)).toBe(true)
    expect(mobx.isAction(x.a3)).toBe(false)

    // const global = (function() {
    //     return this
    // })()

    const { a1, a2, a3 } = x
    expect(a1.call(x)).toBe(x)
    // expect(a1()).toBe(global)
    expect(a2.call(x)).toBe(x)
    expect(a2()).toBe(x)
    expect(a3.call(x)).toBe(x)
    // expect(a3()).toBe(global)
})

test("expect warning for invalid decorator", () => {
    expect(() => {
        mobx.observable({ x: 1 }, { x: undefined })
    }).toThrowErrorMatchingInlineSnapshot(`"[mobx] invalid decorator 'undefined' for 'x'"`)
})

test("expect warning superfluos decorator", () => {
    expect(() => {
        mobx.observable({ x() {} }, { y: mobx.action })
    }).toThrow(/Trying to declare a decorator for unspecified property 'y'/)
})

test("bound actions bind", () => {
    let called = 0
    const x = mobx.observable(
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

    const d = mobx.autorun(() => {
        x.yValue
    })
    const events = []
    const d2 = mobx.spy(e => events.push(e))

    const runner = x.z
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

test("error logging, #1836 - 1", () => {
    const messages = utils.supressConsole(() => {
        try {
            const a = mobx.observable.box(3)
            mobx.autorun(() => {
                if (a.get() === 4) throw new Error("Reaction error")
            })

            mobx.action(() => {
                a.set(4)
                throw new Error("Action error")
            })()
        } catch (e) {
            expect(e.toString()).toEqual("Error: Action error")
            console.error(e)
        }
    })

    expect(messages).toMatchSnapshot()
})

test("error logging, #1836 - 2", () => {
    const messages = utils.supressConsole(() => {
        try {
            const a = mobx.observable.box(3)
            mobx.autorun(() => {
                if (a.get() === 4) throw new Error("Reaction error")
            })

            mobx.action(() => {
                a.set(4)
            })()
        } catch (e) {
            expect(e.toString()).toEqual("Error: Action error")
            console.error(e)
        }
    })

    expect(messages).toMatchSnapshot()
})

test("out of order startAction / endAction", () => {
    const a1 = mobx._startAction("a1")
    const a2 = mobx._startAction("a2")

    expect(() => mobx._endAction(a1)).toThrow("invalid action stack")

    mobx._endAction(a2)

    // double finishing
    expect(() => mobx._endAction(a2)).toThrow("invalid action stack")

    mobx._endAction(a1)
})

test("given actionName, the action function name should be defined as the actionName", () => {
    const a1 = mobx.action("testAction", () => {})
    expect(a1.name).toBe("testAction")
})

test("given anonymous action, the action name should be <unnamed action>", () => {
    const a1 = mobx.action(() => {})
    expect(a1.name).toBe("<unnamed action>")
})

test("given function declaration, the action name should be as the function name", () => {
    const a1 = mobx.action(function testAction() {})
    expect(a1.name).toBe("testAction")
})
