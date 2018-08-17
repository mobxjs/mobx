var m = require("../../src/mobx.ts")

test("autorun passes Reaction as an argument to view function", function() {
    var a = m.observable.box(1)
    var values = []

    m.autorun(r => {
        expect(typeof r.dispose).toBe("function")
        if (a.get() === "pleaseDispose") r.dispose()
        values.push(a.get())
    })

    a.set(2)
    a.set(2)
    a.set("pleaseDispose")
    a.set(3)
    a.set(4)

    expect(values).toEqual([1, 2, "pleaseDispose"])
})

test("autorun can be disposed on first run", function() {
    var a = m.observable.box(1)
    var values = []

    m.autorun(r => {
        r.dispose()
        values.push(a.get())
    })

    a.set(2)

    expect(values).toEqual([1])
})

test("autorun warns when passed an action", function() {
    var action = m.action(() => {})
    expect.assertions(1)
    expect(() => m.autorun(action)).toThrowError(/Autorun does not accept actions/)
})

test("autorun batches automatically", function() {
    var runs = 0
    var a1runs = 0
    var a2runs = 0

    var x = m.observable({
        a: 1,
        b: 1,
        c: 1,
        get d() {
            runs++
            return this.c + this.b
        }
    })

    var d1 = m.autorun(() => {
        a1runs++
        x.d // read
    })

    var d2 = m.autorun(() => {
        a2runs++
        x.b = x.a
        x.c = x.a
    })

    expect(a1runs).toBe(1)
    expect(a2runs).toBe(1)
    expect(runs).toBe(1)

    x.a = 17

    expect(a1runs).toBe(2)
    expect(a2runs).toBe(2)
    expect(runs).toBe(2)

    d1()
    d2()
})

test("autorun tracks invalidation of unbound dependencies", function() {
    var a = m.observable.box(0)
    var b = m.observable.box(0)
    var c = m.computed(() => a.get() + b.get())
    var values = []

    m.autorun(() => {
        values.push(c.get())
        b.set(100)
    })

    a.set(1)
    expect(values).toEqual([0, 100, 101])
})

test("when effect is an action", function(done) {
    var a = m.observable.box(0)

    m.configure({ enforceActions: true })
    m.when(
        () => a.get() === 1,
        () => {
            a.set(2)

            m.configure({ enforceActions: false })
            done()
        },
        { timeout: 1 }
    )

    m.runInAction(() => {
        a.set(1)
    })
})

test("Don't log promises as errors", function (done) {
    var a = m.observable.box(false)
    var p = Promise.resolve()
    
    m.autorun(() => {
        if (!a.get()) throw p
        done()
    })

    m.runInAction(() => {
        a.set(true)
    })
})
