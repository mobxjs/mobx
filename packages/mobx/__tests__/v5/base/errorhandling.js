const mobx = require("../../../src/mobx.ts")
const m = mobx
const utils = require("../../v5/utils/test-utils")

const { observable, computed, $mobx, autorun } = mobx

const voidObserver = function () { }

function checkGlobalState() {
    const gs = mobx._getGlobalState()
    expect(gs.isRunningReactions).toBe(false)
    expect(gs.trackingDerivation).toBe(null)
    expect(gs.inBatch).toBe(0)
    expect(gs.allowStateChanges).toBe(!gs.strictMode)
    expect(gs.pendingUnobservations.length).toBe(0)
}

test("exception1", function () {
    const a = computed(function () {
        throw "hoi"
    })
    expect(() => a.get()).toThrow(/hoi/)
    checkGlobalState()
})

test("exceptions in computed values can be recovered from", () => {
    const a = observable({
        x: 1,
        get y() {
            if (this.x === 2) throw "Uhoh"
            return this.x * 2
        }
    })

    expect(a.y).toBe(2)
    a.x = 2

    expect(() => a.y).toThrowError(/Uhoh/)

    checkGlobalState()

    a.x = 3
    expect(a.y).toBe(6)
    checkGlobalState()
})

test("exception when starting autorun can be recovered from", () => {
    let b = undefined
    const a = observable({
        x: 2,
        get y() {
            if (this.x === 2) throw "Uhoh"
            return this.x * 2
        }
    })

    utils.consoleError(() => {
        mobx.autorun(() => {
            b = a.y
        })
    }, /Uhoh/)
    expect(b).toBe(undefined)
    checkGlobalState()
    a.x = 3
    expect(b).toBe(6)
    checkGlobalState()
    expect(mobx.getAtom(a, "y").observers_.size).toBe(1)
})

test("exception in autorun can be recovered from", () => {
    let b = undefined
    const a = observable({
        x: 1,
        get y() {
            if (this.x === 2) throw "Uhoh"
            return this.x * 2
        }
    })

    const d = mobx.autorun(() => {
        b = a.y
    })
    expect(a.y).toBe(2)
    expect(b).toBe(2)
    expect(mobx.getAtom(a, "y").observers_.size).toBe(1)

    utils.consoleError(() => {
        a.x = 2
    }, /Uhoh/)

    // exception is also rethrown to each consumer
    expect(() => {
        expect(a.y).toBe(2) // old cached value!
    }).toThrowError(/Uhoh/)
    expect(mobx.getAtom(a, "y").observers_.size).toBe(1)

    expect(b).toBe(2)
    checkGlobalState()

    a.x = 3
    expect(a.y).toBe(6)
    expect(b).toBe(6)
    checkGlobalState()
    expect(mobx.getAtom(a, "y").observers_.size).toBe(1)
    d()
    expect(mobx.getAtom(a, "y").observers_.size).toBe(0)
})

test("multiple autoruns with exceptions are handled correctly", () => {
    const a = mobx.observable.box(1)
    const values = []
    const d1 = mobx.autorun(() => values.push("a" + a.get()))
    const d2 = mobx.autorun(() => {
        if (a.get() === 2) throw /Uhoh/
        values.push("b" + a.get())
    })
    const d3 = mobx.autorun(() => values.push("c" + a.get()))

    expect(values).toEqual(["a1", "b1", "c1"])
    values.splice(0)

    utils.consoleError(() => a.set(2), /Uhoh/)
    checkGlobalState()

    expect(values.sort()).toEqual(["a2", "c2"]) // order is irrelevant
    values.splice(0)

    a.set(3)
    expect(values.sort()).toEqual(["a3", "b3", "c3"]) // order is irrelevant

    checkGlobalState()
    d1()
    d2()
    d3()
})

test("deny state changes in views", function () {
    const x = observable.box(3)
    const z = observable.box(5)
    const y = computed(function () {
        z.set(6)
        return x.get() * x.get()
    })

    expect(() => {
        y.get() // modifying unobserved values in computeds is allowed, so that new observables can be created and returned
    }).not.toThrow()

    m.reaction(
        () => z.get(),
        () => { }
    )
    expect(
        utils.grabConsole(() => {
            y.get()
        })
    ).toMatchInlineSnapshot(
        `"<STDOUT> [MobX] Side effects like changing state are not allowed at this point. Are you trying to modify state from, for example, a computed value or the render function of a React component? You can wrap side effects in 'runInAction' (or decorate functions with 'action') if needed. Tried to modify: ObservableValue@15"`
    )

    checkGlobalState()
})

test("allow state changes in autorun", function () {
    const x = observable.box(3)
    const z = observable.box(3)

    m.autorun(function () {
        if (x.get() !== 3) z.set(x.get())
    })

    expect(x.get()).toBe(3)
    expect(z.get()).toBe(3)

    x.set(5) // autorunneres are allowed to change state

    expect(x.get()).toBe(5)
    expect(z.get()).toBe(5)

    expect(mobx._isComputingDerivation()).toBe(false)
    checkGlobalState()
})

test("deny array change in view", function (done) {
    const x = observable.box(3)
    const z = observable([])
    const y = computed(function () {
        z.push(3)
        return x.get() * x.get()
    })

    expect(function () {
        y.get() // modifying z is allowed if nobody is observing
    }).not.toThrow()
    m.reaction(
        () => z.length,
        () => { }
    )

    expect(
        utils.grabConsole(function () {
            y.get()
        })
    ).toMatchInlineSnapshot(
        `"<STDOUT> [MobX] Side effects like changing state are not allowed at this point. Are you trying to modify state from, for example, a computed value or the render function of a React component? You can wrap side effects in 'runInAction' (or decorate functions with 'action') if needed. Tried to modify: ObservableArray@22"`
    )

    expect(z.slice()).toEqual([3, 3])
    expect(mobx._isComputingDerivation()).toBe(false)

    checkGlobalState()
    done()
})

test("allow array change in autorun", function () {
    const x = observable.box(3)
    const z = observable([])
    m.autorun(function () {
        if (x.get() > 4) z.push(x.get())
    })

    x.set(5)
    x.set(6)
    expect(z.slice()).toEqual([5, 6])
    x.set(2)
    expect(z.slice()).toEqual([5, 6])

    expect(mobx._isComputingDerivation()).toBe(false)
    checkGlobalState()
})

test("throw error if modification loop", function () {
    const x = observable.box(3)
    m.autorun(function () {
        x.set(x.get() + 1) // is allowed to throw, but doesn't as the observables aren't bound yet during first execution
    })
    utils.consoleError(() => {
        x.set(5)
    }, /Reaction doesn't converge to a stable state/)
    checkGlobalState()
})

test("cycle1", function () {
    const p = computed(function () {
        return p.get() * 2
    }) // thats a cycle!
    utils.consoleError(() => {
        mobx.observe(p, voidObserver, true)
    }, /Cycle detected/)
    checkGlobalState()
})

test("cycle2", function () {
    const a = computed(function () {
        return b.get() * 2
    })
    const b = computed(function () {
        return a.get() * 2
    })
    expect(() => {
        b.get()
    }).toThrow(/Cycle detected/)
    checkGlobalState()
})

test("cycle3", function () {
    const p = computed(function () {
        return p.get() * 2
    })
    expect(() => {
        p.get()
    }).toThrow(/Cycle detected/)
    checkGlobalState()
})

test("cycle4", function () {
    const z = observable.box(true)
    const a = computed(function () {
        return z.get() ? 1 : b.get() * 2
    })
    const b = computed(function () {
        return a.get() * 2
    })

    m.observe(b, voidObserver)
    expect(1).toBe(a.get())

    utils.consoleError(() => {
        z.set(false) // introduces a cycle!
    }, /Cycle detected/)
    checkGlobalState()
})

test("throws when the max iterations over reactions are done", () => {
    const foo = mobx.observable({
        a: 1
    })

    mobx.autorun(
        () => {
            foo.a
            foo.a = Math.random()
        },
        { name: "bar" }
    )

    utils.consoleError(
        () => foo.a++,
        /Reaction doesn't converge to a stable state after 100 iterations/
    )
    mobx._resetGlobalState()
})

test("issue 86, converging cycles", function () {
    function findIndex(arr, predicate) {
        for (let i = 0, l = arr.length; i < l; i++) if (predicate(arr[i]) === true) return i
        return -1
    }

    const deleteThisId = mobx.observable.box(1)
    const state = mobx.observable({ someArray: [] })
    let calcs = 0

    state.someArray.push({ id: 1, text: "I am 1" })
    state.someArray.push({ id: 2, text: "I am 2" })

    // should delete item 1 in first run, which works fine
    mobx.autorun(() => {
        calcs++
        const i = findIndex(state.someArray, item => item.id === deleteThisId.get())
        state.someArray.remove(state.someArray[i])
    })

    expect(state.someArray.length).toBe(1) // should be 1, which prints fine
    expect(calcs).toBe(1)
    deleteThisId.set(2) // should delete item 2, but it errors on cycle

    expect(state.someArray.length).toBe(0) // should be 0, which never prints
    expect(calcs).toBe(3)

    checkGlobalState()
})

test("slow converging cycle", function () {
    const x = mobx.observable.box(1)
    let res = -1
    mobx.autorun(() => {
        if (x.get() === 100) res = x.get()
        else x.set(x.get() + 1)
    })

    // ideally the outcome should be 100 / 100.
    // autorun is only an observer of x *after* the first run, hence the initial outcome is not as expected..
    // is there a practical use case where such a pattern would be expected?
    // maybe we need to immediately register observers on the observable? but that would be slow....
    // or detect cycles and re-run the autorun in that case once?
    expect(x.get()).toBe(2)
    expect(res).toBe(-1)

    x.set(7)
    expect(x.get()).toBe(100)
    expect(res).toBe(100)

    checkGlobalState()
})

test("error handling assistence ", function (done) {
    const baseError = console.error
    const baseWarn = console.warn
    const errors = [] // logged errors
    const warns = [] // logged warns
    const values = [] // produced errors
    const thrown = [] // list of actually thrown exceptons

    console.error = function (msg) {
        errors.push(msg)
    }
    console.warn = function (msg) {
        warns.push(msg)
    }

    const a = observable.box(3)
    const b = computed(function () {
        if (a.get() === 42) throw "should not be 42"
        return a.get() * 2
    })

    m.autorun(function () {
        values.push(b.get())
    })

    a.set(2)
    try {
        a.set(42)
    } catch (e) {
        thrown.push(e)
    }
    a.set(7)

    // Test recovery
    setTimeout(function () {
        a.set(4)
        try {
            a.set(42)
        } catch (e) {
            thrown.push(e)
        }

        expect(values).toEqual([6, 4, 14, 8])
        expect(errors.length).toBe(2)
        expect(warns.length).toBe(0)
        expect(thrown.length).toBe(0) // Mobx doesn't propagate throws from reactions

        console.error = baseError
        console.warn = baseWarn

        checkGlobalState()
        done()
    }, 10)
})

test("236 - cycles", () => {
    const Parent = function () {
        m.extendObservable(this, {
            children: [],
            get total0() {
                // Sum "value" of children of kind "0"
                return this.children
                    .filter(c => c.kind === 0)
                    .map(c => c.value)
                    .reduce((a, b) => a + b, 0)
            },
            get total1() {
                // Sum "value" of children of kind "1"
                return this.children
                    .filter(c => c.kind === 1)
                    .map(c => c.value)
                    .reduce((a, b) => a + b, 0)
            }
        })
    }

    const Child = function (parent, kind) {
        this.parent = parent
        m.extendObservable(this, {
            kind: kind,
            get value() {
                if (this.kind === 0) {
                    return 3
                } else {
                    // Value of child of kind "1" depends on the total value for all children of kind "0"
                    return this.parent.total0 * 2
                }
            }
        })
    }

    const parent = new Parent()
    parent.children.push(new Child(parent, 0))
    parent.children.push(new Child(parent, 0))
    parent.children.push(new Child(parent, 0))

    const msg = []
    m.autorun(() => {
        msg.push("total0:", parent.total0, "total1:", parent.total1)
    })
    // So far, so good: total0: 9 total1: 0
    expect(msg).toEqual(["total0:", 9, "total1:", 0])
    parent.children[0].kind = 1
    expect(msg).toEqual(["total0:", 9, "total1:", 0, "total0:", 6, "total1:", 12])

    checkGlobalState()
})

test("peeking inside erroring computed value doesn't bork (global) state", () => {
    const a = mobx.observable.box(1)
    const b = mobx.computed(() => {
        a.get()
        throw "chocolademelk"
    })

    expect(() => {
        b.get()
    }).toThrowError(/chocolademelk/)

    expect(a.isPendingUnobservation_).toBe(false)
    expect(a.observers_.size).toBe(0)
    expect(a.diffValue_).toBe(0)
    expect(a.lowestObserverState_).toBe(-1)
    expect(a.hasUnreportedChange_).toBe(false)
    expect(a.value_).toBe(1)

    expect(b.dependenciesState_).toBe(-1) // NOT_TRACKING
    expect(b.observing_.length).toBe(0)
    expect(b.newObserving_).toBe(null)
    expect(b.isPendingUnobservation_).toBe(false)
    expect(b.observers_.size).toBe(0)
    expect(b.diffValue_).toBe(0)
    expect(b.lowestObserverState_).toBe(0)
    expect(b.unboundDepsCount_).toBe(0)
    expect(() => {
        b.get()
    }).toThrowError(/chocolademelk/)
    expect(b.isComputing_).toBe(false)

    checkGlobalState()
})

describe("peeking inside autorun doesn't bork (global) state", () => {
    let r = -1
    const a = mobx.observable.box(1)
    const b = mobx.computed(() => {
        const res = (r = a.get())
        if (res === 2) throw "chocolademelk"
        return res
    })
    const d = mobx.autorun(() => b.get())
    const c = d[$mobx]

    expect(b.get()).toBe(1)
    expect(r).toBe(1)

    test("it should update correctly initially", () => {
        expect(a.isPendingUnobservation_).toBe(false)
        expect(a.observers_.size).toBe(1)
        expect(a.diffValue_).toBe(0)
        expect(a.lowestObserverState_).toBe(-1)
        expect(a.hasUnreportedChange_).toBe(false)
        expect(a.value_).toBe(1)

        expect(b.dependenciesState_).toBe(0)
        expect(b.observing_.length).toBe(1)
        expect(b.newObserving_).toBe(null)
        expect(b.isPendingUnobservation_).toBe(false)
        expect(b.observers_.size).toBe(1)
        expect(b.diffValue_).toBe(0)
        expect(b.lowestObserverState_).toBe(0)
        expect(b.unboundDepsCount_).toBe(1) // value is always the last bound amount of observers
        expect(b.value_).toBe(1)
        expect(b.isComputing_).toBe(false)

        expect(c.dependenciesState_).toBe(0)
        expect(c.observing_.length).toBe(1)
        expect(c.newObserving_).toBe(null)
        expect(c.diffValue_).toBe(0)
        expect(c.unboundDepsCount_).toBe(1)
        expect(c.isDisposed_).toBe(false)
        expect(c.isScheduled_).toBe(false)
        expect(c.isTrackPending_).toBe(false)
        expect(c.isRunning_).toBe(false)
        checkGlobalState()
    })

    test("it should not break internal consistency when exception occurred", () => {
        // Trigger exception
        utils.consoleError(() => {
            a.set(2)
        }, /chocolademelk/)
        expect(r).toBe(2)

        expect(a.isPendingUnobservation_).toBe(false)
        expect(a.observers_.size).toBe(1)
        expect(a.diffValue_).toBe(0)
        expect(a.lowestObserverState_).toBe(0)
        expect(a.hasUnreportedChange_).toBe(false)
        expect(a.value_).toBe(2)

        expect(b.dependenciesState_).toBe(0) // up to date (for what it's worth)
        expect(b.observing_.length).toBe(1)
        expect(b.newObserving_).toBe(null)
        expect(b.isPendingUnobservation_).toBe(false)
        expect(b.observers_.size).toBe(1)
        expect(b.diffValue_).toBe(0)
        expect(b.lowestObserverState_).toBe(0)
        expect(b.unboundDepsCount_).toBe(1)
        expect(b.isComputing_).toBe(false)
        expect(() => b.get()).toThrowError(/chocolademelk/)

        expect(c.dependenciesState_).toBe(0)
        expect(c.observing_.length).toBe(1)
        expect(c.newObserving_).toBe(null)
        expect(c.diffValue_).toBe(0)
        expect(c.unboundDepsCount_).toBe(1)
        expect(c.isDisposed_).toBe(false)
        expect(c.isScheduled_).toBe(false)
        expect(c.isTrackPending_).toBe(false)
        expect(c.isRunning_).toBe(false)
        checkGlobalState()
    })

    // Trigger a new change, will this recover?
    // is this actually a supported case or should we just give up?
    test("it should recover from errors", () => {
        a.set(3)
        expect(r).toBe(3)

        expect(a.isPendingUnobservation_).toBe(false)
        expect(a.observers_.size).toBe(1)
        expect(a.diffValue_).toBe(0)
        expect(a.lowestObserverState_).toBe(0)
        expect(a.hasUnreportedChange_).toBe(false)
        expect(a.value_).toBe(3)

        expect(b.dependenciesState_).toBe(0) // up to date
        expect(b.observing_.length).toBe(1)
        expect(b.newObserving_).toBe(null)
        expect(b.isPendingUnobservation_).toBe(false)
        expect(b.observers_.size).toBe(1)
        expect(b.diffValue_).toBe(0)
        expect(b.lowestObserverState_).toBe(0)
        expect(b.unboundDepsCount_).toBe(1)
        expect(b.value_).toBe(3)
        expect(b.isComputing_).toBe(false)

        expect(c.dependenciesState_).toBe(0)
        expect(c.observing_.length).toBe(1)
        expect(c.newObserving_).toBe(null)
        expect(c.diffValue_).toBe(0)
        expect(c.unboundDepsCount_).toBe(1)
        expect(c.isDisposed_).toBe(false)
        expect(c.isScheduled_).toBe(false)
        expect(c.isTrackPending_).toBe(false)
        expect(c.isRunning_).toBe(false)

        checkGlobalState()
    })

    test("it should clean up correctly", () => {
        d()

        expect(a.isPendingUnobservation_).toBe(false)
        expect(a.observers_.size).toBe(0)
        expect(a.diffValue_).toBe(0)
        expect(a.lowestObserverState_).toBe(0)
        expect(a.hasUnreportedChange_).toBe(false)
        expect(a.value_).toBe(3)

        expect(b.dependenciesState_).toBe(-1) // not tracking
        expect(b.observing_.length).toBe(0)
        expect(b.newObserving_).toBe(null)
        expect(b.isPendingUnobservation_).toBe(false)
        expect(b.observers_.size).toBe(0)
        expect(b.diffValue_).toBe(0)
        expect(b.lowestObserverState_).toBe(0)
        expect(b.unboundDepsCount_).toBe(1)
        expect(b.value_).not.toBe(3)
        expect(b.isComputing_).toBe(false)

        expect(c.dependenciesState_).toBe(-1)
        expect(c.observing_.length).toBe(0)
        expect(c.newObserving_).toBe(null)
        expect(c.diffValue_).toBe(0)
        expect(c.unboundDepsCount_).toBe(1)
        expect(c.isDisposed_).toBe(true)
        expect(c.isScheduled_).toBe(false)
        expect(c.isTrackPending_).toBe(false)
        expect(c.isRunning_).toBe(false)

        expect(b.get()).toBe(3)

        checkGlobalState()
    })
})

test("it should be possible to handle exceptions in reaction", () => {
    utils.supressConsole(() => {
        const errors = []
        const a = mobx.observable.box(1)
        const d = mobx.autorun(
            function () {
                throw a.get()
            },
            {
                onError(e) {
                    errors.push(e)
                }
            }
        )

        a.set(2)
        a.set(3)

        expect(errors).toEqual([1, 2, 3])
        d()

        checkGlobalState()
    })
})

test("it should be possible to handle global errors in reactions", () => {
    utils.supressConsole(() => {
        const a = mobx.observable.box(1)
        const errors = []
        const d2 = mobx.onReactionError(e => errors.push(e))

        const d = mobx.autorun(function () {
            throw a.get()
        })

        a.set(2)
        a.set(3)

        d2()
        a.set(4)

        expect(errors).toEqual([1, 2, 3])
        d()

        checkGlobalState()
    })
})

test("it should be possible to handle global errors in reactions - 2 - #1480", () => {
    utils.supressConsole(() => {
        const a = mobx.observable.box(1)
        const errors = []
        const d2 = mobx.onReactionError(e => errors.push(e))

        const d = mobx.reaction(
            () => a.get(),
            a => {
                if (a >= 2) throw a
            }
        )

        a.set(2)
        a.set(3)

        d2()
        a.set(4)

        expect(errors).toEqual([2, 3])
        d()

        checkGlobalState()
    })
})

test("global error handling will be skipped when using disableErrorBoundaries - 1", () => {
    utils.supressConsole(() => {
        mobx.configure({ disableErrorBoundaries: true })
        try {
            mobx.observable.box(1)

            expect(() => {
                mobx.autorun(function () {
                    throw "OOPS"
                })
            }).toThrowError(/OOPS/)
        } finally {
            mobx.configure({ disableErrorBoundaries: false })
            mobx._resetGlobalState()
        }
    })
})

test("global error handling will be skipped when using disableErrorBoundaries - 2", () => {
    utils.supressConsole(() => {
        mobx.configure({ disableErrorBoundaries: true })
        try {
            const a = mobx.observable.box(1)

            const d = mobx.reaction(
                () => a.get(),
                () => {
                    throw "OOPS"
                }
            )
            expect(() => {
                a.set(2)
            }).toThrowError(/OOPS/)

            d()
        } finally {
            mobx.configure({ disableErrorBoundaries: false })
            mobx._resetGlobalState()
        }
    })
})

test("error in effect of when is properly cleaned up", () => {
    checkGlobalState()

    const b = mobx.observable.box(1)
    utils.supressConsole(() => {
        mobx.when(
            () => b.get() === 2,
            () => {
                throw "OOPS"
            }
        )
        b.set(2)
    })

    checkGlobalState()
})

describe("es5 compat warnings", () => {
    beforeEach(() => {
        mobx.configure({
            useProxies: "ifavailable"
        })
    })

    test("adding / deleting property", () => {
        const x = observable({
            z: 0
        })

        expect(() => {
            x.y = 2
        }).toThrowErrorMatchingInlineSnapshot(
            `"[MobX] MobX is currently configured to be able to run in ES5 mode, but in ES5 MobX won't be able to add a new observable property through direct assignment. Use 'set' from 'mobx' instead."`
        )

        expect(() => {
            delete x.z
        }).toThrowErrorMatchingInlineSnapshot(
            `"[MobX] MobX is currently configured to be able to run in ES5 mode, but in ES5 MobX won't be able to delete properties from an observable object. Use 'remove' from 'mobx' instead."`
        )
    })

    test("iterating props", () => {
        const x = observable({
            z: 0
        })

        expect(() => {
            "z" in x
        }).not.toThrowError()

        let e
        autorun(() => {
            try {
                "z" in x
            } catch (err) {
                e = err
            }
        })
        expect(e).toMatchInlineSnapshot(
            `[Error: [MobX] MobX is currently configured to be able to run in ES5 mode, but in ES5 MobX won't be able to detect new properties using the 'in' operator. Use 'has' from 'mobx' instead.]`
        )

        e = undefined

        expect(() => {
            Object.getOwnPropertyNames(x)
        }).not.toThrowError()
        autorun(() => {
            try {
                Object.getOwnPropertyNames(x)
            } catch (err) {
                e = err
            }
        })
        expect(e).toMatchInlineSnapshot(
            `[Error: [MobX] MobX is currently configured to be able to run in ES5 mode, but in ES5 MobX won't be able to iterate keys to detect added / removed properties. Use 'keys' from 'mobx' instead.]`
        )
    })

    afterEach(() => {
        mobx._resetGlobalState()
        mobx.configure({
            useProxies: "always"
        })
    })
})

test("should throw when adding properties in ES5 compat mode", () => { })
