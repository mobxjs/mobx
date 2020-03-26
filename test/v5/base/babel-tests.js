import {
    observable,
    computed,
    transaction,
    autorun,
    extendObservable,
    action,
    isObservableObject,
    observe,
    isObservable,
    isObservableProp,
    isComputedProp,
    spy,
    decorate,
    isAction,
    configure
} from "../../../src/v5/mobx.ts"
import * as mobx from "../../../src/v5/mobx.ts"

test("babel", function() {
    class Box {
        uninitialized = observable()
        height = observable(20)
        sizes = observable([2])
        someFunc = observable(function() {
            return 2
        })

        width = computed(() => {
            return this.height * this.sizes.length * this.someFunc() * (this.uninitialized ? 2 : 1)
        })

        constructor() {
            initializeObservables(this)
        }

        addSize() {
            this.sizes.push(3)
            this.sizes.push(4)
        }
    }

    Box.prototype.addSize = action(Box.prototype.addSize)

    const box = new Box()
    const ar = []
    autorun(() => {
        ar.push(box.width)
    })

    let s = ar.slice()
    expect(s).toEqual([40])
    box.height = 10
    s = ar.slice()
    expect(s).toEqual([40, 20])
    box.sizes.push(3, 4)
    s = ar.slice()
    expect(s).toEqual([40, 20, 60])
    box.someFunc = () => 7
    s = ar.slice()
    expect(s).toEqual([40, 20, 60, 210])
    box.uninitialized = true
    s = ar.slice()
    expect(s).toEqual([40, 20, 60, 210, 420])
    box.addSize()
    s = ar.slice()
    expect(s).toEqual([40, 20, 60, 210, 420, 700])
})

test("should not be possible to use @action with getters", () => {
    expect(() => {
        class A {
            get Test() {}
        }
        A // just to avoid the linter warning
    }).toThrowError(/@action cannot be used with getters/)

    mobx._resetGlobalState()
})

test("babel: parameterized computed decorator", () => {
    class TestClass {
        x = observable(3)
        y = observable(3)

        boxedSum = computed.struct(() => {
            return { sum: Math.round(this.x) + Math.round(this.y) }
        })

        constructor() {
            initializeObservables(this)
        }
    }

    const t1 = new TestClass()
    const changes = []
    const d = autorun(() => changes.push(t1.boxedSum))

    t1.y = 4 // change
    expect(changes.length).toBe(2)
    t1.y = 4.2 // no change
    expect(changes.length).toBe(2)
    transaction(() => {
        t1.y = 3
        t1.x = 4
    }) // no change
    expect(changes.length).toBe(2)
    t1.x = 6 // change
    expect(changes.length).toBe(3)
    d()

    expect(changes).toEqual([{ sum: 6 }, { sum: 7 }, { sum: 9 }])
})

test("computed value should be the same around changing which was considered equivalent", () => {
    class TestClass {
        c = observable(null)
        defaultCollection = []

        collection = computed.struct(() => {
            return this.c || this.defaultCollection
        })

        constructor() {
            initializeObservables(this)
        }
    }

    const t1 = new TestClass()

    const d = autorun(() => t1.collection)

    const oldCollection = t1.collection
    t1.c = []
    const newCollection = t1.collection

    expect(oldCollection).toBe(newCollection)

    d()
})

class Order {
    price = observable(3)
    amount = observable(2)
    orders = observable([])
    aFunction = observable(function() {})

    total = computed(() => {
        return this.amount * this.price * (1 + this.orders.length)
    })

    constructor() {
        initializeObservables(this)
    }
}

test("decorators", function() {
    const o = new Order()
    expect(isObservableObject(o)).toBe(true)
    expect(isObservableProp(o, "amount")).toBe(true)
    expect(o.total).toBe(6) // .... this is required to initialize the props which are made reactive lazily...
    expect(isObservableProp(o, "total")).toBe(true)

    const events = []
    const d1 = observe(o, ev => events.push(ev.name, ev.oldValue))
    const d2 = observe(o, "price", ev => events.push(ev.newValue, ev.oldValue))
    const d3 = observe(o, "total", ev => events.push(ev.newValue, ev.oldValue))

    o.price = 4

    d1()
    d2()
    d3()

    o.price = 5

    expect(events).toEqual([
        8, // new total
        6, // old total
        4, // new price
        3, // old price
        "price", // event name
        3 // event oldValue
    ])
})

test("issue 191 - shared initializers (babel)", function() {
    class Test {
        obj = observable({ a: 1 })
        array = observable([2])

        constructor() {
            initializeObservables(this)
        }
    }

    const t1 = new Test()
    t1.obj.a = 2
    t1.array.push(3)

    const t2 = new Test()
    t2.obj.a = 3
    t2.array.push(4)

    expect(t1.obj).not.toBe(t2.obj)
    expect(t1.array).not.toBe(t2.array)
    expect(t1.obj.a).toBe(2)
    expect(t2.obj.a).toBe(3)

    expect(t1.array.slice()).toEqual([2, 3])
    expect(t2.array.slice()).toEqual([2, 4])
})

test("705 - setter undoing caching (babel)", () => {
    let recomputes = 0
    let autoruns = 0

    class Person {
        name = observable()
        title = observable()

        fullName = computed(
            () => {
                recomputes++
                return this.title + " " + this.name
            },
            val => {
                // Noop
            }
        )

        constructor() {
            initializeObservables(this)
        }
    }

    let p1 = new Person()
    p1.name = "Tom Tank"
    p1.title = "Mr."

    expect(recomputes).toBe(0)
    expect(autoruns).toBe(0)

    const d1 = autorun(() => {
        autoruns++
        p1.fullName
    })

    const d2 = autorun(() => {
        autoruns++
        p1.fullName
    })

    expect(recomputes).toBe(1)
    expect(autoruns).toBe(2)

    p1.title = "Master"
    expect(recomputes).toBe(2)
    expect(autoruns).toBe(4)

    d1()
    d2()
})

function normalizeSpyEvents(events) {
    events.forEach(ev => {
        delete ev.fn
        delete ev.time
    })
    return events
}

test("action decorator (babel)", function() {
    class Store {
        constructor(multiplier) {
            this.multiplier = multiplier
        }

        add(a, b) {
            return (a + b) * this.multiplier
        }
    }

    Store.prototype.add = action(Store.prototype.add)

    const store1 = new Store(2)
    const store2 = new Store(3)
    const events = []
    const d = spy(events.push.bind(events))
    expect(store1.add(3, 4)).toBe(14)
    expect(store2.add(3, 4)).toBe(21)
    expect(store1.add(1, 1)).toBe(4)

    expect(normalizeSpyEvents(events)).toEqual([
        { arguments: [3, 4], name: "add", spyReportStart: true, object: store1, type: "action" },
        { spyReportEnd: true },
        { arguments: [3, 4], name: "add", spyReportStart: true, object: store2, type: "action" },
        { spyReportEnd: true },
        { arguments: [1, 1], name: "add", spyReportStart: true, object: store1, type: "action" },
        { spyReportEnd: true }
    ])

    d()
})

test("custom action decorator (babel)", function() {
    class Store {
        constructor(multiplier) {
            this.multiplier = multiplier
        }

        add(a, b) {
            return (a + b) * this.multiplier
        }
    }

    Store.prototype.add = action("zoem zoem", Store.prototype.add)

    const store1 = new Store(2)
    const store2 = new Store(3)
    const events = []
    const d = spy(events.push.bind(events))
    expect(store1.add(3, 4)).toBe(14)
    expect(store2.add(3, 4)).toBe(21)
    expect(store1.add(1, 1)).toBe(4)

    expect(normalizeSpyEvents(events)).toEqual([
        {
            arguments: [3, 4],
            name: "zoem zoem",
            spyReportStart: true,
            object: store1,
            type: "action"
        },
        { spyReportEnd: true },
        {
            arguments: [3, 4],
            name: "zoem zoem",
            spyReportStart: true,
            object: store2,
            type: "action"
        },
        { spyReportEnd: true },
        {
            arguments: [1, 1],
            name: "zoem zoem",
            spyReportStart: true,
            object: store1,
            type: "action"
        },
        { spyReportEnd: true }
    ])

    d()
})

test("action decorator on field (babel)", function() {
    class Store {
        constructor(multiplier) {
            this.multiplier = multiplier
        }

        add = action((a, b) => {
            return (a + b) * this.multiplier
        })
    }

    const store1 = new Store(2)
    const store2 = new Store(7)

    const events = []
    const d = spy(events.push.bind(events))
    expect(store1.add(3, 4)).toBe(14)
    expect(store2.add(5, 4)).toBe(63)
    expect(store1.add(2, 2)).toBe(8)

    expect(normalizeSpyEvents(events)).toEqual([
        { arguments: [3, 4], name: "add", spyReportStart: true, object: store1, type: "action" },
        { spyReportEnd: true },
        { arguments: [5, 4], name: "add", spyReportStart: true, object: store2, type: "action" },
        { spyReportEnd: true },
        { arguments: [2, 2], name: "add", spyReportStart: true, object: store1, type: "action" },
        { spyReportEnd: true }
    ])

    d()
})

test("custom action decorator on field (babel)", function() {
    class Store {
        constructor(multiplier) {
            this.multiplier = multiplier
        }

        add = action("zoem zoem", (a, b) => {
            return (a + b) * this.multiplier
        })
    }

    const store1 = new Store(2)
    const store2 = new Store(7)

    const events = []
    const d = spy(events.push.bind(events))
    expect(store1.add(3, 4)).toBe(14)
    expect(store2.add(5, 4)).toBe(63)
    expect(store1.add(2, 2)).toBe(8)

    expect(normalizeSpyEvents(events)).toEqual([
        {
            arguments: [3, 4],
            name: "zoem zoem",
            spyReportStart: true,
            object: store1,
            type: "action"
        },
        { spyReportEnd: true },
        {
            arguments: [5, 4],
            name: "zoem zoem",
            spyReportStart: true,
            object: store2,
            type: "action"
        },
        { spyReportEnd: true },
        {
            arguments: [2, 2],
            name: "zoem zoem",
            spyReportStart: true,
            object: store1,
            type: "action"
        },
        { spyReportEnd: true }
    ])

    d()
})

test("267 (babel) should be possible to declare properties observable outside strict mode", () => {
    configure({ enforceActions: "observed" })

    class Store {
        timer = observable()

        constructor() {
            initializeObservables(this)
        }
    }
    Store // just to avoid linter warning

    configure({ enforceActions: "never" })
})

test("288 atom not detected for object property", () => {
    class Store {
        foo = ""
    }

    const store = new Store()
    let changed = false

    mobx.observe(
        store,
        "foo",
        () => {
            changed = true
        },
        true
    )
    expect(changed).toBe(true)
})

test.skip("observable performance", () => {
    const AMOUNT = 100000

    class A {
        a = observable(1)
        b = observable(2)
        c = observable(3)

        d = computed(() => {
            return this.a + this.b + this.c
        })

        constructor() {
            initializeObservables(this)
        }
    }

    const objs = []
    const start = Date.now()

    for (let i = 0; i < AMOUNT; i++) objs.push(new A())

    console.log("created in ", Date.now() - start)

    for (let j = 0; j < 4; j++) {
        for (let i = 0; i < AMOUNT; i++) {
            const obj = objs[i]
            obj.a += 3
            obj.b *= 4
            obj.c = obj.b - obj.a
            obj.d
        }
    }

    console.log("changed in ", Date.now() - start)
})

test("unbound methods", () => {
    class A {
        // shared across all instances
        m1() {}

        // per instance
        m2 = action(() => {})
    }

    A.prototype.m1 = action(A.prototype.m1)

    const a1 = new A()
    const a2 = new A()

    expect(a1.m1).toBe(a2.m1)
    expect(a1.m2).not.toBe(a2.m2)
    expect(a1.hasOwnProperty("m1")).toBe(false)
    expect(a1.hasOwnProperty("m2")).toBe(true)
    expect(a2.hasOwnProperty("m1")).toBe(false)
    expect(a2.hasOwnProperty("m2")).toBe(true)
})

test("inheritance", () => {
    class A {
        a = observable(2)

        constructor() {
            initializeObservables(this)
        }
    }

    class B extends A {
        b = observable(3)

        c = computed(() => {
            return this.a + this.b
        })

        constructor() {
            super()
            initializeObservables(this)
        }
    }

    const b1 = new B()
    const b2 = new B()
    const values = []
    mobx.autorun(() => values.push(b1.c + b2.c))

    b1.a = 3
    b1.b = 4
    b2.b = 5
    b2.a = 6

    expect(values).toEqual([10, 11, 12, 14, 18])
})

test("inheritance overrides observable", () => {
    class A {
        a = observable(2)

        constructor() {
            initializeObservables(this)
        }
    }

    class B extends A {
        a = observable(5)
        b = observable(3)

        c = computed(() => {
            return this.a + this.b
        })

        constructor() {
            super()
            initializeObservables(this)
        }
    }

    const b1 = new B()
    const b2 = new B()
    const values = []
    mobx.autorun(() => values.push(b1.c + b2.c))

    b1.a = 3
    b1.b = 4
    b2.b = 5
    b2.a = 6

    expect(values).toEqual([16, 14, 15, 17, 18])
})

test("reusing initializers", () => {
    class A {
        a = observable(3)
        b = observable(this.a + 2)

        c = computed(() => {
            return this.a + this.b
        })

        d = computed(() => {
            return this.c + 1
        })

        constructor() {
            initializeObservables(this)
        }
    }

    const a = new A()
    const values = []
    mobx.autorun(() => values.push(a.d))

    a.a = 4
    expect(values).toEqual([9, 10])
})

test("enumerability", () => {
    class A {
        a = observable(1) // enumerable, on proto
        a2 = observable(2)

        b = computed(() => {
            return this.a
        }) // non-enumerable, (and, ideally, on proto)

        constructor() {
            initializeObservables(this)
        }

        m() {} // non-enumerable, on proto
        m2 = action(() => {}) // non-enumerable, on self
    }

    A.prototype.m = action(A.prototype.m)

    const a = new A()

    // not initialized yet
    let ownProps = Object.keys(a)
    let props = []
    for (const key in a) props.push(key)

    expect(ownProps).toEqual([
        // should have a, not supported yet in babel...
    ])

    expect(props).toEqual(["a", "a2"])

    expect("a" in a).toBe(true)
    expect(a.hasOwnProperty("a")).toBe(false)
    expect(a.hasOwnProperty("b")).toBe(false) // true would be more consistent, see below
    expect(a.hasOwnProperty("m")).toBe(false)
    expect(a.hasOwnProperty("m2")).toBe(true)

    expect(mobx.isAction(a.m)).toBe(true)
    expect(mobx.isAction(a.m2)).toBe(true)

    // after initialization
    a.a
    a.b
    a.m
    a.m2

    ownProps = Object.keys(a)
    props = []
    for (const key in a) props.push(key)

    expect(ownProps).toEqual([
        "a",
        "a2" // a2 is now initialized as well, altough never accessed!
    ])

    expect(props).toEqual(["a", "a2"])

    expect("a" in a).toBe(true)
    expect(a.hasOwnProperty("a")).toBe(true)
    expect(a.hasOwnProperty("a2")).toBe(true)
    expect(a.hasOwnProperty("b")).toBe(true) // true would better.. but, #1777
    expect(a.hasOwnProperty("m")).toBe(false)
    expect(a.hasOwnProperty("m2")).toBe(true)
})

test("enumerability - workaround", () => {
    class A {
        a = observable(1) // enumerable, on proto
        a2 = observable(2)

        b = computed(() => {
            return this.a
        }) // non-enumerable, (and, ideally, on proto)

        m() {} // non-enumerable, on proto
        m2 = action(() => {}) // non-enumerable, on self

        constructor() {
            initializeObservables(this)
            this.a = 1
            this.a2 = 2
        }
    }

    A.prototype.m = action(A.prototype.m)

    const a = new A()

    const ownProps = Object.keys(a)
    const props = []
    for (const key in a) props.push(key)

    expect(ownProps).toEqual([
        "a",
        "a2" // a2 is now initialized as well, altough never accessed!
    ])

    expect(props).toEqual(["a", "a2"])

    expect("a" in a).toBe(true)
    expect(a.hasOwnProperty("a")).toBe(true)
    expect(a.hasOwnProperty("a2")).toBe(true)
    expect(a.hasOwnProperty("b")).toBe(true) // ideally, false, but #1777
    expect(a.hasOwnProperty("m")).toBe(false)
    expect(a.hasOwnProperty("m2")).toBe(true)
})

test("issue 285 (babel)", () => {
    const { observable, toJS } = mobx

    class Todo {
        id = 1
        title = observable()
        finished = observable(false)
        childThings = observable([1, 2, 3])
        constructor(title) {
            initializeObservables(this)
            this.title = title
        }
    }

    const todo = new Todo("Something to do")

    expect(toJS(todo)).toEqual({
        id: 1,
        title: "Something to do",
        finished: false,
        childThings: [1, 2, 3]
    })
})

test("verify object assign (babel)", () => {
    class Todo {
        title = observable("test")

        upperCase = computed(() => {
            return this.title.toUpperCase()
        })

        constructor() {
            initializeObservables(this)
        }
    }

    const todo = new Todo()
    expect(Object.assign({}, todo)).toEqual({
        //		Should be:	title: "test"!
    })

    todo.title // lazy initialization :'(

    expect(Object.assign({}, todo)).toEqual({
        title: "test"
    })
})

test("379, inheritable actions (babel)", () => {
    class A {
        method() {
            return 42
        }
    }

    A.prototype.method = action(A.prototype.method)

    class B extends A {
        method() {
            return super.method() * 2
        }
    }

    B.prototype.method = action(B.prototype.method)

    class C extends B {
        method() {
            return super.method() + 3
        }
    }

    C.prototype.method = action(C.prototype.method)

    const b = new B()
    expect(b.method()).toBe(84)
    expect(isAction(b.method)).toBe(true)

    const a = new A()
    expect(a.method()).toBe(42)
    expect(isAction(a.method)).toBe(true)

    const c = new C()
    expect(c.method()).toBe(87)
    expect(isAction(c.method)).toBe(true)
})

test("379, inheritable actions - 2 (babel)", () => {
    class A {
        method() {
            return 42
        }
    }

    A.prototype.method = action("a method", A.prototype.method)

    class B extends A {
        method() {
            return super.method() * 2
        }
    }

    B.prototype.method = action("b method", B.prototype.method)

    class C extends B {
        method() {
            return super.method() + 3
        }
    }

    C.prototype.method = action("c method", C.prototype.method)

    const b = new B()
    expect(b.method()).toBe(84)
    expect(isAction(b.method)).toBe(true)

    const a = new A()
    expect(a.method()).toBe(42)
    expect(isAction(a.method)).toBe(true)

    const c = new C()
    expect(c.method()).toBe(87)
    expect(isAction(c.method)).toBe(true)
})

test("505, don't throw when accessing subclass fields in super constructor (babel)", () => {
    const values = {}
    class A {
        a = observable(1)
        constructor() {
            initializeObservables(this)
            values.b = this.b
            values.a = this.a
        }
    }

    class B extends A {
        b = observable(2)

        constructor() {
            super()
            initializeObservables(this)
        }
    }

    new B()
    expect(values).toEqual({ a: 1, b: 2 }) // In the TS test b is undefined, which is actually the expected behavior?
})

test("computed setter should succeed (babel)", function() {
    class Bla {
        a = observable(3)

        propX = computed(
            () => {
                return this.a * 2
            },
            v => {
                this.a = v
            }
        )

        constructor() {
            initializeObservables(this)
        }
    }

    const b = new Bla()
    expect(b.propX).toBe(6)
    b.propX = 4
    expect(b.propX).toBe(8)
})

test("computed getter / setter for plan objects should succeed (babel)", function() {
    const b = observable({
        a: 3,
        get propX() {
            return this.a * 2
        },
        set propX(v) {
            this.a = v
        }
    })

    const values = []
    mobx.autorun(() => values.push(b.propX))
    expect(b.propX).toBe(6)
    b.propX = 4
    expect(b.propX).toBe(8)

    expect(values).toEqual([6, 8])
})

test("issue #701", () => {
    class Model {
        a = observable(5)

        constructor() {
            initializeObservables(this)
        }
    }

    const model = new Model()

    expect(mobx.toJS(model)).toEqual({ a: 5 })
    expect(mobx.isObservable(model)).toBe(true)
    expect(mobx.isObservableObject(model)).toBe(true)
})

test("@observable.ref (Babel)", () => {
    class A {
        ref = observable.ref({ a: 3 })

        constructor() {
            initializeObservables(this)
        }
    }

    const a = new A()
    expect(a.ref.a).toBe(3)
    expect(mobx.isObservable(a.ref)).toBe(false)
    expect(mobx.isObservableProp(a, "ref")).toBe(true)
})

test("@observable.shallow (Babel)", () => {
    class A {
        arr = observable.shallow([{ todo: 1 }])

        constructor() {
            initializeObservables(this)
        }
    }

    const a = new A()
    const todo2 = { todo: 2 }
    a.arr.push(todo2)
    expect(mobx.isObservable(a.arr)).toBe(true)
    expect(mobx.isObservableProp(a, "arr")).toBe(true)
    expect(mobx.isObservable(a.arr[0])).toBe(false)
    expect(mobx.isObservable(a.arr[1])).toBe(false)
    expect(a.arr[1] === todo2).toBeTruthy()
})

test("@observable.deep (Babel)", () => {
    class A {
        arr = observable.deep([{ todo: 1 }])

        constructor() {
            initializeObservables(this)
        }
    }

    const a = new A()
    const todo2 = { todo: 2 }
    a.arr.push(todo2)

    expect(mobx.isObservable(a.arr)).toBe(true)
    expect(mobx.isObservableProp(a, "arr")).toBe(true)
    expect(mobx.isObservable(a.arr[0])).toBe(true)
    expect(mobx.isObservable(a.arr[1])).toBe(true)
    expect(a.arr[1] !== todo2).toBeTruthy()
    expect(isObservable(todo2)).toBe(false)
})

test("action.bound binds (Babel)", () => {
    class A {
        x = observable(0)

        inc = action(value => {
            this.x += value
        })

        constructor() {
            initializeObservables(this)
        }
    }

    const a = new A()
    const runner = a.inc
    runner(2)

    expect(a.x).toBe(2)
})

test("@computed.equals (Babel)", () => {
    const sameTime = (from, to) => from.hour === to.hour && from.minute === to.minute
    class Time {
        constructor(hour, minute) {
            initializeObservables(this)
            this.hour = hour
            this.minute = minute
        }

        hour = observable()
        minute = observable()

        time = computed(
            () => {
                return { hour: this.hour, minute: this.minute }
            },
            { equals: sameTime }
        )
    }
    const time = new Time(9, 0)

    const changes = []
    const disposeAutorun = autorun(() => changes.push(time.time))

    expect(changes).toEqual([{ hour: 9, minute: 0 }])
    time.hour = 9
    expect(changes).toEqual([{ hour: 9, minute: 0 }])
    time.minute = 0
    expect(changes).toEqual([{ hour: 9, minute: 0 }])
    time.hour = 10
    expect(changes).toEqual([
        { hour: 9, minute: 0 },
        { hour: 10, minute: 0 }
    ])
    time.minute = 30
    expect(changes).toEqual([
        { hour: 9, minute: 0 },
        { hour: 10, minute: 0 },
        { hour: 10, minute: 30 }
    ])

    disposeAutorun()
})

test("computed comparer works with decorate (babel)", () => {
    const sameTime = (from, to) => from.hour === to.hour && from.minute === to.minute
    class Time {
        hour = observable()
        minute = observable()
        constructor(hour, minute) {
            initializeObservables(this)
            this.hour = hour
            this.minute = minute
        }

        time = computed(
            () => {
                return { hour: this.hour, minute: this.minute }
            },
            { equals: sameTime }
        )
    }
    const time = new Time(9, 0)

    const changes = []
    const disposeAutorun = autorun(() => changes.push(time.time))

    expect(changes).toEqual([{ hour: 9, minute: 0 }])
    time.hour = 9
    expect(changes).toEqual([{ hour: 9, minute: 0 }])
    time.minute = 0
    expect(changes).toEqual([{ hour: 9, minute: 0 }])
    time.hour = 10
    expect(changes).toEqual([
        { hour: 9, minute: 0 },
        { hour: 10, minute: 0 }
    ])
    time.minute = 30
    expect(changes).toEqual([
        { hour: 9, minute: 0 },
        { hour: 10, minute: 0 },
        { hour: 10, minute: 30 }
    ])

    disposeAutorun()
})

test("computed comparer works with decorate (babel) - 2", () => {
    const sameTime = (from, to) => from.hour === to.hour && from.minute === to.minute
    class Time {
        constructor(hour, minute) {
            extendObservable(
                this,
                {
                    hour,
                    minute,
                    get time() {
                        return { hour: this.hour, minute: this.minute }
                    }
                },
                {
                    time: computed({ equals: sameTime })
                }
            )
        }
    }
    const time = new Time(9, 0)

    const changes = []
    const disposeAutorun = autorun(() => changes.push(time.time))

    expect(changes).toEqual([{ hour: 9, minute: 0 }])
    time.hour = 9
    expect(changes).toEqual([{ hour: 9, minute: 0 }])
    time.minute = 0
    expect(changes).toEqual([{ hour: 9, minute: 0 }])
    time.hour = 10
    expect(changes).toEqual([
        { hour: 9, minute: 0 },
        { hour: 10, minute: 0 }
    ])
    time.minute = 30
    expect(changes).toEqual([
        { hour: 9, minute: 0 },
        { hour: 10, minute: 0 },
        { hour: 10, minute: 30 }
    ])

    disposeAutorun()
})

test("computed comparer works with decorate (babel) - 3", () => {
    const sameTime = (from, to) => from.hour === to.hour && from.minute === to.minute
    const time = observable.object(
        {
            hour: 9,
            minute: 0,
            get time() {
                return { hour: this.hour, minute: this.minute }
            }
        },
        {
            time: computed({ equals: sameTime })
        }
    )

    const changes = []
    const disposeAutorun = autorun(() => changes.push(time.time))

    expect(changes).toEqual([{ hour: 9, minute: 0 }])
    time.hour = 9
    expect(changes).toEqual([{ hour: 9, minute: 0 }])
    time.minute = 0
    expect(changes).toEqual([{ hour: 9, minute: 0 }])
    time.hour = 10
    expect(changes).toEqual([
        { hour: 9, minute: 0 },
        { hour: 10, minute: 0 }
    ])
    time.minute = 30
    expect(changes).toEqual([
        { hour: 9, minute: 0 },
        { hour: 10, minute: 0 },
        { hour: 10, minute: 30 }
    ])

    disposeAutorun()
})

test("actions are reassignable", () => {
    // See #1398, make actions reassignable to support stubbing
    class A {
        m1() {}
        m2 = action(() => {})
        m3 = action(() => {})
        m4 = action(() => {})
    }

    A.prototype.m1 = action(A.prototype.m1)

    const a = new A()
    expect(isAction(a.m1)).toBe(true)
    expect(isAction(a.m2)).toBe(true)
    expect(isAction(a.m3)).toBe(true)
    expect(isAction(a.m4)).toBe(true)
    a.m1 = () => {}
    expect(isAction(a.m1)).toBe(false)
    a.m2 = () => {}
    expect(isAction(a.m2)).toBe(false)
    a.m3 = () => {}
    expect(isAction(a.m3)).toBe(false)
    a.m4 = () => {}
    expect(isAction(a.m4)).toBe(false)
})

test("it should support asyncAction (babel)", async () => {
    mobx.configure({ enforceActions: "observed" })

    class X {
        a = observable(1)

        f = mobx.flow(function* f(initial) {
            this.a = initial // this runs in action
            this.a += yield Promise.resolve(5)
            this.a = this.a * 2
            return this.a
        })

        constructor() {
            initializeObservables(this)
        }
    }

    const x = new X()

    expect(await x.f(3)).toBe(16)
})

test("toJS bug #1413 (babel)", () => {
    class X {
        test = observable({
            test1: 1
        })

        constructor() {
            initializeObservables(this)
        }
    }

    const x = new X()
    const res = mobx.toJS(x.test)
    expect(res).toEqual({ test1: 1 })
    expect(res.__mobxDidRunLazyInitializers).toBe(undefined)
})

test("computed setter problem", () => {
    class Contact {
        firstName = observable("")
        lastName = observable("")

        fullName = computed(
            () => {
                return `${this.firstName} ${this.lastName}`
            },
            value => {
                const [firstName, lastName] = value.split(" ")

                this.firstName = firstName
                this.lastName = lastName
            },
            {
                set(value) {
                    const [firstName, lastName] = value.split(" ")

                    this.firstName = firstName
                    this.lastName = lastName
                }
            }
        )

        constructor() {
            initializeObservables(this)
        }
    }

    const c = new Contact()

    c.firstName = "Pavan"
    c.lastName = "Podila"

    expect(c.fullName).toBe("Pavan Podila")

    c.fullName = "Michel Weststrate"
    expect(c.firstName).toBe("Michel")
    expect(c.lastName).toBe("Weststrate")
})

test("computed setter problem - 2", () => {
    class Contact {
        firstName = observable("")
        lastName = observable("")

        constructor() {
            initializeObservables(this)
            initializeObservables(this)
        }

        fullName = computed(
            () => {
                return `${this.firstName} ${this.lastName}`
            },
            {
                // This doesn't work
                set: function(value) {
                    const [firstName, lastName] = value.split(" ")

                    this.firstName = firstName
                    this.lastName = lastName
                },
                equals: mobx.comparer.identity
            }
        )
    }

    const c = new Contact()

    c.firstName = "Pavan"
    c.lastName = "Podila"

    expect(c.fullName).toBe("Pavan Podila")

    c.fullName = "Michel Weststrate"
    expect(c.firstName).toBe("Michel")
    expect(c.lastName).toBe("Weststrate")
})

test("#1740, combining extendObservable & decorators", () => {
    class AppState {
        constructor(id) {
            initializeObservables(this)
            extendObservable(this, {
                id
            })
            expect(this.foo).toBe(id)
        }

        foo = computed(() => {
            return this.id
        })
    }

    let app = new AppState(1)
    expect(app.id).toBe(1)
    expect(app.foo).toBe(1)
    expect(isObservableProp(app, "id")).toBe(true)
    expect(isComputedProp(app, "foo")).toBe(true)

    app = new AppState(2)
    expect(app.id).toBe(2)
    expect(app.foo).toBe(2)
    expect(isObservableProp(app, "id")).toBe(true)
    expect(isComputedProp(app, "foo")).toBe(true)
})
