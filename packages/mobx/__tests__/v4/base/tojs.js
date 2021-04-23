"use strict"

const mobx = require("../mobx4")
const m = mobx
const observable = mobx.observable
const { makeObservable } = mobx

test("json1", function () {
    mobx._resetGlobalState()

    const todos = observable([
        {
            title: "write blog"
        },
        {
            title: "improve coverge"
        }
    ])

    let output
    mobx.autorun(function () {
        output = todos
            .map(function (todo) {
                return todo.title
            })
            .join(", ")
    })

    todos[1].title = "improve coverage" // prints: write blog, improve coverage
    expect(output).toBe("write blog, improve coverage")
    todos.push({ title: "take a nap" }) // prints: write blog, improve coverage, take a nap
    expect(output).toBe("write blog, improve coverage, take a nap")
})

test("json2", function () {
    const source = {
        todos: [
            {
                title: "write blog",
                tags: ["react", "frp"],
                details: {
                    url: "somewhere"
                }
            },
            {
                title: "do the dishes",
                tags: ["mweh"],
                details: {
                    url: "here"
                }
            }
        ]
    }

    const o = mobx.observable(JSON.parse(JSON.stringify(source)))

    expect(mobx.toJS(o)).toEqual(source)

    const analyze = mobx.computed(function () {
        return [o.todos.length, o.todos[1].details.url]
    })

    const alltags = mobx.computed(function () {
        return o.todos
            .map(function (todo) {
                return todo.tags.join(",")
            })
            .join(",")
    })

    let ab = []
    let tb = []

    m.observe(
        analyze,
        function (d) {
            ab.push(d.newValue)
        },
        true
    )
    m.observe(
        alltags,
        function (d) {
            tb.push(d.newValue)
        },
        true
    )

    o.todos[0].details.url = "boe"
    o.todos[1].details.url = "ba"
    o.todos[0].tags[0] = "reactjs"
    o.todos[1].tags.push("pff")

    expect(mobx.toJS(o)).toEqual({
        todos: [
            {
                title: "write blog",
                tags: ["reactjs", "frp"],
                details: {
                    url: "boe"
                }
            },
            {
                title: "do the dishes",
                tags: ["mweh", "pff"],
                details: {
                    url: "ba"
                }
            }
        ]
    })
    expect(ab).toEqual([
        [2, "here"],
        [2, "ba"]
    ])
    expect(tb).toEqual(["react,frp,mweh", "reactjs,frp,mweh", "reactjs,frp,mweh,pff"])
    ab = []
    tb = []

    o.todos.push(
        mobx.observable({
            title: "test",
            tags: ["x"]
        })
    )

    expect(mobx.toJS(o)).toEqual({
        todos: [
            {
                title: "write blog",
                tags: ["reactjs", "frp"],
                details: {
                    url: "boe"
                }
            },
            {
                title: "do the dishes",
                tags: ["mweh", "pff"],
                details: {
                    url: "ba"
                }
            },
            {
                title: "test",
                tags: ["x"]
            }
        ]
    })
    expect(ab).toEqual([[3, "ba"]])
    expect(tb).toEqual(["reactjs,frp,mweh,pff,x"])
    ab = []
    tb = []

    o.todos[1] = mobx.observable({
        title: "clean the attic",
        tags: ["needs sabbatical"],
        details: {
            url: "booking.com"
        }
    })
    expect(JSON.parse(JSON.stringify(o))).toEqual({
        todos: [
            {
                title: "write blog",
                tags: ["reactjs", "frp"],
                details: {
                    url: "boe"
                }
            },
            {
                title: "clean the attic",
                tags: ["needs sabbatical"],
                details: {
                    url: "booking.com"
                }
            },
            {
                title: "test",
                tags: ["x"]
            }
        ]
    })
    expect(ab).toEqual([[3, "booking.com"]])
    expect(tb).toEqual(["reactjs,frp,needs sabbatical,x"])
    ab = []
    tb = []

    o.todos[1].details = mobx.observable({ url: "google" })
    o.todos[1].tags = ["foo", "bar"]
    expect(mobx.toJS(o)).toEqual({
        todos: [
            {
                title: "write blog",
                tags: ["reactjs", "frp"],
                details: {
                    url: "boe"
                }
            },
            {
                title: "clean the attic",
                tags: ["foo", "bar"],
                details: {
                    url: "google"
                }
            },
            {
                title: "test",
                tags: ["x"]
            }
        ]
    })
    expect(mobx.toJS(o)).toEqual(mobx.toJS(o))
    expect(ab).toEqual([[3, "google"]])
    expect(tb).toEqual(["reactjs,frp,foo,bar,x"])
})

test("toJS handles dates", () => {
    const a = observable({
        d: new Date()
    })

    const b = mobx.toJS(a)
    expect(b.d instanceof Date).toBe(true)
    expect(a.d === b.d).toBe(true)
})

test("json cycles", function () {
    const a = observable({
        b: 1,
        c: [2],
        d: mobx.observable.map()
    })

    a.e = a
    a.c.push(a, a.d)
    a.d.set("f", a)
    a.d.set("d", a.d)
    a.d.set("c", a.c)

    const cloneA = mobx.toJS(a)
    const cloneC = cloneA.c
    const cloneD = cloneA.d

    expect(cloneA.b).toBe(1)
    expect(cloneA.c[0]).toBe(2)
    expect(cloneA.c[1]).toBe(cloneA)
    expect(cloneA.c[2]).toBe(cloneD)
    expect(cloneD.get("f")).toBe(cloneA)
    expect(cloneD.get("d")).toBe(cloneD)
    expect(cloneD.get("c")).toBe(cloneC)
    expect(cloneA.e).toBe(cloneA)
})

test("#285 class instances with toJS", () => {
    function Person() {
        this.firstName = "michel"
        mobx.extendObservable(this, {
            lastName: "weststrate",
            tags: ["user", "mobx-member"],
            get fullName() {
                return this.firstName + this.lastName
            }
        })
    }

    const p1 = new Person()
    // check before lazy initialization
    expect(mobx.toJS(p1)).toEqual({
        firstName: "michel",
        lastName: "weststrate",
        tags: ["user", "mobx-member"]
    })

    // check after lazy initialization
    expect(mobx.toJS(p1)).toEqual({
        firstName: "michel",
        lastName: "weststrate",
        tags: ["user", "mobx-member"]
    })
})

test("#285 non-mobx class instances with toJS", () => {
    const nameObservable = mobx.observable.box("weststrate")
    function Person() {
        this.firstName = "michel"
        this.lastName = nameObservable
    }

    const p1 = new Person()
    // check before lazy initialization
    expect(mobx.toJS(p1)).toEqual({
        firstName: "michel",
        lastName: nameObservable // toJS doesn't recurse into non observable objects!
    })
})

test("verify #566 solution", () => {
    function MyClass() {}
    const a = new MyClass()
    const b = mobx.observable({ x: 3 })
    const c = mobx.observable({ a: a, b: b })

    expect(mobx.toJS(c).a === a).toBeTruthy() // true
    expect(mobx.toJS(c).b !== b).toBeTruthy() // false, cloned
    expect(mobx.toJS(c).b.x === b.x).toBeTruthy() // true, both 3
})

test("verify already seen", () => {
    const a = mobx.observable({ x: null, y: 3 })
    a.x = a

    const res = mobx.toJS(a)
    expect(res.y).toBe(3)
    expect(res.x === res).toBeTruthy()
    expect(res.x === a).toBeFalsy()
})

test("json cycles when exporting maps as maps", function () {
    const a = observable({
        b: 1,
        c: [2],
        d: mobx.observable.map()
    })

    a.e = a
    a.c.push(a, a.d)
    a.d.set("f", a)
    a.d.set("d", a.d)
    a.d.set("c", a.c)

    const cloneA = mobx.toJS(a)
    const cloneC = cloneA.c
    const cloneD = cloneA.d

    expect(cloneA.b).toBe(1)
    expect(cloneA.c[0]).toBe(2)
    expect(cloneA.c[1]).toBe(cloneA)
    expect(cloneA.c[2]).toBe(cloneD)
    expect(cloneD).toBeInstanceOf(Map)
    expect(cloneD.get("f")).toBe(cloneA)
    expect(cloneD.get("d")).toBe(cloneD)
    expect(cloneD.get("c")).toBe(cloneC)
    expect(cloneA.e).toBe(cloneA)
})

test("map to JS", () => {
    class MyClass {
        @observable meta = new Map()

        constructor() {
            makeObservable(this)
            this.meta.set("test", { abc: "def", ghi: "jkl" })

            expect(mobx.toJS(this.meta).constructor.name).toBe("Map")
        }
    }
    new MyClass()
})

test("Correctly converts observable objects with computed values", () => {
    const a = observable({ key: "value" })
    const c = observable({ computedValue: mobx.computed(() => a.key) })

    const j = mobx.toJS(c)
    expect(j).toMatchObject({ computedValue: "value" })
})
