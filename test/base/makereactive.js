var mobx = require("../../src/mobx.ts")
var m = mobx
var o = mobx.observable

var value = mobx.value
var voidObserver = function() {}

function buffer() {
    var b = []
    var res = function(x) {
        b.push(x)
    }
    res.toArray = function() {
        return b
    }
    return res
}

test("isObservable", function() {
    function Order(price) {}

    function ReactiveOrder(price) {
        m.extendObservable(this, {
            price: price
        })
    }
    expect(m.isObservable(null)).toBe(false)
    expect(m.isObservable(null)).toBe(false)

    expect(m.isObservable(m.observable([]))).toBe(true)
    expect(m.isObservable(m.observable({}))).toBe(true)
    expect(m.isObservable(m.observable.box(function() {}))).toBe(true)
    expect(m.isObservable(m.computed(function() {}))).toBe(true)

    expect(m.isObservable([])).toBe(false)
    expect(m.isObservable({})).toBe(false)
    expect(m.isObservable(function() {})).toBe(false)

    expect(m.isObservable(new Order())).toBe(false)
    expect(m.isObservable(m.observable.box(new Order()))).toBe(true)

    expect(m.isObservable(new ReactiveOrder())).toBe(true)
    expect(m.isObservable(m.observable.box(3))).toBe(true)

    var obj = {}
    expect(m.isObservable(obj)).toBe(false)

    expect(m.isObservable(m.observable.box(function() {}))).toBe(true)
    expect(m.isObservable(m.autorun(function() {}))).toBe(true)

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

test("isBoxedObservable", function() {
    expect(m.isBoxedObservable(m.observable({}))).toBe(false)
    expect(m.isBoxedObservable(m.computed(() => 3))).toBe(false)
    expect(m.isBoxedObservable(m.observable.box(3))).toBe(true)
    expect(m.isBoxedObservable(m.observable.box(3))).toBe(true)
    expect(m.isBoxedObservable(m.observable.box({}))).toBe(true)
    expect(m.isBoxedObservable(m.observable.shallowBox({}))).toBe(true)
})

test("observable1", function() {
    m._resetGlobalState()

    // recursive structure
    var x = m.observable({
        a: {
            b: {
                c: 3
            }
        }
    })
    var b = buffer()
    m.autorun(function() {
        b(x.a.b.c)
    })
    x.a = { b: { c: 4 } }
    x.a.b.c = 5 // new structure was reactive as well
    expect(b.toArray()).toEqual([3, 4, 5])

    // recursive structure, but asReference passed in
    expect(m.isObservable(x.a.b)).toBe(true)
    var x2 = m.observable.object(
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

    var b2 = buffer()
    m.autorun(function() {
        b2(x2.a.b.c)
    })
    x2.a = { b: { c: 4 } }
    x2.a.b.c = 5 // not picked up, not reactive, since passed as reference
    expect(b2.toArray()).toEqual([3, 4])

    // non recursive structure
    var x3 = o.shallowObject({
        a: {
            b: {
                c: 3
            }
        }
    })
    var b3 = buffer()
    m.autorun(function() {
        b3(x3.a.b.c)
    })
    x3.a = { b: { c: 4 } }
    x3.a.b.c = 5 // sub structure not reactive
    expect(b3.toArray()).toEqual([3, 4])
})

test("observable3", function() {
    function Order(price) {
        this.price = price
    }

    var x = m.observable({
        orders: [new Order(1), new Order(2)]
    })

    var b = buffer()
    m.autorun(function() {
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

test("observable4", function() {
    var x = m.observable([{ x: 1 }, { x: 2 }])

    var b = buffer()
    m.observe(
        m.computed(function() {
            return x.map(function(d) {
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
    var x2 = o.shallowArray([{ x: 1 }, { x: 2 }])

    var b2 = buffer()
    m.observe(
        m.computed(function() {
            return x2.map(function(d) {
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

test("observable5", function() {
    var x = m.computed(function() {})
    expect(function() {
        x.set(7) // set not allowed
    }).toThrow(/It is not possible to assign a new value to a computed value/)

    var f = function() {}
    var x2 = m.observable.box(f)
    expect(x2.get()).toBe(f)
    x2.set(null) // allowed

    f = function() {
        return this.price
    }
    var x = m.observable({
        price: 17,
        get reactive() {
            return this.price
        },
        nonReactive: f
    })

    var b = buffer()
    m.autorun(function() {
        b([x.reactive, x.nonReactive, x.nonReactive()])
    })

    x.price = 18
    var three = function() {
        return 3
    }
    x.nonReactive = three
    expect(b.toArray()).toEqual([[17, f, 17], [18, f, 18], [18, three, 3]])
})

test("flat array", function() {
    var x = m.observable.object(
        {
            x: [
                {
                    a: 1
                }
            ]
        },
        { x: m.observable.shallow }
    )

    var result
    var updates = 0
    var dis = m.autorun(function() {
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

test("flat object", function() {
    var y = m.observable.shallowObject({
        x: { z: 3 }
    })

    var result
    var updates = 0
    var dis = m.autorun(function() {
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

test.skip("as structure", function() {
    var x = m.observable.object(
        {
            x: null
        },
        {
            x: m.observable.struct
        }
    )

    var changed = 0
    var dis = m.autorun(function() {
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
    c()
    x.x[1] = {
        a: [1, 2]
    }
    c()
    x.x[1].a = [1, 2]
    nc()
    x.x[1].a[1] = 3
    c()
    x.x[1].a[2] = 3
    c()
    x.x = {
        a: [
            {
                b: 3
            }
        ]
    }
    c()
    x.x = {
        a: [
            {
                b: 3
            }
        ]
    }
    nc()
    x.x.a = [{ b: 3 }]
    nc()
    x.x.a[0] = { b: 3 }
    nc()
    x.x.a[0].b = 3
    nc()

    dis()
})

test("as structure view", function() {
    var x = m.observable.object(
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

    var bc = 0
    var bo = m.autorun(function() {
        x.b
        bc++
    })
    expect(bc).toBe(1)

    var cc = 0
    var co = m.autorun(function() {
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

test("ES5 non reactive props", function() {
    var te = m.observable({})
    Object.defineProperty(te, "nonConfigurable", {
        enumerable: true,
        configurable: false,
        writable: true,
        value: "static"
    })
    // should throw if trying to reconfigure an existing non-configurable prop
    expect(function() {
        const a = m.extendObservable(te2, { notConfigurable: 1 })
    }).toThrow(/'extendObservable' expects an object as first argument/)
    // should skip non-configurable / writable props when using `observable`
    expect(() => {
        te = m.set(te, te)
    }).toThrow(
        /Cannot make property 'nonConfigurable' observable, it is not configurable and writable in the target object/
    )
    const d1 = Object.getOwnPropertyDescriptor(te, "nonConfigurable")
    expect(d1.value).toBe("static")

    var te2 = m.observable({})
    Object.defineProperty(te2, "notWritable", {
        enumerable: true,
        configurable: true,
        writable: false,
        value: "static"
    })
    // should throw if trying to reconfigure an existing non-writable prop
    expect(function() {
        const a = m.set(te2, { notWritable: 1 })
    }).toThrow(/Cannot make property 'notWritable' observable/)
    const d2 = Object.getOwnPropertyDescriptor(te2, "notWritable")
    expect(d2.value).toBe("static")

    // should not throw for other props
    expect(m.extendObservable(te, { bla: 3 }).bla).toBe(3)
})

test("ES5 non reactive props - 2", function() {
    var te = {}
    Object.defineProperty(te, "nonConfigurable", {
        enumerable: true,
        configurable: false,
        writable: true,
        value: "static"
    })
    // should skip non-configurable / writable props when using `observable`
    expect(() => {
        m.decorate(te, { nonConfigurable: m.observable })
    }).toThrow(/Cannot redefine property: nonConfigurable/)
})

test("exceptions", function() {
    expect(function() {
        m.observable.ref(m.observable.shallow(3))
    }).toThrow(/This function is a decorator, but it wasn't invoked like a decorator/)
})

test("540 - extendobservable should not report cycles", function() {
    expect(() => m.extendObservable(Object.freeze({}), {})).toThrowError(
        /Cannot make the designated object observable/
    )

    var objWrapper = mobx.observable({
        value: null
    })

    var obj = {
        name: "Hello"
    }

    objWrapper.value = obj
    expect(() => mobx.extendObservable(objWrapper, objWrapper.value)).toThrowError(
        /Extending an object with another observable \(object\) is not supported/
    )
})

test("mobx 3", () => {
    const x = mobx.observable({ a: 1 })

    expect(x === mobx.observable(x)).toBeTruthy()

    const y = mobx.observable.shallowBox(null)
    const obj = { a: 2 }
    y.set(obj)
    expect(y.get() === obj).toBeTruthy()
    expect(mobx.isObservable(y.get())).toBe(false)
})

test("computed value", () => {
    mobx._getGlobalState().mobxGuid = 0
    var c = mobx.computed(() => 3)

    expect(c.toJSON()).toBe(3)
    expect(mobx.isComputed(c)).toBe(true)
    expect(c.toString()).toBe("ComputedValue@2[function () {return 3;}]")
})

test("boxed value json", () => {
    var a = mobx.observable.box({ x: 1 })
    expect(a.get().x).toEqual(1)
    a.set(3)
    expect(a.get()).toEqual(3)
    expect("" + a).toBe("3")
    expect(a.toJSON()).toBe(3)
})

test("computed value scope", () => {
    var a = mobx.observable({
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
    var a = mobx.observable.shallowArray()
    a.push({ x: 1 }, [], 2, mobx.observable({ y: 3 }))

    expect(mobx.isObservable(a)).toBe(true)
    expect(mobx.isObservable(a[0])).toBe(false)
    expect(mobx.isObservable(a[1])).toBe(false)
    expect(mobx.isObservable(a[2])).toBe(false)
    expect(mobx.isObservable(a[3])).toBe(true)
})

test("761 - deeply nested modifiers work", () => {
    var a = {}
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
    expect(Array.isArray(a.someKey.someNestedKey)).toBe(false)
})

test.skip("compare structurally, deep", () => {
    var a = mobx.observable.object(
        {
            x: undefined
        },
        {
            x: mobx.observable.deep.struct
        }
    )

    var changed = 0
    var d = mobx.autorun(() => {
        mobx.toJS(a)
        changed++
    })

    expect(changed).toBe(1)
    a.x = { y: 2 }
    expect(changed).toBe(2)
    a.x.y = 3
    expect(changed).toBe(3)

    a.x = { y: 3 }
    expect(changed).toBe(3)

    a.x.y = { a: 1 }
    expect(changed).toBe(4)
    a.x.y = { a: 1 }
    expect(changed).toBe(4)

    d()
})

test("compare structurally, ref", () => {
    var a = mobx.observable.object(
        {
            x: undefined
        },
        {
            x: mobx.observable.ref.struct
        }
    )

    var changed = 0
    var d = mobx.autorun(() => {
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

    d()
})
