/**
 * @type {typeof import("../../../src/v5/mobx")}
 */
const mobx = require("../../../src/mobx.ts")
const utils = require("../../v5/utils/test-utils")
const { makeObservable } = mobx

const strictError =
    "Since strict-mode is enabled, changing (observed) observable values without using an action is not allowed."

beforeEach(() => {
    mobx.configure({ enforceActions: "observed" })
})

test("strict mode should not allow changes outside action", () => {
    const a = mobx.observable.box(2)
    mobx.configure({ enforceActions: "observed" })

    // allowed, a is not observed
    a.set(3)

    const d = mobx.autorun(() => a.get())
    // not-allowed, a is observed
    expect(utils.grabConsole(() => a.set(3))).toMatch(strictError)
    d()

    mobx.configure({ enforceActions: "never" })
    a.set(4)
    expect(a.get()).toBe(4)
})

test("actions can modify observed state in strict mode", () => {
    const a = mobx.observable.box(2)
    const d = mobx.autorun(() => a.get())

    mobx.configure({ enforceActions: "observed" })
    mobx.action(() => {
        a.set(3)
        mobx.observable.box(4)
    })()

    mobx.configure({ enforceActions: "never" })
    d()
})

test("actions can modify non-observed state in strict mode", () => {
    const a = mobx.observable.box(2)

    mobx.configure({ enforceActions: "observed" })
    mobx.action(() => {
        a.set(3)
        mobx.observable.box(4)
    })()

    mobx.configure({ enforceActions: "never" })
})

test("reactions cannot modify state in strict mode", () => {
    const a = mobx.observable.box(3)
    const b = mobx.observable.box(4)
    mobx.configure({ enforceActions: "observed" })
    mobx._resetGlobalState() // should preserve strict mode

    const bd = mobx.autorun(() => {
        b.get() // make sure it is observed
    })

    let d = mobx.autorun(() => {
        expect(
            utils.grabConsole(() => {
                a.get()
                b.set(3)
            })
        ).toMatch(strictError)
    })

    d = mobx.autorun(() => {
        if (a.get() > 5) b.set(7)
    })

    mobx.action(() => a.set(4))() // ok

    expect(utils.grabConsole(() => a.set(5))).toMatch(strictError)

    mobx.configure({ enforceActions: "never" })
    d()
    bd()
})

test("action inside reaction in strict mode can modify state", () => {
    const a = mobx.observable.box(1)
    const b = mobx.observable.box(2)

    const bd = mobx.autorun(() => {
        b.get() // make sure it is observed
    })

    mobx.configure({ enforceActions: "observed" })
    const act = mobx.action(() => b.set(b.get() + 1))

    const d = mobx.autorun(() => {
        if (a.get() % 2 === 0) act()
        if (a.get() == 16) {
            expect(utils.grabConsole(() => b.set(55))).toMatch(strictError)
        }
    })

    const setA = mobx.action(val => a.set(val))
    expect(b.get()).toBe(2)
    setA(4)
    expect(b.get()).toBe(3)
    setA(5)
    expect(b.get()).toBe(3)
    setA(16)
    expect(b.get()).toBe(55)

    mobx.configure({ enforceActions: "never" })
    bd()
    d()
})

test("cannot create or modify objects in strict mode without action", () => {
    const obj = mobx.observable({ a: 2 })
    /*const ar = */ mobx.observable([1])
    /*const map = */ mobx.observable.map({ a: 2 })

    mobx.configure({ enforceActions: "observed" })

    // introducing new observables is ok!
    // mobx.observable({ a: 2, b: function() { return this.a }});
    // mobx.observable({ b: function() { return this.a } });
    // mobx.observable.map({ a: 2});
    // mobx.observable([1, 2, 3]);
    // mobx.extendObservable(obj, { b: 4});

    // t.throws(() => obj.a = 3, strictError);
    // t.throws(() => ar[0] = 2, strictError);
    // t.throws(() => ar.push(3), strictError);
    // t.throws(() => map.set("a", 3), strictError);
    // t.throws(() => map.set("b", 4), strictError);
    // t.throws(() => map.delete("a"), strictError);

    mobx.configure({ enforceActions: "never" })

    // can modify again
    obj.a = 42
})

test("can create objects in strict mode with action", () => {
    const obj = mobx.observable({ a: 2 })
    const ar = mobx.observable([1])
    const map = mobx.observable.map({ a: 2 })

    mobx.configure({ enforceActions: "observed" })

    mobx.action(() => {
        mobx.observable({
            a: 2,
            b: function () {
                return this.a
            }
        })
        mobx.observable.map({ a: 2 })
        mobx.observable([1, 2, 3])

        obj.a = 3
        mobx.extendObservable(obj, { b: 4 })
        ar[0] = 2
        ar.push(3)
        map.set("a", 3)
        map.set("b", 4)
        map.delete("a")
    })()
})

test("strict mode checks", function () {
    mobx.configure({
        enforceActions: "never"
    })
    const x = mobx.observable.box(3)
    const d = mobx.autorun(() => x.get())

    mobx._allowStateChanges(false, function () {
        x.get()
    })

    mobx._allowStateChanges(true, function () {
        x.set(7)
    })

    expect(
        utils.grabConsole(function () {
            mobx._allowStateChanges(false, function () {
                x.set(4)
            })
        })
    ).toMatch(/Side effects like changing state are not allowed at this point/)

    mobx._resetGlobalState()
    d()
})

test("enforceActions 'strict' does not allow changing unobserved observables", () => {
    try {
        mobx.configure({ enforceActions: "always" })
        const x = mobx.observable({
            a: 1,
            b: 2
        })
        const d = mobx.autorun(() => {
            x.a
        })

        expect(
            utils.grabConsole(() => {
                x.a = 2
            })
        ).toMatch(/Since strict-mode is enabled/)
        expect(
            utils.grabConsole(() => {
                x.b = 2
            })
        ).toMatch(/Since strict-mode is enabled/)

        d()
    } finally {
        mobx.configure({ enforceActions: "never" })
    }
})

test("enforceActions 'strict' should not throw exception while observable array initialization", () => {
    try {
        mobx.configure({ enforceActions: "always" })

        expect(() => {
            mobx.observable({
                a: [1, 2]
            })
        }).not.toThrow(/Since strict-mode is enabled/)
    } finally {
        mobx.configure({ enforceActions: "never" })
    }
})

test("warn on unsafe reads of computed", function () {
    try {
        mobx.configure({ computedRequiresReaction: true })
        const x = mobx.observable({
            y: 3,
            get yy() {
                return this.y * 2
            }
        })
        utils.consoleWarn(() => {
            x.yy
        }, /being read outside a reactive context/)
    } finally {
        mobx.configure({ computedRequiresReaction: false })
    }
})

describe("observableRequiresReaction", function () {
    test("warn on unsafe reads of observable", function () {
        try {
            mobx.configure({ observableRequiresReaction: true })
            const x = mobx.observable({
                y: 3
            })
            utils.consoleWarn(() => {
                x.y
            }, /being read outside a reactive context/)
        } finally {
            mobx.configure({ observableRequiresReaction: false })
        }
    })

    test("warn on unsafe reads of observable also when there are other subscriptions", function () {
        try {
            mobx.configure({ observableRequiresReaction: true })
            const x = mobx.observable({
                y: 3
            })

            const dispose = mobx.autorun(() => x.y)

            utils.consoleWarn(() => {
                x.y
            }, /being read outside a reactive context/)

            dispose()
        } finally {
            mobx.configure({ observableRequiresReaction: false })
        }
    })

    test("warn on unsafe reads of observable array", function () {
        try {
            mobx.configure({ observableRequiresReaction: true })
            const x = mobx.observable({
                arr: [1, 2, 3]
            })
            utils.consoleWarn(() => {
                x.arr[1]
            }, /being read outside a reactive context/)
        } finally {
            mobx.configure({ observableRequiresReaction: false })
        }
    })
    test("don't warn on reads inside a computed", function () {
        try {
            mobx.configure({ observableRequiresReaction: true })
            const x = mobx.observable({
                y: 1
            })

            const fooComputed = mobx.computed(() => x.y + 1)

            const messages = utils.supressConsole(() => {
                const dispose = mobx.autorun(() => fooComputed.get())
                dispose()
            })

            expect(messages.length).toBe(0)
        } finally {
            mobx.configure({ observableRequiresReaction: false })
        }
    })

    test("don't warn on autorun tracks invalidation of unbound dependencies", function () {
        // #2195
        try {
            mobx.configure({ observableRequiresReaction: true, enforceActions: "never" })
            const a = mobx.observable.box(0)
            const b = mobx.observable.box(0)
            const c = mobx.computed(() => a.get() + b.get())
            const values = []

            mobx.autorun(() => {
                values.push(c.get())
                b.set(100)
            })

            const messages = utils.supressConsole(() => {
                a.set(1)
            })

            expect(messages.length).toBe(0)
        } finally {
            mobx.configure({ observableRequiresReaction: false })
        }
    })

    test("don't warn on autorun tracks invalidation of unbound dependencies - also with action", function () {
        // #2195
        try {
            mobx.configure({ observableRequiresReaction: true, enforceActions: "never" })
            const a = mobx.observable.box(0)
            const b = mobx.observable.box(0)
            const c = mobx.computed(() => a.get() + b.get())
            const values = []

            mobx.autorun(() => {
                values.push(c.get())
                b.set(100)
            })

            const messages = utils.supressConsole(
                mobx.action(() => {
                    a.set(1)
                })
            )

            expect(messages.length).toBe(0)
        } finally {
            mobx.configure({ observableRequiresReaction: false })
        }
    })

    test("don't warn on reads inside an action", function () {
        try {
            mobx.configure({ observableRequiresReaction: true })
            const x = mobx.observable({
                y: 1
            })

            const fooAction = mobx.action(() => x.y)

            const messages = utils.supressConsole(() => {
                fooAction()
            })

            expect(messages.length).toBe(0)
        } finally {
            mobx.configure({ observableRequiresReaction: false })
        }
    })

    test("warn on reads inside a transaction", function () {
        try {
            mobx.configure({ observableRequiresReaction: true })
            const x = mobx.observable({
                y: 1
            })

            utils.consoleWarn(() => {
                mobx.transaction(() => x.y)
            }, /being read outside a reactive context/)
        } finally {
            mobx.configure({ observableRequiresReaction: false })
        }
    })
})

describe("reactionRequiresObservable", function () {
    test("warn on reaction creation without dependencies", function () {
        try {
            mobx.configure({ reactionRequiresObservable: true })

            utils.consoleWarn(() => {
                const dispose = mobx.reaction(
                    () => "plain value",
                    newValue => newValue
                )

                dispose()
            }, /is created\/updated without reading any observable value/)
        } finally {
            mobx.configure({ reactionRequiresObservable: false })
        }
    })
})

test("#1869", function () {
    const x = mobx.observable.box(3)
    mobx.configure({ enforceActions: "always", isolateGlobalState: true })
    expect(
        utils.grabConsole(() => {
            x.set(4)
        })
    ).toMatch("Since strict-mode is enabled")
    mobx._resetGlobalState() // should preserve strict mode
})
