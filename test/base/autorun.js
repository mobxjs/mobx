const m = require("../../src/mobx.ts")

test("autorun passes Reaction as an argument to view function", function() {
    const a = m.observable.box(1)
    const values = []

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
    const a = m.observable.box(1)
    const values = []

    m.autorun(r => {
        r.dispose()
        values.push(a.get())
    })

    a.set(2)

    expect(values).toEqual([1])
})

test("autorun warns when passed an action", function() {
    const action = m.action(() => {})
    expect.assertions(1)
    expect(() => m.autorun(action)).toThrowError(/Autorun does not accept actions/)
})

test("autorun batches automatically", function() {
    let runs = 0
    let a1runs = 0
    let a2runs = 0

    const x = m.observable({
        a: 1,
        b: 1,
        c: 1,
        get d() {
            runs++
            return this.c + this.b
        }
    })

    const d1 = m.autorun(() => {
        a1runs++
        x.d // read
    })

    const d2 = m.autorun(() => {
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
    const a = m.observable.box(0)
    const b = m.observable.box(0)
    const c = m.computed(() => a.get() + b.get())
    const values = []

    m.autorun(() => {
        values.push(c.get())
        b.set(100)
    })

    a.set(1)
    expect(values).toEqual([0, 100, 101])
})

test("when effect is an action", function(done) {
    const a = m.observable.box(0)

    m.configure({ enforceActions: "observed" })
    m.when(
        () => a.get() === 1,
        () => {
            a.set(2)

            m.configure({ enforceActions: "never" })
            done()
        },
        { timeout: 1 }
    )

    m.runInAction(() => {
        a.set(1)
    })
})
