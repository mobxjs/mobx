"use strict"

import {
    observe,
    computed,
    observable,
    autorun,
    extendObservable,
    action,
    IObservableObject,
    IObservableArray,
    IArrayChange,
    IArraySplice,
    IArrayWillChange,
    IArrayWillSplice,
    IObservableValue,
    isObservable,
    isObservableProp,
    isObservableObject,
    transaction,
    IObjectDidChange,
    spy,
    configure,
    isAction,
    decorate,
    IAtom,
    createAtom,
    runInAction,
    initializeObservables
} from "../../../src/v5/mobx"
import * as mobx from "../../../src/v5/mobx"
import { assert, IsExact } from "conditional-type-checks"

const v = observable.box(3)
observe(v, () => {})

const a = observable([1, 2, 3])

const testFunction = function(a: any) {}

// lazy wrapper around yest

const t = {
    equal(a: any, b: any) {
        expect(a).toBe(b)
    },
    deepEqual(a: any, b: any) {
        expect(a).toEqual(b)
    },
    notEqual(a: any, b: any) {
        expect(a).not.toEqual(b)
    },

    throws(a: any, b: any) {
        expect(a).toThrow(b)
    }
}

test("ts - class basic - 1", function() {
    class Box {
        height = observable(20)

        constructor() {
            initializeObservables(this)
        }
    }

    const box = new Box()
    box.height
    const h: number[] = []
    autorun(() => {
        h.push(box.height)
    })
    box.height = 25
    expect(h).toEqual([20, 25])

    expect(new Box().height).toBe(20)
    expect(box.height).toBe(25)
})

test("ts - class basic - 3", function() {
    class Box {
        height = observable(20)

        width = computed(() => this.height + this.getSomeConstant())

        getSomeConstant() {
            return 5
        }

        constructor() {
            initializeObservables(this)
        }
    }

    const box = new Box()
    box.height
    box.width
    const h: number[] = []
    autorun(() => {
        h.push(box.height)
    })
    box.height = 25
    expect(h).toEqual([20, 25])

    expect(new Box().height).toBe(20)
    expect(box.height).toBe(25)
    expect(box.width).toBe(30)
})

test("decorators", () => {
    class Order {
        price: number = observable(3)
        amount: number = observable(2)
        orders: string[] = observable([])
        aFunction = observable(testFunction)

        total = computed(() => {
            return this.amount * this.price * (1 + this.orders.length)
        })

        constructor() {
            initializeObservables(this)
        }
        // Typescript classes cannot be defined inside functions,
        // but if the next line is enabled it should throw...
        // @observable hoepie() { return 3; }
    }

    const o = new Order()
    t.equal(isObservableObject(o), true)
    t.equal(isObservableProp(o, "amount"), true)
    t.equal(isObservableProp(o, "total"), true)

    const events: any[] = []
    // const d1 = observe(o, (ev: IObjectDidChange) => events.push(ev.name, (ev as any).oldValue))
    const d2 = observe(o, "price", ev => events.push(ev.newValue, ev.oldValue))
    const d3 = observe(o, "total", ev => events.push(ev.newValue, ev.oldValue))

    o.price = 4

    d1()
    d2()
    d3()

    o.price = 5

    t.deepEqual(events, [
        8, // new total
        6, // old total
        4, // new price
        3, // old price
        "price", // event name
        3 // event oldValue
    ])
})

test("observable", () => {
    const a = observable.box(3)
    const b = computed.box(() => a.get() * 2)
    t.equal(b.get(), 6)
})

test("annotations", () => {
    class Order {
        price: number = observable(3)
        amount: number = observable(2)
        orders: string[] = observable([])
        aFunction = observable(testFunction)

        total = computed(() => this.amount * this.price * (1 + this.orders.length))

        constructor() {
            initializeObservables(this)
        }
    }

    const order1totals: number[] = []
    const order1 = new Order()
    const order2 = new Order()

    const disposer = autorun(() => {
        order1totals.push(order1.total)
    })

    order2.price = 4
    order1.amount = 1

    t.equal(order1.price, 3)
    t.equal(order1.total, 3)
    t.equal(order2.total, 8)
    order2.orders.push("bla")
    t.equal(order2.total, 16)

    order1.orders.splice(0, 0, "boe", "hoi")
    t.deepEqual(order1totals, [6, 3, 9])

    disposer()
    order1.orders.pop()
    t.equal(order1.total, 6)
    t.deepEqual(order1totals, [6, 3, 9])

    t.equal(order1.aFunction, testFunction)
    const x = function() {
        return 3
    }
    order1.aFunction = x
    t.equal(order1.aFunction, x)
})

test("scope", () => {
    const x = observable({
        y: 3,
        // this wo't work here.
        get z() {
            return 2 * this.y
        }
    })

    t.equal(x.z, 6)
    x.y = 4
    t.equal(x.z, 8)

    interface IThing {
        z: number
        y: number
    }

    const Thing = function(this: any) {
        extendObservable(this, {
            y: 3,
            // this will work here
            get z() {
                return 2 * this.y
            }
        })
    }

    const x3: IThing = new (<any>Thing)()
    t.equal(x3.z, 6)
    x3.y = 4
    t.equal(x3.z, 8)
})

test("typing", () => {
    const ar: IObservableArray<number> = observable([1, 2])
    ar.intercept((c: IArrayWillChange<number> | IArrayWillSplice<number>) => {
        // console.log(c.type)
        return null
    })
    ar.observe((d: IArrayChange<number> | IArraySplice<number>) => {
        // console.log(d.type)
    })

    const ar2: IObservableArray<number> = observable([1, 2])
    ar2.intercept((c: IArrayWillChange<number> | IArrayWillSplice<number>) => {
        // console.log(c.type)
        return null
    })
    ar2.observe((d: IArrayChange<number> | IArraySplice<number>) => {
        // console.log(d.type)
    })

    const x: IObservableValue<number> = observable.box(3)
})

const state: any = observable({
    authToken: null
})

test("box", () => {
    class Box {
        uninitialized = observable<boolean>(undefined as any)
        height = observable(20)
        sizes = observable([2])

        someFunc = observable(function(): number {
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

    const ar: number[] = []

    autorun(() => {
        ar.push(box.width)
    })

    t.deepEqual(ar.slice(), [40])
    box.height = 10
    t.deepEqual(ar.slice(), [40, 20])
    box.sizes.push(3, 4)
    t.deepEqual(ar.slice(), [40, 20, 60])
    box.someFunc = () => 7
    t.deepEqual(ar.slice(), [40, 20, 60, 210])
    box.uninitialized = true
    t.deepEqual(ar.slice(), [40, 20, 60, 210, 420])
    box.addSize()
    expect(ar.slice()).toEqual([40, 20, 60, 210, 420, 700])
})

test("computed setter should succeed", () => {
    class Bla {
        constructor() {
            initializeObservables(this)
        }

        a = observable(3)
        propX = computed(
            () => {
                return this.a * 2
            },
            v => {
                this.a = v
            }
        )
    }

    const b = new Bla()
    t.equal(b.propX, 6)
    b.propX = 4
    t.equal(b.propX, 8)
})

test("atom clock example", done => {
    let ticks = 0
    const time_factor = process.env.CI === "true" ? 300 : 100 // speed up / slow down tests

    class Clock {
        atom: IAtom
        intervalHandler: NodeJS.Timeout | null = null
        currentDateTime: string | undefined = undefined

        constructor() {
            // console.log("create")
            // creates an atom to interact with the mobx core algorithm
            this.atom = mobx.createAtom(
                // first param a name for this atom, for debugging purposes
                "Clock",
                // second (optional) parameter: callback for when this atom transitions from unobserved to observed.
                () => this.startTicking(),
                // third (optional) parameter: callback for when this atom transitions from observed to unobserved
                // note that the same atom transition multiple times between these two states
                () => this.stopTicking()
            )
        }

        getTime() {
            // console.log("get time")
            // let mobx now this observable data source has been used
            this.atom.reportObserved() // will trigger startTicking and thus tick
            return this.currentDateTime
        }

        tick() {
            // console.log("tick")
            ticks++
            this.currentDateTime = new Date().toString()
            this.atom.reportChanged()
        }

        startTicking() {
            // console.log("start ticking")
            this.tick()
            // The cast to any here is to force TypeScript to select the correct
            // overload of setInterval: the one that returns number, as opposed
            // to the one defined in @types/node
            this.intervalHandler = setInterval(() => this.tick(), (1 * time_factor) as any)
        }

        stopTicking() {
            // console.log("stop ticking")
            clearInterval(this.intervalHandler!)
            this.intervalHandler = null
        }
    }

    const clock = new Clock()

    const values: string[] = []

    // ... prints the time each second
    const disposer = autorun(() => {
        values.push(clock.getTime()!)
        // console.log(clock.getTime())
    })

    // printing stops. If nobody else uses the same `clock` the clock will stop ticking as well.
    setTimeout(disposer, 4.5 * time_factor)

    setTimeout(() => {
        expect(ticks).toEqual(5)
        expect(values.length).toEqual(5)
        expect(values.filter(x => x.length > 0).length).toBe(5)
        done()
    }, 10 * time_factor)
})

test("typescript: parameterized computed decorator", () => {
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
    const changes: { sum: number }[] = []
    const d = autorun(() => changes.push(t1.boxedSum))

    t1.y = 4 // change
    t.equal(changes.length, 2)
    t1.y = 4.2 // no change
    t.equal(changes.length, 2)
    transaction(() => {
        t1.y = 3
        t1.x = 4
    }) // no change
    t.equal(changes.length, 2)
    t1.x = 6 // change
    t.equal(changes.length, 3)
    d()

    t.deepEqual(changes, [{ sum: 6 }, { sum: 7 }, { sum: 9 }])
})

test("issue 165", () => {
    function report<T>(msg: string, value: T) {
        // console.log(msg, ":", value)
        return value
    }

    class Card {
        constructor(public game: Game, public id: number) {
            initializeObservables(this)
        }

        isWrong = computed(() => {
            return report(
                "Computing isWrong for card " + this.id,
                this.isSelected && this.game.isMatchWrong
            )
        })

        isSelected = computed(() => {
            return report(
                "Computing isSelected for card" + this.id,
                this.game.firstCardSelected === this || this.game.secondCardSelected === this
            )
        })
    }

    class Game {
        firstCardSelected: Card | null = observable(null)
        secondCardSelected: Card | null = observable(null)

        isMatchWrong = computed(() => {
            return report(
                "Computing isMatchWrong",
                this.secondCardSelected !== null &&
                    this.firstCardSelected!.id !== this.secondCardSelected.id
            )
        })

        constructor() {
            initializeObservables(this)
        }
    }

    let game = new Game()
    let card1 = new Card(game, 1),
        card2 = new Card(game, 2)

    autorun(() => {
        card1.isWrong
        card2.isWrong
        // console.log("card1.isWrong =", card1.isWrong)
        // console.log("card2.isWrong =", card2.isWrong)
        // console.log("------------------------------")
    })

    // console.log("Selecting first card")
    game.firstCardSelected = card1
    // console.log("Selecting second card")
    game.secondCardSelected = card2

    t.equal(card1.isWrong, true)
    t.equal(card2.isWrong, true)
})

test("issue 191 - shared initializers (ts)", () => {
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

    t.notEqual(t1.obj, t2.obj)
    t.notEqual(t1.array, t2.array)
    t.equal(t1.obj.a, 2)
    t.equal(t2.obj.a, 3)

    t.deepEqual(t1.array.slice(), [2, 3])
    t.deepEqual(t2.array.slice(), [2, 4])
})

function normalizeSpyEvents(events: any[]) {
    events.forEach(ev => {
        delete ev.fn
        delete ev.time
    })
    return events
}

test("action decorator (typescript)", () => {
    class Store {
        constructor(private multiplier: number) {}

        add(a: number, b: number): number {
            return (a + b) * this.multiplier
        }
    }

    Store.prototype.add = action(Store.prototype.add)

    const store1 = new Store(2)
    const store2 = new Store(3)
    const events: any[] = []
    const d = spy(events.push.bind(events))
    t.equal(store1.add(3, 4), 14)
    t.equal(store2.add(2, 2), 12)
    t.equal(store1.add(1, 1), 4)

    t.deepEqual(normalizeSpyEvents(events), [
        { arguments: [3, 4], name: "add", spyReportStart: true, object: store1, type: "action" },
        { spyReportEnd: true },
        { arguments: [2, 2], name: "add", spyReportStart: true, object: store2, type: "action" },
        { spyReportEnd: true },
        { arguments: [1, 1], name: "add", spyReportStart: true, object: store1, type: "action" },
        { spyReportEnd: true }
    ])

    d()
})

test("custom action decorator (typescript)", () => {
    class Store {
        constructor(private multiplier: number) {}

        add(a: number, b: number): number {
            return (a + b) * this.multiplier
        }
    }

    Store.prototype.add = action("zoem zoem", Store.prototype.add)

    const store1 = new Store(2)
    const store2 = new Store(3)
    const events: any[] = []
    const d = spy(events.push.bind(events))
    t.equal(store1.add(3, 4), 14)
    t.equal(store2.add(2, 2), 12)
    t.equal(store1.add(1, 1), 4)

    t.deepEqual(normalizeSpyEvents(events), [
        {
            arguments: [3, 4],
            name: "zoem zoem",
            spyReportStart: true,
            object: store1,
            type: "action"
        },
        { spyReportEnd: true },
        {
            arguments: [2, 2],
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

test("action decorator on field (typescript)", () => {
    class Store {
        constructor(private multiplier: number) {}

        add = action((a: number, b: number) => {
            return (a + b) * this.multiplier
        })
    }

    const store1 = new Store(2)
    const store2 = new Store(7)
    expect(store1.add).not.toEqual(store2.add)

    const events: any[] = []
    const d = spy(events.push.bind(events))
    t.equal(store1.add(3, 4), 14)
    t.equal(store2.add(4, 5), 63)
    t.equal(store1.add(2, 2), 8)

    t.deepEqual(normalizeSpyEvents(events), [
        { arguments: [3, 4], name: "add", spyReportStart: true, object: store1, type: "action" },
        { spyReportEnd: true },
        { arguments: [4, 5], name: "add", spyReportStart: true, object: store2, type: "action" },
        { spyReportEnd: true },
        { arguments: [2, 2], name: "add", spyReportStart: true, object: store1, type: "action" },
        { spyReportEnd: true }
    ])

    d()
})

test("custom action decorator on field (typescript)", () => {
    class Store {
        constructor(private multiplier: number) {}

        add = action("zoem zoem", (a: number, b: number) => {
            return (a + b) * this.multiplier
        })
    }

    const store1 = new Store(2)
    const store2 = new Store(7)

    const events: any[] = []
    const d = spy(events.push.bind(events))
    t.equal(store1.add(3, 4), 14)
    t.equal(store2.add(4, 5), 63)
    t.equal(store1.add(2, 2), 8)

    t.deepEqual(normalizeSpyEvents(events), [
        {
            arguments: [3, 4],
            name: "zoem zoem",
            spyReportStart: true,
            object: store1,
            type: "action"
        },
        { spyReportEnd: true },
        {
            arguments: [4, 5],
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

test("267 (typescript) should be possible to declare properties observable outside strict mode", () => {
    configure({ enforceActions: "observed" })

    class Store {
        timer: number | null = observable(null)

        constructor() {
            initializeObservables(this)
        }
    }

    configure({ enforceActions: "never" })
})

test("288 atom not detected for object property", () => {
    class Store {
        foo = observable("")

        constructor() {
            initializeObservables(this)
        }
    }

    const store = new Store()

    mobx.observe(
        store,
        "foo",
        () => {
            // console.log("Change observed")
        },
        true
    )
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

    const objs: any[] = []
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

    t.equal(a1.m1, a2.m1)
    t.notEqual(a1.m2, a2.m2)
    t.equal(a1.hasOwnProperty("m1"), false)
    t.equal(a1.hasOwnProperty("m2"), true)
    t.equal(a2.hasOwnProperty("m1"), false)
    t.equal(a2.hasOwnProperty("m2"), true)
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
    const values: any[] = []
    mobx.autorun(() => values.push(b1.c + b2.c))

    b1.a = 3
    b1.b = 4
    b2.b = 5
    b2.a = 6

    t.deepEqual(values, [10, 11, 12, 14, 18])
})

test("inheritance overrides observable", () => {
    class A {
        a = observable(2)

        constructor() {
            initializeObservables(this)
        }
    }

    class B {
        a = observable(5)
        b = observable(3)

        c = computed(() => {
            return this.a + this.b
        })

        constructor() {
            initializeObservables(this)
        }
    }

    const b1 = new B()
    const b2 = new B()
    const values: any[] = []
    mobx.autorun(() => values.push(b1.c + b2.c))

    b1.a = 3
    b1.b = 4
    b2.b = 5
    b2.a = 6

    t.deepEqual(values, [16, 14, 15, 17, 18])
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
    const values: any[] = []
    mobx.autorun(() => values.push(a.d))

    a.a = 4
    t.deepEqual(values, [9, 10])
})

test("enumerability", () => {
    class A {
        a = observable(1) // enumerable, on proto

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
    let props: string[] = []
    for (const key in a) props.push(key)

    t.deepEqual(ownProps, [
        "a" // yeej!
    ])

    t.deepEqual(props, [
        // also 'a' would be ok
        "a"
    ])

    t.equal("a" in a, true)
    t.equal(a.hasOwnProperty("a"), true)
    t.equal(a.hasOwnProperty("b"), true) // false would be slightly better, true also ok-ish, and, see #1777
    t.equal(a.hasOwnProperty("m"), false)
    t.equal(a.hasOwnProperty("m2"), true)

    t.equal(mobx.isAction(a.m), true)
    t.equal(mobx.isAction(a.m2), true)

    // after initialization
    a.a
    a.b
    a.m
    a.m2

    ownProps = Object.keys(a)
    props = []
    for (const key in a) props.push(key)

    t.deepEqual(ownProps, ["a"])

    t.deepEqual(props, ["a"])

    t.equal("a" in a, true)
    t.equal(a.hasOwnProperty("a"), true)
    t.equal(a.hasOwnProperty("b"), true) // false would be slightly better, true also ok-ish, and, see #1777
    t.equal(a.hasOwnProperty("m"), false)
    t.equal(a.hasOwnProperty("m2"), true)
})

test("issue 285 (typescript)", () => {
    const { observable, toJS } = mobx

    class Todo {
        id = 1
        title: string = observable()
        finished = observable(false)
        childThings = observable([1, 2, 3])
        constructor(title: string) {
            initializeObservables(this)
            this.title = title
        }
    }

    const todo = new Todo("Something to do")

    t.deepEqual(toJS(todo), {
        id: 1,
        title: "Something to do",
        finished: false,
        childThings: [1, 2, 3]
    })
})

test("verify object assign (typescript)", () => {
    class Todo {
        title = observable("test")

        upperCase = computed(() => {
            return this.title.toUpperCase()
        })

        constructor() {
            initializeObservables(this)
        }
    }

    t.deepEqual((Object as any).assign({}, new Todo()), {
        title: "test"
    })
})

test("379, inheritable actions (typescript)", () => {
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
    t.equal(b.method(), 84)
    t.equal(isAction(b.method), true)

    const a = new A()
    t.equal(a.method(), 42)
    t.equal(isAction(a.method), true)

    const c = new C()
    t.equal(c.method(), 87)
    t.equal(isAction(c.method), true)
})

test("379, inheritable actions - 2 (typescript)", () => {
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
    t.equal(b.method(), 84)
    t.equal(isAction(b.method), true)

    const a = new A()
    t.equal(a.method(), 42)
    t.equal(isAction(a.method), true)

    const c = new C()
    t.equal(c.method(), 87)
    t.equal(isAction(c.method), true)
})

test("373 - fix isObservable for unused computed", () => {
    class Bla {
        computedVal = computed(() => {
            return 3
        })

        constructor() {
            initializeObservables(this)
            t.equal(isObservableProp(this, "computedVal"), true)
            this.computedVal
            t.equal(isObservableProp(this, "computedVal"), true)
        }
    }

    new Bla()
})

test("505, don't throw when accessing subclass fields in super constructor (typescript)", () => {
    const values: any = {}
    class A {
        a = observable(1)
        constructor() {
            initializeObservables(this)
            values.b = (this as any)["b"]
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
    t.deepEqual(values, { a: 1, b: undefined }) // undefined, as A constructor runs before B constructor
})

test("computed getter / setter for plan objects should succeed (typescript)", () => {
    const b = observable({
        a: 3,
        get propX() {
            return this.a * 2
        },
        set propX(v) {
            this.a = v
        }
    })

    const values: number[] = []
    mobx.autorun(() => values.push(b.propX))
    t.equal(b.propX, 6)
    b.propX = 4
    t.equal(b.propX, 8)

    t.deepEqual(values, [6, 8])
})

test("484 - observable objects are IObservableObject", () => {
    const needs_observable_object = (o: IObservableObject): any => null
    const o = observable({ stuff: "things" })

    needs_observable_object(o)
})

test("484 - observable objects are still type T", () => {
    const o = observable({ stuff: "things" })
    o.stuff = "new things"
})

test("484 - isObservableObject type guard includes type T", () => {
    const o = observable({ stuff: "things" })
    if (isObservableObject(o)) {
        o.stuff = "new things"
    } else {
        throw "failure"
    }
})

test("484 - isObservableObject type guard includes type IObservableObject", () => {
    const requires_observable_object = (o: IObservableObject): void => {}
    const o = observable({ stuff: "things" })

    if (isObservableObject(o)) {
        requires_observable_object(o)
    } else {
        throw "object should have been IObservableObject"
    }
})

test("705 - setter undoing caching (typescript)", () => {
    let recomputes = 0
    let autoruns = 0

    class Person {
        name: string = observable("")
        title: string = observable("")

        // Typescript bug: if fullName is before the getter, the property is defined twice / incorrectly, see #705
        // set fullName(val) {
        // 	// Noop
        // }
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

    t.equal(recomputes, 0)
    t.equal(autoruns, 0)

    const d1 = autorun(() => {
        autoruns++
        p1.fullName
    })

    const d2 = autorun(() => {
        autoruns++
        p1.fullName
    })

    t.equal(recomputes, 1)
    t.equal(autoruns, 2)

    p1.title = "Master"
    t.equal(recomputes, 2)
    t.equal(autoruns, 4)

    d1()
    d2()
})

test("@observable.ref (TS)", () => {
    class A {
        ref = observable.ref({ a: 3 })

        constructor() {
            initializeObservables(this)
        }
    }

    const a = new A()
    t.equal(a.ref.a, 3)
    t.equal(mobx.isObservable(a.ref), false)
    t.equal(mobx.isObservableProp(a, "ref"), true)
})

test("@observable.shallow (TS)", () => {
    class A {
        arr = observable.shallow([{ todo: 1 }])

        constructor() {
            initializeObservables(this)
        }
    }

    const a = new A()
    const todo2 = { todo: 2 }
    a.arr.push(todo2)
    t.equal(mobx.isObservable(a.arr), true)
    t.equal(mobx.isObservableProp(a, "arr"), true)
    t.equal(mobx.isObservable(a.arr[0]), false)
    t.equal(mobx.isObservable(a.arr[1]), false)
    t.equal(a.arr[1] === todo2, true)
})

test("@observable.deep (TS)", () => {
    class A {
        arr = observable.deep([{ todo: 1 }])

        constructor() {
            initializeObservables(this)
        }
    }

    const a = new A()
    const todo2 = { todo: 2 }
    a.arr.push(todo2)

    t.equal(mobx.isObservable(a.arr), true)
    t.equal(mobx.isObservableProp(a, "arr"), true)
    t.equal(mobx.isObservable(a.arr[0]), true)
    t.equal(mobx.isObservable(a.arr[1]), true)
    t.equal(a.arr[1] !== todo2, true)
    t.equal(isObservable(todo2), false)
})

test("action.bound binds (TS)", () => {
    class A {
        x = observable(0)

        inc = action((value: number) => {
            this.x += value
        })

        constructor() {
            initializeObservables(this)
        }
    }

    const a = new A()
    const runner = a.inc
    runner(2)

    t.equal(a.x, 2)
})

test("803 - action.bound and action preserve type info", () => {
    function thingThatAcceptsCallback(cb: (elem: { x: boolean }) => void) {}

    thingThatAcceptsCallback(elem => {
        // console.log(elem.x) // x is boolean
    })

    thingThatAcceptsCallback(
        action((elem: any) => {
            // ideally, type of action would be inferred!
            console.log(elem.x) // x is boolean
        })
    )

    const bound = action(() => {
        return { x: "3" } as Object
    }) as () => void

    const bound2 = action(function() {}) as () => void
})

test("@computed.equals (TS)", () => {
    const sameTime = (from: Time, to: Time) => from.hour === to.hour && from.minute === to.minute
    class Time {
        constructor(hour: number, minute: number) {
            initializeObservables(this)
            this.hour = hour
            this.minute = minute
        }

        public hour: number = observable()
        public minute: number = observable()

        time = computed(
            () => {
                return { hour: this.hour, minute: this.minute }
            },
            { equals: sameTime }
        )
    }
    const time = new Time(9, 0)

    const changes: Array<{ hour: number; minute: number }> = []
    const disposeAutorun = autorun(() => changes.push(time.time))

    t.deepEqual(changes, [{ hour: 9, minute: 0 }])
    time.hour = 9
    t.deepEqual(changes, [{ hour: 9, minute: 0 }])
    time.minute = 0
    t.deepEqual(changes, [{ hour: 9, minute: 0 }])
    time.hour = 10
    t.deepEqual(changes, [
        { hour: 9, minute: 0 },
        { hour: 10, minute: 0 }
    ])
    time.minute = 30
    t.deepEqual(changes, [
        { hour: 9, minute: 0 },
        { hour: 10, minute: 0 },
        { hour: 10, minute: 30 }
    ])

    disposeAutorun()
})

test("computed comparer works with decorate (TS)", () => {
    const sameTime = (from: Time, to: Time) => from.hour === to.hour && from.minute === to.minute
    class Time {
        constructor(public hour: number, public minute: number) {}

        get time() {
            return { hour: this.hour, minute: this.minute }
        }
    }
    decorate(Time, {
        hour: observable,
        minute: observable,
        time: computed({ equals: sameTime })
    })
    const time = new Time(9, 0)

    const changes: Array<{ hour: number; minute: number }> = []
    const disposeAutorun = autorun(() => changes.push((time as any).time))

    t.deepEqual(changes, [{ hour: 9, minute: 0 }])
    time.hour = 9
    t.deepEqual(changes, [{ hour: 9, minute: 0 }])
    time.minute = 0
    t.deepEqual(changes, [{ hour: 9, minute: 0 }])
    time.hour = 10
    t.deepEqual(changes, [
        { hour: 9, minute: 0 },
        { hour: 10, minute: 0 }
    ])
    time.minute = 30
    t.deepEqual(changes, [
        { hour: 9, minute: 0 },
        { hour: 10, minute: 0 },
        { hour: 10, minute: 30 }
    ])

    disposeAutorun()
})

test("computed comparer works with decorate (TS)", () => {
    const sameTime = (from: Time, to: Time) => from.hour === to.hour && from.minute === to.minute
    class Time {
        constructor(public hour: number, public minute: number) {}

        get time() {
            return { hour: this.hour, minute: this.minute }
        }
    }
    decorate(Time, {
        hour: observable,
        minute: observable,
        time: computed({ equals: sameTime })
    })
    const time = new Time(9, 0)

    const changes: Array<{ hour: number; minute: number }> = []
    const disposeAutorun = autorun(() => changes.push((time as any).time))

    t.deepEqual(changes, [{ hour: 9, minute: 0 }])
    time.hour = 9
    t.deepEqual(changes, [{ hour: 9, minute: 0 }])
    time.minute = 0
    t.deepEqual(changes, [{ hour: 9, minute: 0 }])
    time.hour = 10
    t.deepEqual(changes, [
        { hour: 9, minute: 0 },
        { hour: 10, minute: 0 }
    ])
    time.minute = 30
    t.deepEqual(changes, [
        { hour: 9, minute: 0 },
        { hour: 10, minute: 0 },
        { hour: 10, minute: 30 }
    ])

    disposeAutorun()
})

test("computed comparer works with decorate (TS) - 2", () => {
    const sameTime = (from: Time, to: Time) => from.hour === to.hour && from.minute === to.minute
    class Time {
        hour!: number
        minute!: number
        readonly time!: number

        constructor(hour: number, minute: number) {
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

    const changes: Array<{ hour: number; minute: number }> = []
    const disposeAutorun = autorun(() => changes.push((time as any).time))

    t.deepEqual(changes, [{ hour: 9, minute: 0 }])
    time.hour = 9
    t.deepEqual(changes, [{ hour: 9, minute: 0 }])
    time.minute = 0
    t.deepEqual(changes, [{ hour: 9, minute: 0 }])
    time.hour = 10
    t.deepEqual(changes, [
        { hour: 9, minute: 0 },
        { hour: 10, minute: 0 }
    ])
    time.minute = 30
    t.deepEqual(changes, [
        { hour: 9, minute: 0 },
        { hour: 10, minute: 0 },
        { hour: 10, minute: 30 }
    ])

    disposeAutorun()
})

test("computed comparer works with decorate (TS) - 3", () => {
    const sameTime = (from: any, to: any) => from.hour === to.hour && from.minute === to.minute
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

    const changes: Array<{ hour: number; minute: number }> = []
    const disposeAutorun = autorun(() => changes.push((time as any).time))

    t.deepEqual(changes, [{ hour: 9, minute: 0 }])
    time.hour = 9
    t.deepEqual(changes, [{ hour: 9, minute: 0 }])
    time.minute = 0
    t.deepEqual(changes, [{ hour: 9, minute: 0 }])
    time.hour = 10
    t.deepEqual(changes, [
        { hour: 9, minute: 0 },
        { hour: 10, minute: 0 }
    ])
    time.minute = 30
    t.deepEqual(changes, [
        { hour: 9, minute: 0 },
        { hour: 10, minute: 0 },
        { hour: 10, minute: 30 }
    ])

    disposeAutorun()
})

test("1072 - @observable without initial value and observe before first access", () => {
    class User {
        loginCount?: number = observable()

        constructor() {
            initializeObservables(this)
        }
    }

    const user = new User()
    observe(user, "loginCount", () => {})
})

test("typescript - decorate works with classes", () => {
    class Box {
        height: number = 2
    }

    decorate(Box, {
        height: observable
        // size: observable // MWE: enabling this should give type error!
    })
    const b = new Box()
    expect(b.height).toBe(2)
    expect(mobx.isObservableProp(b, "height")).toBe(true)
})

test("typescript - decorate works with objects", () => {
    const b = decorate(
        {
            height: 2
        },
        {
            height: observable
            // size: observable // MWE: enabling this should give type error!
        }
    )
    expect(mobx.isObservableProp(b, "height")).toBe(true)
    expect(b.height).toBe(2)
})

test("typescript - decorate works with Object.create", () => {
    const Box = {
        height: 2
    }

    decorate(Box, {
        height: observable
        // size: observable // MWE: enabling this should give type error!
    })

    const b = Object.create(Box)
    expect(mobx.isObservableProp(b, "height")).toBe(true)
    expect(b.height).toBe(2)
})

test("issue #1122", done => {
    class ClassA {
        _atom = createAtom(
            "Testing atom",
            () => {
                // console.log("Value getting observed.")
            },
            () => {
                // console.log("Value getting unobserved.")
                runInAction(() => {}) // <-- INFINITE RECURSION
            }
        )
        get value() {
            this._atom.reportObserved()
            return true
        }
    }

    const a = new ClassA()
    const unobserve = autorun(() => {
        // console.log(a.value)
    })

    setTimeout(() => {
        unobserve()
        done()
    }, 100)
})

test("unread computed reads should trow with requiresReaction enabled", () => {
    class A {
        x = observable(0)

        y = computed(
            () => {
                return this.x * 2
            },
            { requiresReaction: true }
        )

        constructor() {
            initializeObservables(this)
        }
    }

    const a = new A()
    expect(() => {
        a.y
    }).toThrow(/is read outside a reactive context/)

    const d = mobx.reaction(
        () => a.y,
        () => {}
    )
    expect(() => {
        a.y
    }).not.toThrow()

    d()
    expect(() => {
        a.y
    }).toThrow(/is read outside a reactive context/)
})

test("multiple inheritance should work", () => {
    class A {
        x = observable(1)

        constructor() {
            initializeObservables(this)
        }
    }

    class B extends A {
        y = observable(1)

        constructor() {
            super()
            initializeObservables(this)
        }
    }

    expect(mobx.keys(new B())).toEqual(["x", "y"])
})

test("actions are reassignable", () => {
    // See #1398 and #1545, make actions reassignable to support stubbing
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

test("map should structurally match ES6 Map", () => {
    // Including this line strictly for type checking.
    const m: Map<string, number> = mobx.observable.map({ a: 1, b: 2 })
    expect(true).toBe(true)
})

test("single arg when returns a promise", async () => {
    const x = mobx.observable.box(1)

    setTimeout(() => x.set(3), 200)
    await mobx.when(() => x.get() === 3)
})

test("single arg when returns a can timeout", async () => {
    const x = mobx.observable.box(1)

    setTimeout(() => x.set(3), 200)
    try {
        await mobx.when(() => x.get() === 3, { timeout: 100 })
        fail("should timeout")
    } catch (e) {
        expect("" + e).toMatch(/WHEN_TIMEOUT/)
    }
})

test("promised when can be cancelled", async () => {
    const x = mobx.observable.box(1)

    try {
        const p = mobx.when(() => x.get() === 3)
        setTimeout(() => p.cancel(), 100)
        await p
        fail("should cancel")
    } catch (e) {
        expect("" + e).toMatch(/WHEN_CANCELLED/)
    }
})

test("it should support asyncAction as decorator (ts)", async () => {
    mobx.configure({ enforceActions: "observed" })

    class X {
        a = observable(1)

        f = mobx.flow(function* f(this: X, initial: number) {
            this.a = initial // this runs in action
            this.a += yield Promise.resolve(5) as any
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

test("flow support async generators", async () => {
    if (!(Symbol as any).asyncIterator) {
        ;(Symbol as any).asyncIterator = Symbol.for("Symbol.asyncIterator")
    }

    async function* someNumbers() {
        await Promise.resolve()
        yield 1
        await Promise.resolve()
        yield 2
        await Promise.resolve()
        yield 3
    }

    const start = mobx.flow(async function*() {
        let total = 0
        for await (const number of someNumbers()) {
            total += number
        }
        return total
    })

    const p = start()
    const res = await p
    expect(res).toBe(6)
})

test("flow support throwing async generators", async () => {
    if (!(Symbol as any).asyncIterator) {
        ;(Symbol as any).asyncIterator = Symbol.for("Symbol.asyncIterator")
    }

    async function* someNumbers() {
        await Promise.resolve()
        yield 1
        await Promise.resolve()
        throw "OOPS"
    }

    const start = mobx.flow(async function*() {
        let total = 0
        for await (const number of someNumbers()) {
            total += number
        }
        return total
    })

    const p = start()
    try {
        await p
        fail()
    } catch (e) {
        expect("" + e).toBe("OOPS")
    }
})

test("toJS bug #1413 (TS)", () => {
    class X {
        test = observable({
            test1: 1
        })

        constructor() {
            initializeObservables(this)
        }
    }

    const x = new X()
    const res = mobx.toJS(x.test) as any
    expect(res).toEqual({ test1: 1 })
    expect(res.__mobxDidRunLazyInitializers).toBe(undefined)
})

test("verify #1528", () => {
    const appState = mobx.observable({
        timer: 0
    })

    expect(appState.timer).toBe(0)
})

test("type of flows that return promises", async () => {
    mobx.configure({ enforceActions: "observed" })

    const f = mobx.flow(function* f() {
        return Promise.resolve(5)
    })

    const n: number = await f()
    expect(n).toBe(5)
})

test("#2159 - computed property keys", () => {
    const testSymbol = Symbol("test symbol")
    const testString = "testString"

    class TestClass {
        [testSymbol] = observable("original symbol value");
        [testString] = observable("original string value")

        constructor() {
            initializeObservables(this)
        }
    }

    const o = new TestClass()

    const events: any[] = []
    observe(o, testSymbol, ev => events.push(ev.newValue, ev.oldValue))
    observe(o, testString, ev => events.push(ev.newValue, ev.oldValue))

    runInAction(() => {
        o[testSymbol] = "new symbol value"
        o[testString] = "new string value"
    })

    t.deepEqual(events, [
        "new symbol value", // new symbol
        "original symbol value", // original symbol
        "new string value", // new string
        "original string value" // original string
    ])
})

test("type inference of the action callback", () => {
    function test1arg(fn: (a: number) => any) {}

    function test2args(fn: (a: string, b: number) => any) {}

    function test7args(
        fn: (a: object, b: number, c: number, d: string, e: string, f: number, g: string) => any
    ) {}

    // Nameless actions
    test1arg(
        action(a1 => {
            assert<IsExact<typeof a1, number>>(true)
        })
    )
    test2args(
        action((a1, a2) => {
            assert<IsExact<typeof a1, string>>(true)
            assert<IsExact<typeof a2, number>>(true)
        })
    )
    test7args(
        action((a1, a2, a3, a4, a5, a6, a7) => {
            assert<IsExact<typeof a1, object>>(true)
            assert<IsExact<typeof a2, number>>(true)
            assert<IsExact<typeof a3, number>>(true)
            assert<IsExact<typeof a4, string>>(true)
            assert<IsExact<typeof a5, string>>(true)
            assert<IsExact<typeof a6, number>>(true)
            assert<IsExact<typeof a7, string>>(true)
        })
    )

    // Named actions
    test1arg(
        action("named action", a1 => {
            assert<IsExact<typeof a1, number>>(true)
        })
    )
    test2args(
        action("named action", (a1, a2) => {
            assert<IsExact<typeof a1, string>>(true)
            assert<IsExact<typeof a2, number>>(true)
        })
    )
    test7args(
        action("named action", (a1, a2, a3, a4, a5, a6, a7) => {
            assert<IsExact<typeof a1, object>>(true)
            assert<IsExact<typeof a2, number>>(true)
            assert<IsExact<typeof a3, number>>(true)
            assert<IsExact<typeof a4, string>>(true)
            assert<IsExact<typeof a5, string>>(true)
            assert<IsExact<typeof a6, number>>(true)
            assert<IsExact<typeof a7, string>>(true)
        })
    )

    // Promises
    Promise.resolve(1).then(
        action(arg => {
            assert<IsExact<typeof arg, number>>(true)
        })
    )

    // Promises with names actions
    Promise.resolve(1).then(
        action("named action", arg => {
            assert<IsExact<typeof arg, number>>(true)
        })
    )
})
