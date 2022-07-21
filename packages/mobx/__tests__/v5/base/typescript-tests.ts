"use strict"

import {
    observe,
    computed,
    observable,
    autorun,
    extendObservable,
    action,
    IArrayDidChange,
    IArrayWillChange,
    IArrayWillSplice,
    IMapWillChange,
    ISetWillChange,
    IObservableValue,
    isObservable,
    isObservableProp,
    isObservableObject,
    transaction,
    IObjectDidChange,
    spy,
    configure,
    isAction,
    makeObservable,
    IAtom,
    createAtom,
    runInAction,
    flow,
    IMapDidChange,
    IValueDidChange,
    ISetDidChange,
    IValueWillChange,
    flowResult,
    IObjectWillChange
} from "../../../src/mobx"
import * as mobx from "../../../src/mobx"
import { assert, IsExact } from "conditional-type-checks"

const v = observable.box(3)
observe(v, () => {})

const a = observable([1, 2, 3])

const testFunction = function (a: any) {}

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

test("decorators", () => {
    class Order {
        price: number = 3
        amount: number = 2
        orders: string[] = []
        aFunction = testFunction

        constructor() {
            makeObservable(this, {
                price: observable,
                amount: observable,
                orders: observable,
                aFunction: observable,
                total: computed
            })
        }

        get total() {
            return this.amount * this.price * (1 + this.orders.length)
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
    const d1 = observe(o, (ev: IObjectDidChange) => events.push(ev.name, (ev as any).oldValue))
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
    const b = computed(() => a.get() * 2)
    t.equal(b.get(), 6)
})

test("annotations", () => {
    const fn0 = () => 0
    class Order {
        price: number = 3
        amount: number = 2
        orders: string[] = []
        aFunction = fn0

        constructor() {
            makeObservable(this, {
                price: observable,
                amount: observable,
                orders: observable,
                aFunction: observable,
                total: computed
            })
        }

        get total() {
            return this.amount * this.price * (1 + this.orders.length)
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
    expect(isAction(order1.aFunction)).toBe(true)
    expect(order1.aFunction()).toBe(0)
    order1.aFunction = () => 1
    expect(isAction(order1.aFunction)).toBe(true)
    expect(order1.aFunction()).toBe(1)
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

    const Thing = function (this: any) {
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

test("box", () => {
    class Box {
        uninitialized: any
        height = 20
        sizes = [2]
        someFunc = function () {
            return 2
        }

        constructor() {
            makeObservable(this, {
                uninitialized: observable,
                height: observable,
                sizes: observable,
                someFunc: observable,
                width: computed,
                addSize: action
            })
        }

        get width() {
            return this.height * this.sizes.length * this.someFunc() * (this.uninitialized ? 2 : 1)
        }
        addSize() {
            this.sizes.push(3)
            this.sizes.push(4)
        }
    }

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

    const x: IObservableValue<number> = observable.box(3)
})

test("computed setter should succeed", () => {
    class Bla {
        a = 3

        constructor() {
            makeObservable(this, {
                a: observable,
                propX: computed
            })
        }

        get propX() {
            return this.a * 2
        }
        set propX(v) {
            this.a = v
        }
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
        x = 3
        y = 3

        constructor() {
            makeObservable(this, {
                x: observable,
                y: observable,
                boxedSum: computed.struct
            })
        }

        get boxedSum() {
            return { sum: Math.round(this.x) + Math.round(this.y) }
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
            makeObservable(this, {
                isWrong: computed,
                isSelected: computed
            })
        }

        get isWrong() {
            return report(
                "Computing isWrong for card " + this.id,
                this.isSelected && this.game.isMatchWrong
            )
        }

        get isSelected() {
            return report(
                "Computing isSelected for card" + this.id,
                this.game.firstCardSelected === this || this.game.secondCardSelected === this
            )
        }
    }

    class Game {
        firstCardSelected: Card | null = null
        secondCardSelected: Card | null = null

        constructor() {
            makeObservable(this, {
                firstCardSelected: observable,
                secondCardSelected: observable,
                isMatchWrong: computed
            })
        }

        get isMatchWrong() {
            return report(
                "Computing isMatchWrong",
                this.secondCardSelected !== null &&
                    this.firstCardSelected!.id !== this.secondCardSelected.id
            )
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
        obj = { a: 1 }
        array = [2]

        constructor() {
            makeObservable(this, {
                obj: observable,
                array: observable
            })
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
        constructor(private multiplier: number) {
            makeObservable(this, {
                add: action
            })
        }

        add(a: number, b: number): number {
            return (a + b) * this.multiplier
        }
    }

    const store1 = new Store(2)
    const store2 = new Store(3)
    const events: any[] = []
    const d = spy(events.push.bind(events))
    t.equal(store1.add(3, 4), 14)
    t.equal(store2.add(2, 2), 12)
    t.equal(store1.add(1, 1), 4)

    t.deepEqual(normalizeSpyEvents(events), [
        { arguments: [3, 4], name: "add", spyReportStart: true, object: store1, type: "action" },
        { type: "report-end", spyReportEnd: true },
        { arguments: [2, 2], name: "add", spyReportStart: true, object: store2, type: "action" },
        { type: "report-end", spyReportEnd: true },
        { arguments: [1, 1], name: "add", spyReportStart: true, object: store1, type: "action" },
        { type: "report-end", spyReportEnd: true }
    ])

    d()
})

test("custom action decorator (typescript)", () => {
    class Store {
        constructor(private multiplier: number) {
            makeObservable(this, {
                add: action("zoem zoem")
            })
        }

        add(a: number, b: number): number {
            return (a + b) * this.multiplier
        }
    }

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
        { type: "report-end", spyReportEnd: true },
        {
            arguments: [2, 2],
            name: "zoem zoem",
            spyReportStart: true,
            object: store2,
            type: "action"
        },
        { type: "report-end", spyReportEnd: true },
        {
            arguments: [1, 1],
            name: "zoem zoem",
            spyReportStart: true,
            object: store1,
            type: "action"
        },
        { type: "report-end", spyReportEnd: true }
    ])

    d()
})

test("action decorator on field (typescript)", () => {
    class Store {
        constructor(private multiplier: number) {
            makeObservable(this, {
                add: action
            })
        }

        add = (a: number, b: number) => {
            return (a + b) * this.multiplier
        }
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
        { type: "report-end", spyReportEnd: true },
        { arguments: [4, 5], name: "add", spyReportStart: true, object: store2, type: "action" },
        { type: "report-end", spyReportEnd: true },
        { arguments: [2, 2], name: "add", spyReportStart: true, object: store1, type: "action" },
        { type: "report-end", spyReportEnd: true }
    ])

    d()
})

test("custom action decorator on field (typescript)", () => {
    class Store {
        constructor(private multiplier: number) {
            makeObservable(this, {
                add: action("zoem zoem")
            })
        }

        add = (a: number, b: number) => {
            return (a + b) * this.multiplier
        }
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
        { type: "report-end", spyReportEnd: true },
        {
            arguments: [4, 5],
            name: "zoem zoem",
            spyReportStart: true,
            object: store2,
            type: "action"
        },
        { type: "report-end", spyReportEnd: true },
        {
            arguments: [2, 2],
            name: "zoem zoem",
            spyReportStart: true,
            object: store1,
            type: "action"
        },
        { type: "report-end", spyReportEnd: true }
    ])

    d()
})

test("267 (typescript) should be possible to declare properties observable outside strict mode", () => {
    configure({ enforceActions: "observed" })

    class Store {
        timer: number | null = null

        constructor() {
            makeObservable(this, {
                timer: observable
            })
        }
    }

    configure({ enforceActions: "never" })
})

test("288 atom not detected for object property", () => {
    class Store {
        foo = ""

        constructor() {
            makeObservable(this, {
                foo: observable
            })
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

test.skip("observable performance - ts", () => {
    const AMOUNT = 100000

    class A {
        a = 1
        b = 2
        c = 3

        constructor() {
            makeObservable(this, {
                a: observable,
                b: observable,
                c: observable,
                d: computed
            })
        }

        get d() {
            return this.a + this.b + this.c
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

test.skip("observable performance - ts - decorators", () => {
    const AMOUNT = 100000

    class A {
        @observable
        a = 1
        @observable
        b = 2
        @observable
        c = 3

        constructor() {
            makeObservable(this)
        }

        @computed
        get d() {
            return this.a + this.b + this.c
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
        constructor() {
            makeObservable(this, {
                m1: action,
                m2: action
            })
        }

        // shared across all instances
        m1() {}

        // per instance
        m2 = () => {}
    }

    const a1 = new A()
    const a2 = new A()

    t.equal(a1.m1, a2.m1)
    t.notEqual(a1.m2, a2.m2)
    // eslint-disable-next-line
    t.equal(a1.hasOwnProperty("m1"), false)
    // eslint-disable-next-line
    t.equal(a1.hasOwnProperty("m2"), true)
    // eslint-disable-next-line
    t.equal(a2.hasOwnProperty("m1"), false)
    // eslint-disable-next-line
    t.equal(a2.hasOwnProperty("m2"), true)
})

test("inheritance", () => {
    class A {
        a = 2

        constructor() {
            makeObservable(this, {
                a: observable
            })
        }
    }

    class B extends A {
        b = 3

        constructor() {
            super()

            makeObservable(this, {
                b: observable,
                c: computed
            })
        }

        get c() {
            return this.a + this.b
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
        a = 2

        constructor() {
            makeObservable(this, {
                a: observable
            })
        }
    }

    class B {
        a = 5
        b = 3

        constructor() {
            makeObservable(this, {
                a: observable,
                b: observable,
                c: computed
            })
        }

        get c() {
            return this.a + this.b
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
        a = 3
        b = this.a + 2

        constructor() {
            makeObservable(this, {
                a: observable,
                b: observable,
                c: computed,
                d: computed
            })
        }

        get c() {
            return this.a + this.b
        }
        get d() {
            return this.c + 1
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
        a = 1 // enumerable, on proto

        constructor() {
            makeObservable(this, {
                a: observable,
                b: computed,
                m: action,
                m2: action
            })
        }

        get b() {
            return this.a
        } // non-enumerable, (and, ideally, on proto)
        m() {} // non-enumerable, on proto
        m2 = () => {} // non-enumerable, on self
    }

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
    // eslint-disable-next-line
    t.equal(a.hasOwnProperty("a"), true)
    // eslint-disable-next-line
    t.equal(a.hasOwnProperty("b"), true) // false would be slightly better, true also ok-ish, and, see #1777
    // eslint-disable-next-line
    t.equal(a.hasOwnProperty("m"), false)
    // eslint-disable-next-line
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
    // eslint-disable-next-line
    t.equal(a.hasOwnProperty("a"), true)
    // eslint-disable-next-line
    t.equal(a.hasOwnProperty("b"), true) // false would be slightly better, true also ok-ish, and, see #1777
    // eslint-disable-next-line
    t.equal(a.hasOwnProperty("m"), false)
    // eslint-disable-next-line
    t.equal(a.hasOwnProperty("m2"), true)
})

test("issue 285 (typescript)", () => {
    const { observable, toJS } = mobx

    class Todo {
        id = 1
        title: string
        finished = false
        childThings = [1, 2, 3]
        constructor(title: string) {
            makeObservable(this, {
                title: observable,
                finished: observable,
                childThings: observable
            })

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
        title = "test"

        constructor() {
            makeObservable(this, {
                title: observable,
                upperCase: computed
            })
        }

        get upperCase() {
            return this.title.toUpperCase()
        }
    }

    t.deepEqual((Object as any).assign({}, new Todo()), {
        title: "test"
    })
})

test("379, inheritable actions (typescript)", () => {
    class A {
        constructor() {
            makeObservable(this, {
                method: action
            })
        }

        method() {
            return 42
        }
    }

    class B extends A {
        method() {
            return super.method() * 2
        }
    }

    class C extends B {
        method() {
            return super.method() + 3
        }
    }

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
        get computedVal() {
            return 3
        }
        constructor() {
            makeObservable(this, {
                computedVal: computed
            })

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
        a = 1
        constructor() {
            makeObservable(this, {
                a: observable
            })

            values.b = (this as any)["b"]
            values.a = this.a
        }
    }

    class B extends A {
        b = 2

        constructor() {
            super()

            makeObservable(this, {
                b: observable
            })
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

test("705 - setter undoing caching (typescript)", () => {
    let recomputes = 0
    let autoruns = 0

    class Person {
        name: string = ""
        title: string = ""

        constructor() {
            makeObservable(this, {
                name: observable,
                title: observable,
                fullName: computed
            })
        }

        // Typescript bug: if fullName is before the getter, the property is defined twice / incorrectly, see #705
        // set fullName(val) {
        // 	// Noop
        // }
        get fullName() {
            recomputes++
            return this.title + " " + this.name
        }
        // Should also be possible to define the setter _before_ the fullname
        set fullName(val) {
            // Noop
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
        ref = { a: 3 }

        constructor() {
            makeObservable(this, {
                ref: observable.ref
            })
        }
    }

    const a = new A()
    t.equal(a.ref.a, 3)
    t.equal(mobx.isObservable(a.ref), false)
    t.equal(mobx.isObservableProp(a, "ref"), true)
})

test("@observable.shallow (TS)", () => {
    class A {
        arr = [{ todo: 1 }]

        constructor() {
            makeObservable(this, {
                arr: observable.shallow
            })
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
        arr = [{ todo: 1 }]

        constructor() {
            makeObservable(this, {
                arr: observable.deep
            })
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
        x = 0

        constructor() {
            makeObservable(this, {
                x: observable,
                inc: action.bound
            })
        }

        inc(value: number) {
            this.x += value
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

    const bound2 = action(function () {}) as () => void
})

test("@computed.equals (TS)", () => {
    const sameTime = (from: Time, to: Time) => from.hour === to.hour && from.minute === to.minute
    class Time {
        constructor(hour: number, minute: number) {
            makeObservable(this, {
                hour: observable,
                minute: observable,
                time: computed({ equals: sameTime })
            })

            this.hour = hour
            this.minute = minute
        }

        public hour: number
        public minute: number

        public get time() {
            return { hour: this.hour, minute: this.minute }
        }
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
        constructor(public hour: number, public minute: number) {
            makeObservable(this, {
                hour: observable,
                minute: observable,
                time: computed({ equals: sameTime })
            })
        }

        get time() {
            return { hour: this.hour, minute: this.minute }
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

test("computed comparer works with decorate (TS)", () => {
    const sameTime = (from: Time, to: Time) => from.hour === to.hour && from.minute === to.minute
    class Time {
        constructor(public hour: number, public minute: number) {
            makeObservable(this, {
                hour: observable,
                minute: observable,
                time: computed({ equals: sameTime })
            })
        }

        get time() {
            return { hour: this.hour, minute: this.minute }
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
        loginCount?: number

        constructor() {
            makeObservable(this, {
                loginCount: observable
            })
        }
    }

    const user = new User()
    observe(user, "loginCount", () => {})
})

test("typescript - decorate works with classes", () => {
    class Box {
        height: number = 2

        constructor() {
            makeObservable(this, {
                height: observable
                // size: observable // MWE: enabling this should give type error!
            })
        }
    }

    const b = new Box()
    expect(b.height).toBe(2)
    expect(mobx.isObservableProp(b, "height")).toBe(true)
})

test("typescript - decorate works with objects", () => {
    const b = observable(
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

    makeObservable(Box, {
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

test("unobserved computed reads should warn with requiresReaction enabled", () => {
    const consoleWarn = console.warn
    const warnings: string[] = []
    console.warn = function (...args) {
        warnings.push(...args)
    }
    try {
        const expectedWarnings: string[] = []

        class A {
            x = 0
            get y() {
                return this.x * 2
            }
            constructor() {
                makeObservable(
                    this,
                    {
                        x: observable,
                        y: computed({ requiresReaction: true })
                    },
                    { name: "a" }
                )
            }
        }

        const a = new A()

        a.y
        expectedWarnings.push(
            `[mobx] Computed value 'a.y' is being read outside a reactive context. Doing a full recompute.`
        )

        const d = mobx.reaction(
            () => a.y,
            () => {}
        )

        a.y

        d()

        a.y
        expectedWarnings.push(
            `[mobx] Computed value 'a.y' is being read outside a reactive context. Doing a full recompute.`
        )

        expect(warnings).toEqual(expectedWarnings)
    } finally {
        console.warn = consoleWarn
    }
})

test("multiple inheritance should work", () => {
    class A {
        x = 1

        constructor() {
            makeObservable(this, {
                x: observable
            })
        }
    }

    class B extends A {
        y = 1

        constructor() {
            super()

            makeObservable(this, {
                y: observable
            })
        }
    }

    expect(mobx.keys(new B())).toEqual(["x", "y"])
})

// 19.12.2020 @urugator:
// All annotated non-observable fields are not writable.
// All annotated fields of non-plain objects are non-configurable.
// https://github.com/mobxjs/mobx/pull/2641
test.skip("actions are reassignable", () => {
    // See #1398 and #1545, make actions reassignable to support stubbing
    class A {
        constructor() {
            makeObservable(this, {
                m1: action,
                m2: action,
                m3: action.bound,
                m4: action.bound
            })
        }

        m1() {}
        m2 = () => {}
        m3() {}
        m4 = () => {}
    }

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
        a = 1

        f = mobx.flow(function* f(this: X, initial: number) {
            this.a = initial // this runs in action
            this.a += yield Promise.resolve(5) as any
            this.a = this.a * 2
            return this.a
        })

        constructor() {
            makeObservable(this, {
                a: observable
            })
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

    const start = mobx.flow(async function* () {
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

    const start = mobx.flow(async function* () {
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

test("allow 'as const' for creating tuples for map.replace()", () => {
    const map = mobx.observable.map<string, number>()
    const srcValues = mobx.observable.array<string>()
    const newValues = Array.from(srcValues, (value, index) => [value, index] as const)

    map.replace(newValues)
})

test("allow 'as const' for creating tuples for observable.map()", () => {
    const srcValues = mobx.observable.array<string>()
    const newValues = Array.from(srcValues, (value, index) => [value, index] as const)

    mobx.observable.map(newValues)
})

test("toJS bug #1413 (TS)", () => {
    class X {
        test = {
            test1: 1
        }

        constructor() {
            makeObservable(this, {
                test: observable
            })
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
        [testSymbol] = "original symbol value";
        [testString] = "original string value"

        constructor() {
            makeObservable(this, {
                [testSymbol]: observable,
                [testString]: observable
            })
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

    // optional
    const optionalActionTypeInfer: {
        a?: (a1: number, a2: string, a3: boolean) => void
    } = {
        a: action((a1, a2, a3) => {
            assert<IsExact<typeof a1, number>>(true)
            assert<IsExact<typeof a2, string>>(true)
            assert<IsExact<typeof a3, boolean>>(true)
        })
    }

    // optional with names actions
    const optionalNamedActionTypeInfer: {
        a?: (a1: number, a2: string, a3: boolean) => void
    } = {
        a: action("named action", (a1, a2, a3) => {
            assert<IsExact<typeof a1, number>>(true)
            assert<IsExact<typeof a2, string>>(true)
            assert<IsExact<typeof a3, boolean>>(true)
        })
    }
})

test("TS - type inference of Set", () => {
    const set = observable.set<number>()
    set.add(1)
    set.has(1)
    set.delete(1)
    // @ts-expect-error
    set.add("1")
    // @ts-expect-error
    set.has("1")
    // @ts-expect-error
    set.delete("1")
})

test("TS - type inference of observe & intercept functions", () => {
    const array = [1, 2]
    const object = { numberKey: 1, stringKey: "string" }
    const map = new Map([["testKey", 1]])
    const set = new Set([1])

    const { regularArray, regularObject, regularMap, regularSet } = observable({
        regularArray: array,
        regularObject: object,
        regularMap: map,
        regularSet: set
    })

    const observableArray = observable(array)
    const observableObject = observable(object)
    const observableMap = observable(map)
    const observableSet = observable(set)

    // Array
    mobx.observe(regularArray, argument => {
        assert<IsExact<typeof argument, IArrayDidChange<number>>>(true)
    })
    mobx.intercept(regularArray, argument => {
        assert<IsExact<typeof argument, IArrayWillChange<number> | IArrayWillSplice<number>>>(true)
        return argument
    })
    // ObservableArray
    mobx.observe(observableArray, argument => {
        assert<IsExact<typeof argument, IArrayDidChange<number>>>(true)
    })
    mobx.intercept(observableArray, argument => {
        assert<IsExact<typeof argument, IArrayWillChange<number> | IArrayWillSplice<number>>>(true)
        return argument
    })
    // Object
    mobx.observe(regularObject, argument => {
        assert<IsExact<typeof argument, IObjectDidChange>>(true)
    })
    mobx.intercept(regularObject, argument => {
        assert<IsExact<typeof argument, IObjectWillChange>>(true)
        return argument
    })
    mobx.observe(regularObject, "numberKey", argument => {
        assert<IsExact<typeof argument, IValueDidChange<number>>>(true)
    })
    mobx.intercept(regularObject, "numberKey", argument => {
        assert<IsExact<typeof argument, IValueWillChange<number>>>(true)
        return argument
    })
    // ObservableObject
    mobx.observe(observableObject, argument => {
        assert<IsExact<typeof argument, IObjectDidChange>>(true)
    })
    mobx.intercept(observableObject, argument => {
        assert<IsExact<typeof argument, IObjectWillChange>>(true)
        return argument
    })
    mobx.observe(observableObject, "numberKey", argument => {
        assert<IsExact<typeof argument, IValueDidChange<number>>>(true)
    })
    mobx.intercept(observableObject, "numberKey", argument => {
        assert<IsExact<typeof argument, IValueWillChange<number>>>(true)
        return argument
    })
    // Map
    mobx.observe(regularMap, argument => {
        assert<IsExact<typeof argument, IMapDidChange<string, number>>>(true)
    })
    mobx.intercept(regularMap, argument => {
        assert<IsExact<typeof argument, IMapWillChange<string, number>>>(true)
        return argument
    })
    mobx.observe(regularMap, "testKey", argument => {
        assert<IsExact<typeof argument, IValueDidChange<number>>>(true)
    })
    mobx.intercept(regularMap, "testKey", argument => {
        assert<IsExact<typeof argument, IValueWillChange<number>>>(true)
        return argument
    })
    // ObservableMap
    mobx.observe(observableMap, argument => {
        assert<IsExact<typeof argument, IMapDidChange<string, number>>>(true)
    })
    mobx.intercept(observableMap, argument => {
        assert<IsExact<typeof argument, IMapWillChange<string, number>>>(true)
        return argument
    })
    mobx.observe(observableMap, "testKey", argument => {
        assert<IsExact<typeof argument, IValueDidChange<number>>>(true)
    })
    mobx.intercept(observableMap, "testKey", argument => {
        assert<IsExact<typeof argument, IValueWillChange<number>>>(true)
        return argument
    })
    // Set
    mobx.observe(regularSet, argument => {
        assert<IsExact<typeof argument, ISetDidChange<number>>>(true)
    })
    mobx.intercept(regularSet, argument => {
        assert<IsExact<typeof argument, ISetWillChange<number>>>(true)
        return argument
    })
    // ObservableSet
    mobx.observe(observableSet, argument => {
        assert<IsExact<typeof argument, ISetDidChange<number>>>(true)
    })
    mobx.intercept(observableSet, argument => {
        assert<IsExact<typeof argument, ISetWillChange<number>>>(true)
        return argument
    })
})

test("TS - type inference of reaction opts.equals", () => {
    const data = observable({ a: 23 })
    mobx.reaction(
        () => data.a,
        a => {},
        {
            equals: (a, b) => {
                assert<IsExact<typeof a, string>>(false)
                assert<IsExact<typeof b, string>>(false)
                assert<IsExact<typeof a, number>>(true)
                assert<IsExact<typeof b, number>>(true)
                return a === b
            }
        }
    )
})

test("TS - it should support flow as function wrapper", done => {
    const values: number[] = []

    mobx.configure({ enforceActions: "observed" })

    class X {
        a = 1

        constructor() {
            makeObservable(this, {
                a: true
            })
        }

        f = flow(function* f(this: X, initial) {
            this.a = initial // this runs in action
            try {
                this.a = yield delay(100, 5, true) // and this as well!
                yield delay(100, 0)
                this.a = 4
            } catch (e) {
                this.a = e as number
            }
            return this.a
        })
    }

    const x = new X()
    mobx.reaction(
        () => x.a,
        v => values.push(v),
        { fireImmediately: true }
    )

    const x2 = new X()
    expect(x2.f).not.toBe(x.f) // not shared!

    setTimeout(() => {
        x.f(2).then(v => {
            let _x: number = v
            // @ts-expect-error
            let _y: string = v
            expect(v).toBe(5)
            expect(values).toEqual([1, 2, 5])
            expect(x.a).toBe(5)
            done()
        })
    }, 10)
})

test("TS - it should support flow as annotation", done => {
    const values: number[] = []

    mobx.configure({ enforceActions: "observed" })

    class X {
        a = 1

        constructor() {
            makeObservable(this, {
                a: true,
                f: flow
            })
        }

        *f(initial) {
            this.a = initial // this runs in action
            try {
                this.a = yield delay(100, 5, true) // and this as well!
                yield delay(100, 0)
                this.a = 4
            } catch (e) {
                this.a = e as number
            }
            return this.a
        }
    }

    const x = new X()
    mobx.reaction(
        () => x.a,
        v => values.push(v),
        { fireImmediately: true }
    )

    const x2 = new X()
    expect(x2.f).toBe(x.f) // shared!

    setTimeout(() => {
        // Too bad...
        flowResult(x.f(2)).then(v => {
            let _x: number = v
            // @ts-expect-error
            let _y: string = v
            expect(v).toBe(5)
            expect(values).toEqual([1, 2, 5])
            expect(x.a).toBe(5)
            done()
        })
    }, 10)
})

test("TS - it should support flow as decorator", done => {
    const values: number[] = []

    mobx.configure({ enforceActions: "observed" })

    class X {
        @observable
        a = 1

        constructor() {
            makeObservable(this)
        }

        @flow
        *f(initial) {
            this.a = initial // this runs in action
            try {
                this.a = yield delay(100, 5, true) // and this as well!
                yield delay(100, 0)
                this.a = 4
            } catch (e) {
                this.a = e as number
            }
            return this.a
        }
    }

    const x = new X()
    mobx.reaction(
        () => x.a,
        v => values.push(v),
        { fireImmediately: true }
    )

    const x2 = new X()
    expect(x2.f).toBe(x.f) // shared!

    setTimeout(() => {
        // Too bad...
        flowResult(x.f(2)).then(v => {
            let _x: number = v
            // @ts-expect-error
            let _y: string = v
            expect(v).toBe(5)
            expect(values).toEqual([1, 2, 5])
            expect(x.a).toBe(5)
            done()
        })
    }, 10)
})

function delay(time, value, shouldThrow = false) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (shouldThrow) reject(value)
            else resolve(value)
        }, time)
    })
}

test("#2485", () => {
    class Color {
        public constructor(r: number, g: number, b: number, a?: number) {
            makeObservable<Color, "_r" | "_g" | "_b" | "_a">(this, {
                _r: observable,
                r: computed,
                _g: observable,
                g: computed,
                _b: observable,
                b: computed,
                _a: observable,
                a: computed
            })

            this._r = r
            this._g = g
            this._b = b
            this._a = a ?? 1
        }

        private _r: number
        public get r(): number {
            return this._r
        }

        private _g: number
        public get g(): number {
            return this._g
        }

        private _b: number
        public get b(): number {
            return this._b
        }

        private _a: number
        public get a(): number {
            return this._a
        }

        public stuff(): boolean {
            return true
        }

        public toString(): string {
            return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`
        }

        public toJSON(): number {
            return 3
        }
    }

    expect(new Color(1, 2, 3, 4).toString()).toMatchInlineSnapshot(`"rgba(1, 2, 3, 4)"`)
})

test("argumentless observable adds undefined to the output type", () => {
    const a = observable.box<string>()
    assert<IsExact<typeof a, IObservableValue<string | undefined>>>(true)
})

test("with initial value observable does not adds undefined to the output type", () => {
    const a = observable.box<string>("hello")
    assert<IsExact<typeof a, IObservableValue<string>>>(true)
})

test("observable.box should keep track of undefined and null in type", () => {
    const a = observable.box<string | undefined>()
    assert<IsExact<typeof a, IObservableValue<string | undefined>>>(true)
})
