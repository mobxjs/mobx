import * as mobx from "../../src/mobx.ts"
import { asyncAction } from "../../src/mobx"

function delay(time, value, shouldThrow = false) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (shouldThrow) reject(value)
            else resolve(value)
        }, time)
    })
}

test("it should support async actions", done => {
    mobx.configure({ enforceActions: "observed" })
    const values = []
    const x = mobx.observable({ a: 1 })
    mobx.reaction(() => x.a, v => values.push(v), { fireImmediately: true })

    const f = asyncAction(async function(_, initial) {
        x.a = initial // this runs in action
        x.a = await _(delay(100, 3))
        await _(delay(100, 0))
        x.a = 4
        return x.a
    })

    setTimeout(() => {
        f(2).then(v => {
            expect(v).toBe(4)
            expect(values).toEqual([1, 2, 3, 4])
            done()
        })
    }, 10)
})

test("it should support try catch in async", done => {
    mobx.configure({ enforceActions: "observed" })
    const values = []
    const x = mobx.observable({ a: 1 })
    mobx.reaction(() => x.a, v => values.push(v), { fireImmediately: true })

    const f = asyncAction(async function(_, initial) {
        x.a = initial // this runs in action
        try {
            x.a = await _(delay(100, 5, true))
            await _(delay(100, 0))
            x.a = 4
        } catch (e) {
            x.a = e
        }
        return x.a
    })

    setTimeout(() => {
        f(2).then(v => {
            expect(v).toBe(5)
            expect(values).toEqual(values, [1, 2, 5])
            done()
        })
    }, 10)
})

test("it should support throw from async actions", done => {
    asyncAction(async function(_) {
        await await _(delay(10, 7))
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

test("it should support throw from awaited promise", done => {
    asyncAction(async function(_) {
        return await _(delay(10, 7, true))
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

test("it should support async action in classes", done => {
    const values = []

    mobx.configure({ enforceActions: "observed" })

    class X {
        a = 1

        f = asyncAction(async function(_, initial) {
            this.a = initial // this runs in action
            try {
                this.a = await _(delay(100, 5, true))
                await _(delay(100, 0))
                this.a = 4
            } catch (e) {
                this.a = e
            }
            return this.a
        })
    }
    mobx.decorate(X, {
        a: mobx.observable
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
    mobx.configure({ enforceActions: "observed" })
    const events = []
    const x = mobx.observable({ a: 1 })

    const f = asyncAction(async function myaction(_, initial) {
        x.a = initial
        x.a = await _(delay(100, 5))
        x.a = 4
        x.a = await _(delay(100, 3))
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

test("it should support async actions within async actions", done => {
    mobx.configure({ enforceActions: "observed" })
    const values = []
    const x = mobx.observable({ a: 1 })
    mobx.reaction(() => x.a, v => values.push(v), { fireImmediately: true })

    const innferF = asyncAction(async function(_, initial) {
        x.a = initial // this runs in action
        x.a = await _(delay(100, 3))
        await _(delay(100, 0))
        x.a = 4
        return x.a
    })

    const f = asyncAction(async function(_, initial) {
        x.a = await _(innferF(initial))
        x.a = await _(delay(100, 5))
        await _(delay(100, 0))
        x.a = 6
        return x.a
    })

    setTimeout(() => {
        f(2).then(v => {
            expect(v).toBe(6)
            expect(values).toEqual([1, 2, 3, 4, 5, 6])
            done()
        })
    }, 10)
})

test("it should support async actions within async actions that throw", done => {
    mobx.configure({ enforceActions: "observed" })
    const values = []
    const x = mobx.observable({ a: 1 })
    mobx.reaction(() => x.a, v => values.push(v), { fireImmediately: true })

    const innferF = asyncAction(async function(_, initial) {
        x.a = initial // this runs in action
        x.a = await _(delay(100, 3))
        await _(delay(100, 0))
        x.a = 4
        throw "err"
    })

    const f = asyncAction(async function(_, initial) {
        x.a = await _(innferF(initial))
        x.a = await _(delay(100, 5))
        await _(delay(100, 0))
        x.a = 6
        return x.a
    })

    setTimeout(() => {
        f(2).then(
            () => {
                done.fail("should fail")
            },
            e => {
                expect(e).toBe("err")
                done()
            }
        )
    }, 10)
})
