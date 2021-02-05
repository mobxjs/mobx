const { isAction, isObservable, isObservableProp } = require("../../../src/mobx")
const mobx = require("../../../src/mobx.ts")
const m = mobx
const o = mobx.observable
const { makeObservable } = mobx

function buffer() {
    const b = []
    const res = function (x) {
        b.push(x)
    }
    res.toArray = function () {
        return b
    }
    return res
}

test("isObservable", function () {
    function Order() {}

    function ReactiveOrder(price) {
        m.extendObservable(this, {
            price: price
        })
    }
    expect(m.isObservable(null)).toBe(false)
    expect(m.isObservable(null)).toBe(false)

    expect(m.isObservable(m.observable([]))).toBe(true)
    expect(m.isObservable(m.observable({}))).toBe(true)
    expect(m.isObservable(m.observable.box(function () {}))).toBe(true)
    expect(m.isObservable(m.computed(function () {}))).toBe(true)

    expect(m.isObservable([])).toBe(false)
    expect(m.isObservable({})).toBe(false)
    expect(m.isObservable(function () {})).toBe(false)

    expect(m.isObservable(new Order())).toBe(false)
    expect(m.isObservable(m.observable.box(new Order()))).toBe(true)

    expect(m.isObservable(new ReactiveOrder())).toBe(true)
    expect(m.isObservable(m.observable.box(3))).toBe(true)

    const obj = {}
    expect(m.isObservable(obj)).toBe(false)

    expect(m.isObservable(m.observable.box(function () {}))).toBe(true)
    expect(m.isObservable(m.autorun(function () {}))).toBe(true)

    expect(m.isObservableProp(m.observable({ a: 1 }), "a")).toBe(true)
    expect(m.isObservableProp(m.observable({ a: 1 }), "b")).toBe(false)

    expect(m.isObservable(m.observable.map())).toBe(true)

    const base = { a: 3 }
    const obs = m.observable(base)
    expect(m.isObservable(base)).toBe(false)
    expect(m.isObservableProp(base, "a")).toBe(false)
    expect(m.isObservable(obs)).toBe(true)
    expect(m.isObservableProp(obs, "a")).toBe(true)
})

test("isBoxedObservable", function () {
    expect(m.isBoxedObservable(m.observable({}))).toBe(false)
    expect(m.isBoxedObservable(m.computed(() => 3))).toBe(false)
    expect(m.isBoxedObservable(m.observable.box(3))).toBe(true)
    expect(m.isBoxedObservable(m.observable.box(3))).toBe(true)
    expect(m.isBoxedObservable(m.observable.box({}))).toBe(true)
    expect(m.isBoxedObservable(m.observable.box({}, { deep: false }))).toBe(true)
})

test("observable1", function () {
    m._resetGlobalState()

    // recursive structure
    const x = m.observable({
        a: {
            b: {
                c: 3
            }
        }
    })
    const b = buffer()
    m.autorun(function () {
        b(x.a.b.c)
    })
    x.a = { b: { c: 4 } }
    x.a.b.c = 5 // new structure was reactive as well
    expect(b.toArray()).toEqual([3, 4, 5])

    // recursive structure, but asReference passed in
    expect(m.isObservable(x.a.b)).toBe(true)
    const x2 = m.observable.object(
        {
            a: {
                b: {
                    c: 3
                }
            }
        },
        {
            a: m.observable.ref
        }
    )

    expect(m.isObservable(x2)).toBe(true)
    expect(m.isObservable(x2.a)).toBe(false)
    expect(m.isObservable(x2.a.b)).toBe(false)

    const b2 = buffer()
    m.autorun(function () {
        b2(x2.a.b.c)
    })
    x2.a = { b: { c: 4 } }
    x2.a.b.c = 5 // not picked up, not reactive, since passed as reference
    expect(b2.toArray()).toEqual([3, 4])

    // non recursive structure
    const x3 = o.object(
        {
            a: {
                b: {
                    c: 3
                }
            }
        },
        {},
        { deep: false }
    )
    const b3 = buffer()
    m.autorun(function () {
        b3(x3.a.b.c)
    })
    x3.a = { b: { c: 4 } }
    x3.a.b.c = 5 // sub structure not reactive
    expect(b3.toArray()).toEqual([3, 4])
})

test("observable3", function () {
    function Order(price) {
        this.price = price
    }

    const x = m.observable({
        orders: [new Order(1), new Order(2)]
    })

    const b = buffer()
    m.autorun(function () {
        b(x.orders.length)
    })

    expect(m.isObservable(x.orders)).toBe(true)
    expect(m.isObservable(x.orders[0])).toBe(false)
    x.orders[2] = new Order(3)
    x.orders = []
    expect(m.isObservable(x.orders)).toBe(true)
    x.orders[0] = new Order(2)
    expect(b.toArray()).toEqual([2, 3, 0, 1])
})

test("observable4", function () {
    const x = m.observable([{ x: 1 }, { x: 2 }])

    const b = buffer()
    m.observe(
        m.computed(function () {
            return x.map(function (d) {
                return d.x
            })
        }),
        x => b(x.newValue),
        true
    )

    x[0].x = 3
    x.shift()
    x.push({ x: 5 })
    expect(b.toArray()).toEqual([[1, 2], [3, 2], [2], [2, 5]])

    // non recursive
    const x2 = o.array([{ x: 1 }, { x: 2 }], { deep: false })

    const b2 = buffer()
    m.observe(
        m.computed(function () {
            return x2.map(function (d) {
                return d.x
            })
        }),
        x => b2(x.newValue),
        true
    )

    x2[0].x = 3
    x2.shift()
    x2.push({ x: 5 })
    expect(b2.toArray()).toEqual([[1, 2], [2], [2, 5]])
})

test("observable5", function () {
    let x = m.computed(function () {})
    expect(function () {
        x.set(7) // set not allowed
    }).toThrow(/It is not possible to assign a new value to a computed value/)

    let f = m._autoAction(function () {})
    const x2 = m.observable.box(f)
    expect(x2.get()).toBe(f)
    x2.set(null) // allowed

    f = function () {
        return this.price
    }
    x = m.observable(
        {
            price: 17,
            get reactive() {
                return this.price
            },
            nonReactive: f
        },
        {
            nonReactive: false
        }
    )

    const b = buffer()
    m.autorun(function () {
        b([x.reactive, x.nonReactive, x.nonReactive()])
    })

    x.price = 18
    const three = function () {
        return 3
    }
    // 20.12.2020 @urugator:
    // Since https://github.com/mobxjs/mobx/pull/2641
    // the non-observable field won't become suddenly observable on assigment.
    // Firstly it doesn't make sense,
    // secondly it's inconsistent - it works like this only for proxies/object api.
    x.nonReactive = three
    expect(b.toArray()).toEqual([
        [17, f, 17],
        [18, f, 18]
        //[18, three, 3]
    ])
})

test("flat array", function () {
    const x = m.observable.object(
        {
            x: [
                {
                    a: 1
                }
            ]
        },
        { x: m.observable.shallow }
    )

    let result
    let updates = 0
    m.autorun(function () {
        updates++
        result = JSON.stringify(mobx.toJS(x))
    })

    expect(result).toEqual(JSON.stringify({ x: [{ a: 1 }] }))
    expect(updates).toBe(1)

    x.x[0].a = 2 // not picked up; object is not made reactive
    expect(result).toEqual(JSON.stringify({ x: [{ a: 1 }] }))
    expect(updates).toBe(1)

    x.x.push({ a: 3 }) // picked up, array is reactive
    expect(result).toEqual(JSON.stringify({ x: [{ a: 2 }, { a: 3 }] }))
    expect(updates).toBe(2)

    x.x[0] = { a: 4 } // picked up, array is reactive
    expect(result).toEqual(JSON.stringify({ x: [{ a: 4 }, { a: 3 }] }))
    expect(updates).toBe(3)

    x.x[1].a = 6 // not picked up
    expect(result).toEqual(JSON.stringify({ x: [{ a: 4 }, { a: 3 }] }))
    expect(updates).toBe(3)
})

test("flat object", function () {
    const y = m.observable.object(
        {
            x: { z: 3 }
        },
        {},
        { deep: false }
    )

    let result
    let updates = 0
    m.autorun(function () {
        updates++
        result = JSON.stringify(mobx.toJS(y))
    })

    expect(result).toEqual(JSON.stringify({ x: { z: 3 } }))
    expect(updates).toBe(1)

    y.x.z = 4 // not picked up
    expect(result).toEqual(JSON.stringify({ x: { z: 3 } }))
    expect(updates).toBe(1)

    y.x = { z: 5 }
    expect(result).toEqual(JSON.stringify({ x: { z: 5 } }))
    expect(updates).toBe(2)

    y.x.z = 6 // not picked up
    expect(result).toEqual(JSON.stringify({ x: { z: 5 } }))
    expect(updates).toBe(2)
})

test("as structure", function () {
    const x = m.observable.object(
        {
            x: null
        },
        {
            x: m.observable.struct
        }
    )

    let changed = 0
    const dis = m.autorun(function () {
        changed++
        JSON.stringify(x)
    })

    function c() {
        expect(changed).toBe(1)
        if (changed !== 1) console.trace()
        changed = 0
    }

    function nc() {
        expect(changed).toBe(0)
        if (changed !== 0) console.trace()
        changed = 0
    }

    // nc = no change, c = changed.
    c()
    x.x = null
    nc()
    x.x = undefined
    c()
    x.x = 3
    c()
    x.x = 1 * x.x
    nc()
    x.x = "3"
    c()

    x.x = {
        y: 3
    }
    c()
    x.x.y = 3
    nc()
    x.x = {
        y: 3
    }
    nc()
    x.x = {
        y: 4
    }
    c()
    x.x = {
        y: 3
    }
    c()
    x.x = {
        y: {
            y: 3
        }
    }
    c()
    x.x.y.y = 3
    nc()
    x.x.y = { y: 3 }
    nc()
    x.x = { y: { y: 3 } }
    nc()
    x.x = { y: { y: 4 } }
    c()
    x.x = {}
    c()
    x.x = {}
    nc()

    x.x = []
    c()
    x.x = []
    nc()
    x.x = [3, 2, 1]
    c()
    x.x.sort()
    nc()
    x.x.sort()
    nc()
    x.x[1] = 2
    nc()
    x.x[0] = 0
    nc() // not detected

    dis()
})

test("as structure view", function () {
    const x = m.observable.object(
        {
            a: 1,
            aa: 1,
            get b() {
                this.a
                return { a: this.aa }
            },
            get c() {
                this.b
                return { a: this.aa }
            }
        },
        {
            c: m.computed({ compareStructural: true })
        }
    )

    let bc = 0
    m.autorun(function () {
        x.b
        bc++
    })
    expect(bc).toBe(1)

    let cc = 0
    m.autorun(function () {
        x.c
        cc++
    })
    expect(cc).toBe(1)

    x.a = 2
    x.a = 3
    expect(bc).toBe(3)
    expect(cc).toBe(1)
    x.aa = 3
    expect(bc).toBe(4)
    expect(cc).toBe(2)
})

test("540 - extendobservable should not report cycles", function () {
    expect(() => m.extendObservable(Object.freeze({}), {})).toThrowError(
        /Cannot make the designated object observable/
    )

    const objWrapper = mobx.observable({
        value: null
    })

    const obj = {
        name: "Hello"
    }

    objWrapper.value = obj
    expect(mobx.isObservable(objWrapper.value)).toBeTruthy()
    expect(() => {
        mobx.extendObservable(objWrapper, objWrapper.value)
    }).toThrowError(/Extending an object with another observable \(object\) is not supported/)
})

test("mobx 3", () => {
    const x = mobx.observable({ a: 1 })

    expect(x === mobx.observable(x)).toBeTruthy()

    const y = mobx.observable.box(null, { deep: false })
    const obj = { a: 2 }
    y.set(obj)
    expect(y.get() === obj).toBeTruthy()
    expect(mobx.isObservable(y.get())).toBe(false)
})

test("computed value", () => {
    mobx._getGlobalState().mobxGuid = 0
    const c = mobx.computed(() => 3)

    expect(0 + c).toBe(3)
    expect(mobx.isComputed(c)).toBe(true)
    expect(c.toString()).toMatchSnapshot()
})

test("boxed value json", () => {
    const a = mobx.observable.box({ x: 1 })
    expect(a.get().x).toEqual(1)
    a.set(3)
    expect(a.get()).toEqual(3)
    expect("" + a).toBe("3")
    expect(a.toJSON()).toBe(3)
})

test("computed value scope", () => {
    const a = mobx.observable({
        x: 1,
        get y() {
            return this.x * 2
        },
        set y(v) {
            this.x = v
        }
    })

    expect(a.y).toBe(2)
    a.x = 2
    expect(a.y).toBe(4)
    a.y = 3
    expect(a.y).toBe(6)
})

test("shallow array", () => {
    const a = mobx.observable.array([], { deep: false })
    a.push({ x: 1 }, [], 2, mobx.observable({ y: 3 }))

    expect(mobx.isObservable(a)).toBe(true)
    expect(mobx.isObservable(a[0])).toBe(false)
    expect(mobx.isObservable(a[1])).toBe(false)
    expect(mobx.isObservable(a[2])).toBe(false)
    expect(mobx.isObservable(a[3])).toBe(true)
})

test("761 - deeply nested modifiers work", () => {
    const a = {}
    mobx.extendObservable(a, {
        someKey: mobx.observable.object(
            {
                someNestedKey: []
            },
            {
                someNestedKey: mobx.observable.ref
            }
        )
    })

    expect(mobx.isObservable(a)).toBe(true)
    expect(mobx.isObservableProp(a, "someKey")).toBe(true)
    expect(mobx.isObservable(a.someKey)).toBe(true)
    expect(mobx.isObservableProp(a.someKey, "someNestedKey")).toBe(true)
    expect(mobx.isObservable(a.someKey.someNestedKey)).toBe(false)
    expect(Array.isArray(a.someKey.someNestedKey)).toBe(true)

    Object.assign(a, { someKey: { someNestedKey: [1, 2, 3] } })
    expect(mobx.isObservable(a)).toBe(true)
    expect(mobx.isObservableProp(a, "someKey")).toBe(true)
    expect(mobx.isObservable(a.someKey)).toBe(true)
    expect(mobx.isObservableProp(a.someKey, "someNestedKey")).toBe(true)
    expect(mobx.isObservable(a.someKey.someNestedKey)).toBe(true) // Too bad: no deep merge with Object.assign! someKey object gets replaced in its entirity
    expect(Array.isArray(a.someKey.someNestedKey)).toBe(true)
})

test("compare structurally, ref", () => {
    const a = mobx.observable.object(
        {
            x: undefined
        },
        {
            x: mobx.observable.struct
        }
    )

    let changed = 0
    const d = mobx.autorun(() => {
        mobx.toJS(a)
        changed++
    })

    expect(changed).toBe(1)
    a.x = { y: 2 }
    expect(changed).toBe(2)
    a.x.y = 3
    expect(mobx.isObservable(a.x)).toBe(false)
    expect(changed).toBe(2)

    a.x = { y: 3 }
    expect(changed).toBe(2)

    a.x = { y: 4 }
    expect(changed).toBe(3)
    a.x = { y: 4 }
    expect(changed).toBe(3)

    d()
})

test("double declare property", () => {
    const o = {}
    mobx.extendObservable(o, {
        a: 5
    })
    expect(() => {
        mobx.extendObservable(
            o,
            { a: 2 },
            {
                a: mobx.observable.ref
            }
        )
    }).toThrow(/The field is already annotated/)
})

test("structural collections", () => {
    const o = mobx.observable(
        {
            x: [1, 2, 3]
        },
        {
            x: mobx.observable.struct
        }
    )

    expect(mobx.isObservable(o.x)).toBeFalsy()
    const x = o.x
    o.x = [1, 2, 3]
    expect(o.x).toBe(x)
    expect(() => {
        o.x = mobx.observable([1, 2, 3])
    }).toThrow("observable.struct should not be used with observable values")
})

test("jest is behaving correctly", () => {
    const symbol = Symbol("test")
    const a = []
    const b = []
    const c = []
    a[symbol] = 1
    b[symbol] = 1
    c[symbol] = 2
    expect(a).toEqual(b)
    expect(a).not.toEqual(c)
})

test("All non-enumerables should be treated equally!", () => {
    const actual1 = {
        x: 3
    }
    Object.defineProperty(actual1, "test", {
        enumerable: false,
        value: 5
    })

    const actual2 = {
        x: 3
    }
    const mySymbol = Symbol("test")
    Object.defineProperty(actual2, mySymbol, {
        enumerable: false,
        value: 5
    })

    expect(actual1).toEqual({ x: 3 })
    expect(actual2).toEqual({ x: 3 })
})

test("jest object equals issue - reference", () => {
    class Store {
        constructor() {
            mobx.extendObservable(this, { x: 3 })
        }
    }

    const store = new Store()
    expect(store).toEqual(new Store())
})

test("jest object equals issue", () => {
    class Store {
        x = 2

        constructor() {
            makeObservable(this, {
                x: mobx.observable
            })

            this.x = 3
        }
    }

    const store = new Store()
    expect(store).toEqual(new Store())
})

test("jest array equals issue", () => {
    class Store {
        things = []

        constructor() {
            makeObservable(this, {
                things: mobx.observable
            })
        }
    }

    const store = new Store()
    expect(store.things).toEqual([])
})

test("#1650, toString is not treated correctly", () => {
    const o = { a: "a", toString: "toString" }
    const oo = mobx.observable(o)
    expect(oo.toString).toBe("toString")
})
