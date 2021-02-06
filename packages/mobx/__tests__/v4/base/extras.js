const mobx = require("../mobx4")
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
        x.keys()
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
        return mobx.getAtom(thing, prop).constructor.name
    }

    const ovClassName = mobx.observable.box(3).constructor.name
    const atomClassName = mobx.createAtom("test").constructor.name
    // const reactionClassName = mobx.Reaction.name

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

    expect(atom(e)).toBe(mobx.computed(() => {}).constructor.name)
    expect(atom(f)).toBe(mobx.Reaction.name)

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

    function adm(thing, prop) {
        return mobx._getAdministration(thing, prop).constructor.name
    }

    const ovClassName = mobx.observable.box(3).constructor.name
    const mapClassName = mobx.observable.map().constructor.name

    expect(adm(a)).toBe(ovClassName)

    expect(adm(b, "a")).toBe(ovClassName)
    expect(adm(b)).toBe(b[$mobx].constructor.name)
    expect(() => adm(b, "b")).toThrowError(
        /no observable property 'b' found on the observable object 'ObservableObject@2'/
    )

    expect(adm(c)).toBe(mapClassName)
    expect(adm(c, "a")).toBe(ovClassName)
    expect(adm(c, "b")).toBe(ovClassName)
    expect(() => adm(c, "c")).toThrowError(
        /the entry 'c' does not exist in the observable map 'ObservableMap@3'/
    )

    expect(adm(d)).toBe(d[$mobx].constructor.name)
    expect(() => adm(d, 0)).toThrowError(/It is not possible to get index atoms from arrays/)

    expect(adm(e)).toBe(mobx.computed(() => {}).constructor.name)
    expect(adm(f)).toBe(mobx.Reaction.name)

    expect(adm(g)).toBe(b[$mobx].constructor.name)
    expect(adm(g, "a")).toBe(ovClassName)

    f()
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

test("comparer.shallow should work", () => {
    const sh = mobx.comparer.shallow

    expect(sh(1, 1)).toBe(true)

    expect(sh(1, 2)).toBe(false)

    expect(sh({}, {})).toBe(true)
    expect(sh([], [])).toBe(true)

    expect(sh({}, [])).toBe(false)
    expect(sh([], {})).toBe(false)

    expect(sh({ a: 1, b: 2, c: 3 }, { a: 1, b: 2, c: 3 })).toBe(true)

    expect(sh({ a: 1, b: 2, c: 3, d: 4 }, { a: 1, b: 2, c: 3 })).toBe(false)
    expect(sh({ a: 1, b: 2, c: 3 }, { a: 1, b: 2, c: 3, d: 4 })).toBe(false)
    expect(sh({ a: {}, b: 2, c: 3 }, { a: {}, b: 2, c: 3 })).toBe(false)

    expect(sh([1, 2, 3], [1, 2, 3])).toBe(true)

    expect(sh([1, 2, 3, 4], [1, 2, 3])).toBe(false)
    expect(sh([1, 2, 3], [1, 2, 3, 4])).toBe(false)
    expect(sh([{}, 2, 3], [{}, 2, 3])).toBe(false)
})
