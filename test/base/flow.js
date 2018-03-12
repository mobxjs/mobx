import * as mobx from "../../src/mobx.ts"
const { flow } = mobx

function delay(time, value, shouldThrow = false) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (shouldThrow) reject(value)
            else resolve(value)
        }, time)
    })
}

test("it should support async generator actions", done => {
    mobx.configure({ enforceActions: true })
    const values = []
    const x = mobx.observable({ a: 1 })
    mobx.reaction(() => x.a, v => values.push(v), { fireImmediately: true })

    const f = mobx.flow(function*(initial) {
        x.a = initial // this runs in action
        x.a = yield delay(100, 3) // and this as well!
        yield delay(100, 0)
        x.a = 4
        return x.a
    })

    setTimeout(() => {
        f(2).then(v => {
            // note: ideally, type of v should be inferred..
            expect(v).toBe(4)
            expect(values).toEqual([1, 2, 3, 4])
            done()
        })
    }, 10)
})

test("it should support try catch in async generator", done => {
    mobx.configure({ enforceActions: true })
    const values = []
    const x = mobx.observable({ a: 1 })
    mobx.reaction(() => x.a, v => values.push(v), { fireImmediately: true })

    const f = mobx.flow(function*(initial) {
        x.a = initial // this runs in action
        try {
            x.a = yield delay(100, 5, true) // and this as well!
            yield delay(100, 0)
            x.a = 4
        } catch (e) {
            x.a = e
        }
        return x.a
    })

    setTimeout(() => {
        f(2).then(v => {
            // note: ideally, type of v should be inferred..
            expect(v).toBe(5)
            expect(values).toEqual(values, [1, 2, 5])
            done()
        })
    }, 10)
})

test("it should support throw from async generator", done => {
    mobx.flow(function*() {
        throw 7
    })().then(
        () => {
            done.fail("should fail")
        },
        e => {
            expect(e).toBe(7)
            done()
        }
    )
})

test("it should support throw from yielded promise generator", done => {
    mobx.flow(function*() {
        return yield delay(10, 7, true)
    })().then(
        () => {
            done.fail("should fail")
        },
        e => {
            expect(e).toBe(7)
            done()
        }
    )
})

test("it should support asyncAction as decorator", done => {
    const values = []

    mobx.configure({ enforceActions: true })

    class X {
        a = 1;

        *f(initial) {
            this.a = initial // this runs in action
            try {
                this.a = yield delay(100, 5, true) // and this as well!
                yield delay(100, 0)
                this.a = 4
            } catch (e) {
                this.a = e
            }
            return this.a
        }
    }
    mobx.decorate(X, {
        a: mobx.observable,
        f: mobx.flow
    })

    const x = new X()
    mobx.reaction(() => x.a, v => values.push(v), { fireImmediately: true })

    setTimeout(() => {
        x.f(2).then(v => {
            expect(v).toBe(5)
            expect(values).toEqual([1, 2, 5])
            expect(x.a).toBe(5)
            done()
        })
    }, 10)
})

test("it should support logging", done => {
    mobx.configure({ enforceActions: true })
    const events = []
    const x = mobx.observable({ a: 1 })

    const f = mobx.flow("myaction", function*(initial) {
        x.a = initial
        x.a = yield delay(100, 5)
        x.a = 4
        x.a = yield delay(100, 3)
        return x.a
    })
    const d = mobx.spy(ev => events.push(ev))

    setTimeout(() => {
        f(2).then(() => {
            expect(stripEvents(events)).toMatchSnapshot()
            d()
            done()
        })
    }, 10)
})

function stripEvents(events) {
    return events.map(e => {
        delete e.object
        delete e.fn
        delete e.time
        return e
    })
}

test("flows can be cancelled - 1 - uncatched cancellation", done => {
    let steps = 0
    const start = flow(function*() {
        steps = 1
        yield Promise.resolve()
        steps = 2
    })

    const promise = start()
    promise.then(
        () => {
            debugger
            fail()
        },
        err => {
            debugger
            expect(steps).toBe(1)
            expect("" + err).toBe("Error: FLOW_CANCELLED")
            done()
        }
    )
    debugger
    promise.cancel()
})

test("flows can be cancelled - 2 - finally clauses are run", done => {
    let steps = 0
    let finallyHandled = false
    const start = flow(function*() {
        steps = 1
        try {
            yield Promise.resolve()
            steps = 2
        } finally {
            expect(steps).toBe(1)
            finallyHandled = true
        }
    })
    const promise = start()
    promise.then(
        res => {
            fail()
        },
        err => {
            expect("" + err).toBe("Error: FLOW_CANCELLED")
            expect(finallyHandled).toBeTruthy()
            done()
        }
    )
    promise.cancel()
})

test("flows can be cancelled - 3 - throw in finally should be catched", done => {
    const counter = mobx.observable({ counter: 0 })
    const d = mobx.reaction(() => counter.counter, () => {})
    mobx.configure({ enforceActions: true })

    const start = flow(function*() {
        counter.counter = 1
        try {
            yield Promise.resolve()
            counter.counter = 15
        } finally {
            counter.counter = 4
            throw "OOPS"
        }
    })

    const promise = start()
    promise.then(
        () => fail("flow should not have failed"),
        err => {
            expect("" + err).toBe("OOPS")
            expect(counter.counter).toBe(4)
            mobx.configure({ enforceActions: false })
            d()
            done()
        }
    )
    promise.cancel()
})

test("flows can be cancelled - 4 - pending Promise will be ignored", done => {
    let steps = 0
    const start = flow(function*() {
        steps = 1
        yield Promise.reject("This won't be catched anywhere!") // cancel will resolve this flow before this one is throw, so this promise goes uncatched
        steps = 2
    })

    const promise = start()
    promise.then(
        () => fail(),
        err => {
            expect(steps).toBe(1)
            expect("" + err).toBe("Error: FLOW_CANCELLED")
            done()
        }
    )
    promise.cancel()
})

test("flows can be cancelled - 5 - return before cancel", done => {
    let steps = 0
    const start = flow(function*() {
        steps = 1
        return Promise.resolve(2) // cancel will be to late..
    })

    const promise = start()
    promise.then(
        value => {
            expect(value).toBe(2), done()
        },
        err => {
            fail()
        }
    )
    promise.cancel() // no-op
})

test("flows can be cancelled - 5 - flows cancel recursively", done => {
    let flow1cancelled = false
    let flow2cancelled = false
    let stepsReached = 0

    const flow1 = flow(function*() {
        try {
            yield Promise.resolve()
            stepsReached++
        } finally {
            flow1cancelled = true
        }
    })

    const flow2 = flow(function*() {
        try {
            yield flow1()
            stepsReached++
        } finally {
            flow2cancelled = true
        }
    })

    const p = flow2()
    p.then(
        () => fail(),
        err => {
            expect("" + err).toBe("Error: FLOW_CANCELLED")
            expect(stepsReached).toBe(0)
            expect(flow2cancelled).toBeTruthy()
            expect(flow1cancelled).toBeTruthy()
            done()
        }
    )
    p.cancel()
})

test("flows yield anything", async () => {
    let steps = 0
    const start = flow(function*() {
        const x = yield 2
        return x
    })

    const res = await start()
    expect(res).toBe(2)
})
