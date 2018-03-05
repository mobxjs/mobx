var mobx = require("../../src/mobx.ts")

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
