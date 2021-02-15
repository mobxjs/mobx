const mobx = require("../../../src/mobx.ts")
const m = mobx

const { $mobx } = mobx

test("treeD", function () {
    m._resetGlobalState()
    mobx._getGlobalState().mobxGuid = 0
    const a = m.observable.box(3)
    const aName = "ObservableValue@1"

    const dtree = m.getDependencyTree
    expect(dtree(a)).toEqual({
        name: aName
    })

    const b = m.computed(() => a.get() * a.get())
    const bName = "ComputedValue@2"
    expect(dtree(b)).toEqual({
        name: bName
        // no dependencies yet, since it isn't observed yet
    })

    const c = m.autorun(() => b.get())
    const cName = "Autorun@3"
    expect(dtree(c[$mobx])).toEqual({
        name: cName,
        dependencies: [
            {
                name: bName,
                dependencies: [
                    {
                        name: aName
                    }
                ]
            }
        ]
    })

    expect(aName !== bName).toBeTruthy()
    expect(bName !== cName).toBeTruthy()

    expect(m.getObserverTree(a)).toEqual({
        name: aName,
        observers: [
            {
                name: bName,
                observers: [
                    {
                        name: cName
                    }
                ]
            }
        ]
    })

    const x = mobx.observable.map({ temperature: 0 })
    const d = mobx.autorun(function () {
        Array.from(x.keys())
        if (x.has("temperature")) x.get("temperature")
        x.has("absent")
    })

    expect(m.getDependencyTree(d[$mobx])).toEqual({
        name: "Autorun@5",
        dependencies: [
            {
                name: "ObservableMap@4.keys()"
            },
            {
                name: "ObservableMap@4.temperature?"
            },
            {
                name: "ObservableMap@4.temperature"
            },
            {
                name: "ObservableMap@4.absent?"
            }
        ]
    })
})

test("names", function () {
    m._resetGlobalState()
    mobx._getGlobalState().mobxGuid = 0

    const struct = {
        x: "ObservableValue@1",
        y: {
            z: 7
        },
        ar: [
            4,
            {
                w: 5
            }
        ]
    }

    const rstruct = m.observable(struct)
    m.extendObservable(rstruct.y, { a: { b: 2 } })
    rstruct.ar.push({ b: 2 })
    rstruct.ar.push([])
    expect(rstruct[$mobx].values_.get("x").name_).toBe("ObservableObject@1.x")
    expect(rstruct[$mobx].values_.get("y").name_).toBe("ObservableObject@1.y")
    expect(rstruct.y[$mobx].values_.get("z").name_).toBe("ObservableObject@1.y.z")
    expect(rstruct[$mobx].values_.get("ar").name_).toBe("ObservableObject@1.ar")
    expect(rstruct.ar[$mobx].atom_.name_).toBe("ObservableObject@1.ar")
    expect(rstruct.ar[1][$mobx].values_.get("w").name_).toBe("ObservableObject@1.ar[..].w")
    expect(rstruct.y.a[$mobx].values_.get("b").name_).toBe("ObservableObject@1.y.a.b")
    expect(rstruct.ar[2][$mobx].values_.get("b").name_).toBe("ObservableObject@1.ar[..].b")

    const d = m.autorun(function () {})
    expect(d[$mobx].name_).toBeTruthy()

    expect(m.autorun(function namedFunction() {})[$mobx].name_).toBe("namedFunction")

    expect(m.computed(function () {})).toBeTruthy()

    expect(m.computed(function namedFunction() {}).name_).toBe("namedFunction")

    function Task() {
        m.extendObservable(this, {
            title: "test"
        })
    }

    const task = new Task()
    expect(task[$mobx].name_).toBe("Task@4")
    expect(task[$mobx].values_.get("title").name_).toBe("Task@4.title")
})

function stripTrackerOutput(output) {
    return output.map(function (i) {
        if (Array.isArray(i)) return stripTrackerOutput(i)
        delete i.object
        delete i.time
        delete i.fn
        return i
    })
}

test("spy 1", function () {
    m._resetGlobalState()
    const lines = []

    const a = m.observable.box(3)
    const b = m.computed(function () {
        return a.get() * 2
    })
    m.autorun(function () {
        b.get()
    })
    const stop = m.spy(function (line) {
        lines.push(line)
    })

    a.set(4)
    stop()
    a.set(5)
    expect(stripTrackerOutput(lines)).toMatchSnapshot()
})

test("get atom", function () {
    mobx._resetGlobalState()
    mobx._getGlobalState().mobxGuid = 0 // hmm dangerous reset?

    function Clazz() {
        mobx.extendObservable(this, {
            a: 17
        })
    }

    const a = mobx.observable.box(3)
    const b = mobx.observable({ a: 3 })
    const c = mobx.observable.map({ a: 3 })
    const d = mobx.observable([1, 2])
    const e = mobx.computed(() => 3)
    const f = mobx.autorun(() => c.has("b"))
    const g = new Clazz()

    function atom(thing, prop) {
        return mobx.getAtom(thing, prop).constructor.name_
    }

    const ovClassName = mobx.observable.box(3).constructor.name_
    const atomClassName = mobx.createAtom("test").constructor.name_
    // const reactionClassName = mobx.Reaction.name_

    expect(atom(a)).toBe(ovClassName)

    expect(atom(b, "a")).toBe(ovClassName)
    expect(() => atom(b)).toThrowError(/please specify a property/)
    expect(() => atom(b, "b")).toThrowError(
        /no observable property 'b' found on the observable object 'ObservableObject@2'/
    )

    expect(atom(c)).toBe(atomClassName) // returns ke, "bla".constructor, === "Atomys
    expect(atom(c, "a")).toBe(ovClassName) // returns ent, "bla".constructor, === "Atomry
    expect(atom(c, "b")).toBe(ovClassName) // returns has entry (see autoru, "bla", "Atomn)
    expect(() => atom(c, "c")).toThrowError(
        /the entry 'c' does not exist in the observable map 'ObservableMap@3'/
    )

    expect(atom(d)).toBe(atomClassName)
    expect(() => atom(d, 0)).toThrowError(/It is not possible to get index atoms from arrays/)

    expect(atom(e)).toBe(mobx.computed(() => {}).constructor.name_)
    expect(atom(f)).toBe(mobx.Reaction.name_)

    expect(() => atom(g)).toThrowError(/please specify a property/)
    expect(atom(g, "a")).toBe(ovClassName)

    f()
})

test("get debug name", function () {
    mobx._resetGlobalState()
    mobx._getGlobalState().mobxGuid = 0 // hmm dangerous reset?

    function Clazz() {
        mobx.extendObservable(this, {
            a: 17
        })
    }

    const a = mobx.observable.box(3)
    const b = mobx.observable({ a: 3 })
    const c = mobx.observable.map({ a: 3 })
    const d = mobx.observable([1, 2])
    const e = mobx.computed(() => 3)
    const f = mobx.autorun(() => c.has("b"))
    const g = new Clazz()

    function name(thing, prop) {
        return mobx.getDebugName(thing, prop)
    }

    expect(name(a)).toBe("ObservableValue@1")

    expect(name(b, "a")).toBe("ObservableObject@2.a")
    expect(() => name(b, "b")).toThrowError(
        /no observable property 'b' found on the observable object 'ObservableObject@2'/
    )

    expect(name(c)).toBe("ObservableMap@3") // returns ke, "bla"ys
    expect(name(c, "a")).toBe("ObservableMap@3.a") // returns ent, "bla"ry
    expect(name(c, "b")).toBe("ObservableMap@3.b?") // returns has entry (see autoru, "bla"n)
    expect(() => name(c, "c")).toThrowError(
        /the entry 'c' does not exist in the observable map 'ObservableMap@3'/
    )

    expect(name(d)).toBe("ObservableArray@4")
    expect(() => name(d, 0)).toThrowError(/It is not possible to get index atoms from arrays/)

    expect(name(e)).toBe("ComputedValue@5")
    expect(name(f)).toBe("Autorun@6")

    expect(name(g)).toBe("Clazz@7")
    expect(name(g, "a")).toBe("Clazz@7.a")

    f()
})

test("get administration", function () {
    mobx._resetGlobalState()
    mobx._getGlobalState().mobxGuid = 0 // hmm dangerous reset?

    function Clazz() {
        mobx.extendObservable(this, {
            a: 17
        })
    }

    const a = mobx.observable.box(3)
    const b = mobx.observable({ a: 3 })
    const c = mobx.observable.map({ a: 3 })
    const d = mobx.observable([1, 2])
    const e = mobx.computed(() => 3)
    const f = mobx.autorun(() => c.has("b"))
    const g = new Clazz()
    const h = {}
    mobx.extendObservable(h, { a: 3 })

    function adm(thing, prop) {
        return mobx._getAdministration(thing, prop).constructor.name_
    }

    const ovClassName = mobx.observable.box(3).constructor.name_
    const mapClassName = mobx.observable.map().constructor.name_

    expect(adm(a)).toBe(ovClassName)

    expect(adm(b, "a")).toBe(ovClassName)
    expect(adm(b)).toBe(b[$mobx].constructor.name_)
    expect(() => adm(b, "b")).toThrowError(
        /no observable property 'b' found on the observable object 'ObservableObject@2'/
    )
    expect(adm(h, "a")).toBe(ovClassName)
    expect(adm(h)).toBe(h[$mobx].constructor.name_)
    expect(() => adm(h, "b")).toThrowError(
        /no observable property 'b' found on the observable object 'ObservableObject@8'/
    )

    expect(adm(c)).toBe(mapClassName)
    expect(adm(c, "a")).toBe(ovClassName)
    expect(adm(c, "b")).toBe(ovClassName)
    expect(() => adm(c, "c")).toThrowError(
        /the entry 'c' does not exist in the observable map 'ObservableMap@3'/
    )

    expect(adm(d)).toBe(d[$mobx].constructor.name_)
    expect(() => adm(d, 0)).toThrowError(/It is not possible to get index atoms from arrays/)

    expect(adm(e)).toBe(mobx.computed(() => {}).constructor.name_)
    expect(adm(f)).toBe(mobx.Reaction.name_)

    expect(adm(g)).toBe(h[$mobx].constructor.name_)
    expect(adm(g, "a")).toBe(ovClassName)
})

test("onBecome(Un)Observed simple", () => {
    const x = mobx.observable.box(3)
    const events = []

    mobx.onBecomeObserved(x, () => {
        events.push("x observed")
    })
    mobx.onBecomeUnobserved(x, () => {
        events.push("x unobserved")
    })

    expect(events.length).toBe(0) // nothing happened yet
    x.get()
    expect(events.length).toBe(0) // nothing happened yet
    x.set(4)
    expect(events.length).toBe(0) // nothing happened yet

    const d5 = mobx.reaction(
        () => x.get(),
        () => {}
    )
    expect(events.length).toBe(1)
    expect(events).toEqual(["x observed"])

    d5()
    expect(events.length).toBe(2)
    expect(events).toEqual(["x observed", "x unobserved"])
})

test("onBecome(Un)Observed - less simple", () => {
    const x = mobx.observable({
        a: 3,
        get b() {
            return this.a * 2
        }
    })
    const events = []

    const d1 = mobx.onBecomeObserved(x, "a", () => {
        events.push("a observed")
    })
    const d2 = mobx.onBecomeUnobserved(x, "a", () => {
        events.push("a unobserved")
    })
    const d3 = mobx.onBecomeObserved(x, "b", () => {
        events.push("b observed")
    })
    const d4 = mobx.onBecomeUnobserved(x, "b", () => {
        events.push("b unobserved")
    })

    x.b
    x.a = 4

    expect(events.length).toBe(0) // nothing happened yet

    const d5 = mobx.reaction(
        () => x.b,
        () => {}
    )
    expect(events.length).toBe(2)
    expect(events).toEqual(["b observed", "a observed"])

    const d6 = mobx.reaction(
        () => x.b,
        () => {}
    )
    expect(events.length).toBe(2)

    d5()
    expect(events.length).toBe(2)
    d6()
    expect(events.length).toBe(4)
    expect(events).toEqual(["b observed", "a observed", "b unobserved", "a unobserved"])

    d1()
    d2()
    d3()
    d4()
    events.splice(0)
    const d7 = mobx.reaction(
        () => x.b,
        () => {}
    )
    d7()
    expect(events.length).toBe(0)
})

test("onBecomeObserved correctly disposes second listener #1537", () => {
    const x = mobx.observable.box(3)
    const events = []
    const d1 = mobx.onBecomeObserved(x, "a", () => {
        events.push("a observed")
    })
    mobx.onBecomeObserved(x, "b", () => {
        events.push("b observed")
    })
    d1()
    mobx.reaction(
        () => x.get(),
        () => {}
    )
    expect(events.length).toBe(1)
    expect(events).toEqual(["b observed"])
})

test("onBecomeObserved correctly disposes second listener #1537", () => {
    const x = mobx.observable.box(3)
    const events = []
    const d1 = mobx.onBecomeObserved(x, "a", () => {
        events.push("a observed")
    })
    const d2 = mobx.onBecomeObserved(x, "b", () => {
        events.push("b observed")
    })
    d1()
    const d3 = mobx.reaction(
        () => x.get(),
        () => {}
    )
    d3()
    expect(events.length).toBe(1)
    expect(events).toEqual(["b observed"])
    d2()
    mobx.reaction(
        () => x.get(),
        () => {}
    )
    expect(events).toEqual(["b observed"])
})

test("onBecomeUnobserved correctly disposes second listener #1537", () => {
    const x = mobx.observable.box(3)
    const events = []
    const d1 = mobx.onBecomeUnobserved(x, "a", () => {
        events.push("a unobserved")
    })
    const d2 = mobx.onBecomeUnobserved(x, "b", () => {
        events.push("b unobserved")
    })
    d1()
    const d3 = mobx.reaction(
        () => x.get(),
        () => {}
    )
    d3()
    expect(events.length).toBe(1)
    expect(events).toEqual(["b unobserved"])
    d2()
    mobx.reaction(
        () => x.get(),
        () => {}
    )
    expect(events).toEqual(["b unobserved"])
})

test("deepEquals should yield correct results for complex objects #1118 - 1", () => {
    const d2016jan1 = new Date("2016-01-01")
    const d2016jan1_2 = new Date("2016-01-01")
    const d2017jan1 = new Date("2017-01-01")

    expect(d2016jan1).toEqual(d2016jan1_2)
    expect(d2016jan1).not.toEqual(d2017jan1)
    expect(mobx.comparer.structural(d2016jan1, d2016jan1)).toBe(true)
    expect(mobx.comparer.structural(d2016jan1, d2017jan1)).toBe(false)
    expect(mobx.comparer.structural(d2016jan1, d2016jan1_2)).toBe(true)
})

test("deepEquals should yield correct results for complex objects #1118 - 2", () => {
    class A {
        x = 3
        y = 4

        constructor(x) {
            this.x = x
        }
    }

    const a1 = new A(2)
    const a2 = new A(2)
    const a3 = new A(3)
    const a4 = new A(2)
    a4.z = 2

    expect(a1).toEqual(a2)
    expect(a1).not.toEqual(a3)
    expect(mobx.comparer.structural(a1, a1)).toBe(true)
    expect(mobx.comparer.structural(a1, a3)).toBe(false)
    expect(mobx.comparer.structural(a1, a2)).toBe(true)
    expect(mobx.comparer.structural(a1, a4)).toBe(false)
})

test("comparer.shallow should require types to be equal", () => {
    const sh = mobx.comparer.shallow
    const obs = mobx.observable

    expect(sh({}, {})).toBe(true)
    expect(sh({}, [])).toBe(false)
    expect(sh({}, new Set())).toBe(false)
    expect(sh({}, new Map())).toBe(false)
    expect(sh({}, obs({}))).toBe(true)
    expect(sh({}, obs([]))).toBe(false)
    expect(sh({}, obs(new Set()))).toBe(false)
    expect(sh({}, obs(new Map()))).toBe(false)

    expect(sh([], {})).toBe(false)
    expect(sh([], [])).toBe(true)
    expect(sh([], new Set())).toBe(false)
    expect(sh([], new Map())).toBe(false)
    expect(sh([], obs({}))).toBe(false)
    expect(sh([], obs([]))).toBe(true)
    expect(sh([], obs(new Set()))).toBe(false)
    expect(sh([], obs(new Map()))).toBe(false)

    expect(sh(new Set(), {})).toBe(false)
    expect(sh(new Set(), [])).toBe(false)
    expect(sh(new Set(), new Set())).toBe(true)
    expect(sh(new Set(), new Map())).toBe(false)
    expect(sh(new Set(), obs({}))).toBe(false)
    expect(sh(new Set(), obs([]))).toBe(false)
    expect(sh(new Set(), obs(new Set()))).toBe(true)
    expect(sh(new Set(), obs(new Map()))).toBe(false)

    expect(sh(new Map(), {})).toBe(false)
    expect(sh(new Map(), [])).toBe(false)
    expect(sh(new Map(), new Set())).toBe(false)
    expect(sh(new Map(), new Map())).toBe(true)
    expect(sh(new Map(), obs({}))).toBe(false)
    expect(sh(new Map(), obs([]))).toBe(false)
    expect(sh(new Map(), obs(new Set()))).toBe(false)
    expect(sh(new Map(), obs(new Map()))).toBe(true)

    expect(sh(obs({}), {})).toBe(true)
    expect(sh(obs({}), [])).toBe(false)
    expect(sh(obs({}), new Set())).toBe(false)
    expect(sh(obs({}), new Map())).toBe(false)
    expect(sh(obs({}), obs({}))).toBe(true)
    expect(sh(obs({}), obs([]))).toBe(false)
    expect(sh(obs({}), obs(new Set()))).toBe(false)
    expect(sh(obs({}), obs(new Map()))).toBe(false)

    expect(sh(obs([]), {})).toBe(false)
    expect(sh(obs([]), [])).toBe(true)
    expect(sh(obs([]), new Set())).toBe(false)
    expect(sh(obs([]), new Map())).toBe(false)
    expect(sh(obs([]), obs({}))).toBe(false)
    expect(sh(obs([]), obs([]))).toBe(true)
    expect(sh(obs([]), obs(new Set()))).toBe(false)
    expect(sh(obs([]), obs(new Map()))).toBe(false)

    expect(sh(obs(new Set()), {})).toBe(false)
    expect(sh(obs(new Set()), [])).toBe(false)
    expect(sh(obs(new Set()), new Set())).toBe(true)
    expect(sh(obs(new Set()), new Map())).toBe(false)
    expect(sh(obs(new Set()), obs({}))).toBe(false)
    expect(sh(obs(new Set()), obs([]))).toBe(false)
    expect(sh(obs(new Set()), obs(new Set()))).toBe(true)
    expect(sh(obs(new Set()), obs(new Map()))).toBe(false)

    expect(sh(obs(new Map()), {})).toBe(false)
    expect(sh(obs(new Map()), [])).toBe(false)
    expect(sh(obs(new Map()), new Set())).toBe(false)
    expect(sh(obs(new Map()), new Map())).toBe(true)
    expect(sh(obs(new Map()), obs({}))).toBe(false)
    expect(sh(obs(new Map()), obs([]))).toBe(false)
    expect(sh(obs(new Map()), obs(new Set()))).toBe(false)
    expect(sh(obs(new Map()), obs(new Map()))).toBe(true)
})
test("comparer.shallow should work", () => {
    const sh = mobx.comparer.shallow
    const obs = mobx.observable

    expect(sh(1, 1)).toBe(true)
    expect(sh(1, 2)).toBe(false)

    // Object tests
    expect(sh({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
    expect(sh({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true) // order does not matter

    expect(sh({ a: 1, b: 2 }, { c: 1, b: 2 })).toBe(false)
    expect(sh({ a: 1, b: 2 }, { a: 3, b: 2 })).toBe(false)
    expect(sh({ a: 1, b: 2 }, { a: 1, c: 2 })).toBe(false)
    expect(sh({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false)
    expect(sh({ a: 1, b: 2 }, { a: 1 })).toBe(false)
    expect(sh({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    expect(sh({ a: {} }, { a: {} })).toBe(false)

    // Observable tests
    expect(sh(obs({ a: 1, b: 2 }), obs({ a: 1, b: 2 }))).toBe(true)
    expect(sh(obs({ a: 1, b: 2 }), obs({ b: 2, a: 1 }))).toBe(true) // order does not matter

    expect(sh(obs({ a: 1, b: 2 }), obs({ c: 1, b: 2 }))).toBe(false)
    expect(sh(obs({ a: 1, b: 2 }), obs({ a: 3, b: 2 }))).toBe(false)
    expect(sh(obs({ a: 1, b: 2 }), obs({ a: 1, c: 2 }))).toBe(false)
    expect(sh(obs({ a: 1, b: 2 }), obs({ a: 1, b: 3 }))).toBe(false)
    expect(sh(obs({ a: 1, b: 2 }), obs({ a: 1 }))).toBe(false)
    expect(sh(obs({ a: 1 }), obs({ a: 1, b: 2 }))).toBe(false)
    expect(sh(obs({ a: {} }), obs({ a: {} }))).toBe(false)

    // Array tests
    expect(sh([1, 2], [1, 2])).toBe(true)

    expect(sh([1, 2], [3, 2])).toBe(false)
    expect(sh([1, 2], [1, 3])).toBe(false)
    expect(sh([1, 2], [1])).toBe(false)
    expect(sh([1], [1, 2])).toBe(false)
    expect(sh([{}, 2], [{}, 2])).toBe(false)

    // ObservableArray tests
    expect(sh(obs([1, 2]), obs([1, 2]))).toBe(true)

    expect(sh(obs([1, 2]), obs([3, 2]))).toBe(false)
    expect(sh(obs([1, 2]), obs([1, 3]))).toBe(false)
    expect(sh(obs([1, 2]), obs([1]))).toBe(false)
    expect(sh(obs([1]), obs([1, 2]))).toBe(false)
    expect(sh(obs([{}, 2]), obs([{}, 2]))).toBe(false)

    // Set tests
    expect(sh(new Set([1, 2]), new Set([1, 2]))).toBe(true)

    expect(sh(new Set([1, 2]), new Set([2, 1]))).toBe(false) // order matters
    expect(sh(new Set([1, 2]), new Set([3, 2]))).toBe(false)
    expect(sh(new Set([1, 2]), new Set([1, 3]))).toBe(false)
    expect(sh(new Set([1, 2]), new Set([1]))).toBe(false)
    expect(sh(new Set([1]), new Set([1, 2]))).toBe(false)
    expect(sh(new Set([{}]), new Set([{}]))).toBe(false)

    // ObservableSet tests
    expect(sh(obs(new Set([1, 2])), obs(new Set([1, 2])))).toBe(true)

    expect(sh(obs(new Set([1, 2])), obs(new Set([2, 1])))).toBe(false) // order matters
    expect(sh(obs(new Set([1, 2])), obs(new Set([3, 2])))).toBe(false)
    expect(sh(obs(new Set([1, 2])), obs(new Set([1, 3])))).toBe(false)
    expect(sh(obs(new Set([1, 2])), obs(new Set([1])))).toBe(false)
    expect(sh(obs(new Set([1])), obs(new Set([1, 2])))).toBe(false)
    expect(sh(obs(new Set([{}])), obs(new Set([{}])))).toBe(false)

    // Map tests
    expect(
        sh(
            new Map([
                ["a", 1],
                ["b", 2]
            ]),
            new Map([
                ["a", 1],
                ["b", 2]
            ])
        )
    ).toBe(true)

    expect(
        sh(
            new Map([
                ["a", 1],
                ["b", 2]
            ]),
            new Map([
                ["b", 2],
                ["a", 1]
            ])
        )
    ).toBe(false) // order matters
    expect(
        sh(
            new Map([
                ["a", 1],
                ["b", 2]
            ]),
            new Map([
                ["c", 1],
                ["b", 2]
            ])
        )
    ).toBe(false)
    expect(
        sh(
            new Map([
                ["a", 1],
                ["b", 2]
            ]),
            new Map([
                ["a", 3],
                ["b", 2]
            ])
        )
    ).toBe(false)
    expect(
        sh(
            new Map([
                ["a", 1],
                ["b", 2]
            ]),
            new Map([
                ["a", 1],
                ["c", 2]
            ])
        )
    ).toBe(false)
    expect(
        sh(
            new Map([
                ["a", 1],
                ["b", 2]
            ]),
            new Map([
                ["a", 1],
                ["b", 3]
            ])
        )
    ).toBe(false)
    expect(
        sh(
            new Map([
                ["a", 1],
                ["b", 2]
            ]),
            new Map([["a", 1]])
        )
    ).toBe(false)
    expect(
        sh(
            new Map([["a", 1]]),
            new Map([
                ["a", 1],
                ["b", 2]
            ])
        )
    ).toBe(false)
    expect(sh(new Map([[{}, 1]]), new Map([[{}, 1]]))).toBe(false)
    expect(sh(new Map([["a", {}]]), new Map([["a", {}]]))).toBe(false)

    // ObservableMap tests
    expect(
        sh(
            obs(
                new Map([
                    ["a", 1],
                    ["b", 2]
                ])
            ),
            obs(
                new Map([
                    ["a", 1],
                    ["b", 2]
                ])
            )
        )
    ).toBe(true)

    expect(
        sh(
            obs(
                new Map([
                    ["a", 1],
                    ["b", 2]
                ])
            ),
            obs(
                new Map([
                    ["b", 2],
                    ["a", 1]
                ])
            )
        )
    ).toBe(false) // order matters
    expect(
        sh(
            obs(
                new Map([
                    ["a", 1],
                    ["b", 2]
                ])
            ),
            obs(
                new Map([
                    ["c", 1],
                    ["b", 2]
                ])
            )
        )
    ).toBe(false)
    expect(
        sh(
            obs(
                new Map([
                    ["a", 1],
                    ["b", 2]
                ])
            ),
            obs(
                new Map([
                    ["a", 3],
                    ["b", 2]
                ])
            )
        )
    ).toBe(false)
    expect(
        sh(
            obs(
                new Map([
                    ["a", 1],
                    ["b", 2]
                ])
            ),
            obs(
                new Map([
                    ["a", 1],
                    ["c", 2]
                ])
            )
        )
    ).toBe(false)
    expect(
        sh(
            obs(
                new Map([
                    ["a", 1],
                    ["b", 2]
                ])
            ),
            obs(
                new Map([
                    ["a", 1],
                    ["b", 3]
                ])
            )
        )
    ).toBe(false)
    expect(
        sh(
            obs(
                new Map([
                    ["a", 1],
                    ["b", 2]
                ])
            ),
            obs(new Map([["a", 1]]))
        )
    ).toBe(false)
    expect(
        sh(
            obs(new Map([["a", 1]])),
            obs(
                new Map([
                    ["a", 1],
                    ["b", 2]
                ])
            )
        )
    ).toBe(false)
    expect(sh(obs(new Map([[{}, 1]])), obs(new Map([[{}, 1]])))).toBe(false)
    expect(sh(obs(new Map([["a", {}]])), obs(new Map([["a", {}]])))).toBe(false)
})

test("getDebugName(action)", () => {
    expect(mobx.getDebugName(mobx.action(() => {}))).toBe("<unnamed action>")
    expect(mobx.getDebugName(mobx.action(function fn() {}))).toBe("fn")
    expect(mobx.getDebugName(mobx.action("custom", function fn() {}))).toBe("custom")
})

test("Default debug names - development", () => {
    expect(mobx.getDebugName(mobx.observable({ x() {} }, { x: mobx.action }).x)).toBe("x")
    expect(/Atom@\d+/.test(mobx.getDebugName(mobx.createAtom()))).toBe(true)
    expect(/ComputedValue@\d+/.test(mobx.getDebugName(mobx.computed(() => {})))).toBe(true)
    expect(mobx.getDebugName(mobx.action(function fn() {}))).toBe("fn")
    expect(/ObservableObject@\d+/.test(mobx.getDebugName(mobx.observable({})))).toBe(true)
    expect(/ObservableObject@\d+.x/.test(mobx.getDebugName(mobx.observable({ x: "x" }), "x"))).toBe(
        true
    )
    expect(
        /ObservableObject@\d+.x/.test(mobx.getDebugName(mobx.observable({ get x() {} }), "x"))
    ).toBe(true)
    expect(/ObservableArray@\d+/.test(mobx.getDebugName(mobx.observable([])))).toBe(true)
    expect(
        /ObservableArray@\d+/.test(mobx.getDebugName(mobx.observable([], { proxy: false })))
    ).toBe(true)
    expect(/ObservableMap@\d+/.test(mobx.getDebugName(mobx.observable(new Map())))).toBe(true)
    expect(/ObservableSet@\d+/.test(mobx.getDebugName(mobx.observable(new Set())))).toBe(true)
    expect(/ObservableValue@\d+/.test(mobx.getDebugName(mobx.observable("x")))).toBe(true)
    expect(
        /Reaction@\d+/.test(
            mobx.getDebugName(
                mobx.reaction(
                    () => {},
                    () => {}
                )
            )
        )
    ).toBe(true)
    expect(/Autorun@\d+/.test(mobx.getDebugName(mobx.autorun(() => {})))).toBe(true)
})

test("Default debug names - production", () => {
    const mobx = require(`../../../dist/mobx.cjs.production.min.js`)

    expect(mobx.getDebugName(mobx.observable({ x() {} }, { x: mobx.action }).x)).toBe("x") // perhaps should be "<unnamed action>"??
    expect(mobx.getDebugName(mobx.createAtom())).toBe("Atom")
    expect(mobx.getDebugName(mobx.computed(() => {}))).toBe("ComputedValue")
    expect(mobx.getDebugName(mobx.action(function fn() {}))).toBe("fn")
    expect(mobx.getDebugName(mobx.observable({}))).toBe("ObservableObject")
    expect(mobx.getDebugName(mobx.observable({ x: "x" }), "x")).toBe("ObservableObject.key")
    expect(mobx.getDebugName(mobx.observable({ get x() {} }), "x")).toBe("ObservableObject.key")
    expect(mobx.getDebugName(mobx.observable([]))).toBe("ObservableArray")
    expect(mobx.getDebugName(mobx.observable([], { proxy: false }))).toBe("ObservableArray")
    expect(mobx.getDebugName(mobx.observable(new Map()))).toBe("ObservableMap")
    expect(mobx.getDebugName(mobx.observable(new Set()))).toBe("ObservableSet")
    expect(mobx.getDebugName(mobx.observable("x"))).toBe("ObservableValue")
    expect(
        mobx.getDebugName(
            mobx.reaction(
                () => {},
                () => {}
            )
        )
    ).toBe("Reaction")
    expect(mobx.getDebugName(mobx.autorun(() => {}))).toBe("Autorun")
})

test("User provided debug names are always respected", () => {
    const mobxDevelopment = mobx
    const mobxProduction = require(`../../../dist/mobx.cjs.production.min.js`)

    const name = "CustomName"

    ;[mobxDevelopment, mobxProduction].forEach(mobx => {
        expect(mobx.getDebugName(mobx.action(name, function fn() {}))).toBe(name)
        expect(mobx.getDebugName(mobx.createAtom(name))).toBe(name)
        expect(mobx.getDebugName(mobx.computed(() => {}, { name }))).toBe(name)
        expect(mobx.getDebugName(mobx.observable({}, {}, { name }))).toBe(name)
        expect(mobx.getDebugName(mobx.observable([], { name }))).toBe(name)
        expect(mobx.getDebugName(mobx.observable([], { name, proxy: false }))).toBe(name)
        expect(mobx.getDebugName(mobx.observable(new Map(), { name }))).toBe(name)
        expect(mobx.getDebugName(mobx.observable(new Set(), { name }))).toBe(name)
        expect(mobx.getDebugName(mobx.observable("x", { name }))).toBe(name)
        expect(
            mobx.getDebugName(
                mobx.reaction(
                    () => {},
                    () => {},
                    { name }
                )
            )
        ).toBe(name)
        expect(mobx.getDebugName(mobx.autorun(() => {}, { name }))).toBe(name)
    })
})
