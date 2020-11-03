const m = require("../../../src/mobx.ts")
const intercept = m.intercept

test("intercept observable value", () => {
    const a = m.observable.box(1)

    let d = intercept(a, () => {
        return null
    })

    a.set(2)

    expect(a.get()).toBe(1)

    d()

    a.set(3)
    expect(a.get()).toBe(3)

    d = intercept(a, c => {
        expect(c.object).toBe(a)
        if (c.newValue % 2 === 0) {
            throw "value should be odd!"
        }
        return c
    })

    expect(() => {
        a.set(4)
    }).toThrow(/value should be odd/)

    expect(a.get()).toBe(3)
    a.set(5)
    expect(a.get()).toBe(5)

    d()
    d = intercept(a, c => {
        expect(c.object).toBe(a)
        c.newValue *= 2
        return c
    })

    a.set(6)
    expect(a.get()).toBe(12)

    intercept(a, c => {
        expect(c.object).toBe(a)
        c.newValue += 1
        return c
    })

    a.set(7)
    expect(a.get()).toBe(15)

    d()
    a.set(8)
    expect(a.get()).toBe(9)
})

test("intercept array", () => {
    const a = m.observable([1, 2])

    let d = m.intercept(a, () => null)
    a.push(2)
    expect(a.slice()).toEqual([1, 2])

    d()

    d = intercept(a, c => {
        expect(c.object).toBe(a)
        if (c.type === "splice") {
            c.added.push(c.added[0] * 2)
            c.removedCount = 1
            return c
        } else if (c.type === "update") {
            c.newValue = c.newValue * 3
            return c
        }
    })

    a.unshift(3, 4)

    expect(a.slice()).toEqual([3, 4, 6, 2])
    a[2] = 5
    expect(a.slice()).toEqual([3, 4, 15, 2])
})

test("intercept object", () => {
    const a = m.observable({
        b: 3
    })

    intercept(a, change => {
        expect(change.object).toBe(a)
        change.newValue *= 3
        return change
    })

    a.b = 4

    expect(a.b).toBe(12)

    intercept(a, "b", change => {
        change.newValue += 1
        return change
    })

    a.b = 5
    expect(a.b).toBe(16)

    const d3 = intercept(a, c => {
        expect(c.name).toBe("b")
        expect(c.object).toBe(a)
        expect(c.type).toBe("update")
        return null
    })

    a.b = 7
    expect(a.b).toBe(16)

    d3()
    a.b = 7
    expect(a.b).toBe(22)
})

test("intercept property additions", () => {
    const a = m.observable({})
    const d4 = intercept(a, change => {
        expect(change.object).toBe(a)
        if (change.type === "add") {
            return null
        }
        return change
    })

    m.extendObservable(a, { c: 1 }) // not added!
    expect(a.c).toBe(undefined)
    expect(m.isObservableProp(a, "c")).toBe(false)

    d4()

    m.extendObservable(a, { c: 2 })
    expect(a.c).toBe(2)
    expect(m.isObservableProp(a, "c")).toBe(true)
})

test("intercept map", () => {
    const a = m.observable.map({
        b: 3
    })

    intercept(a, c => {
        expect(c.object).toBe(a)
        c.newValue *= 3
        return c
    })

    a.set("b", 4)

    expect(a.get("b")).toBe(12)

    intercept(a, "b", c => {
        c.newValue += 1
        return c
    })

    a.set("b", 5)
    expect(a.get("b")).toBe(16)

    const d3 = intercept(a, c => {
        expect(c.object).toBe(a)
        expect(c.name).toBe("b"), expect(c.object).toBe(a)
        expect(c.type).toBe("update")
        return null
    })

    a.set("b", 7)
    expect(a.get("b")).toBe(16)

    d3()
    a.set("b", 7)
    expect(a.get("b")).toBe(22)

    const d4 = intercept(a, c => {
        expect(c.object).toBe(a)
        if (c.type === "delete") return null
        return c
    })

    a.delete("b")
    expect(a.has("b")).toBe(true)
    expect(a.get("b")).toBe(22)

    d4()
    a.delete("b")
    expect(a.has("b")).toBe(false)
    expect(a.get("c")).toBe(undefined)
})

test("intercept prevent dispose from breaking current execution", () => {
    const a = m.observable.box(1)

    intercept(a, c => {
        c.newValue += 1
        return c
    })

    const d = intercept(a, c => {
        d()
        expect(c.object).toBe(a)
        c.newValue *= 2
        return c
    })

    intercept(a, c => {
        c.newValue += 1
        return c
    })

    a.set(2)

    expect(a.get()).toBe(7)

    a.set(2)

    expect(a.get()).toBe(4)
})
