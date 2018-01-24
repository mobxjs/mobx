"use strict"

var mobx = require("../../src/mobx.ts")
var m = mobx
var observable = mobx.observable
var transaction = mobx.transaction

test("json1", function() {
    mobx._resetGlobalState()

    var todos = observable([
        {
            title: "write blog"
        },
        {
            title: "improve coverge"
        }
    ])

    var output
    mobx.autorun(function() {
        output = todos
            .map(function(todo) {
                return todo.title
            })
            .join(", ")
    })

    todos[1].title = "improve coverage" // prints: write blog, improve coverage
    expect(output).toBe("write blog, improve coverage")
    todos.push({ title: "take a nap" }) // prints: write blog, improve coverage, take a nap
    expect(output).toBe("write blog, improve coverage, take a nap")
})

test("json2", function() {
    var source = {
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

    var o = mobx.observable(JSON.parse(JSON.stringify(source)))

    expect(mobx.toJS(o)).toEqual(source)

    var analyze = mobx.computed(function() {
        return [o.todos.length, o.todos[1].details.url]
    })

    var alltags = mobx.computed(function() {
        return o.todos
            .map(function(todo) {
                return todo.tags.join(",")
            })
            .join(",")
    })

    var ab = []
    var tb = []

    m.observe(
        analyze,
        function(d) {
            ab.push(d.newValue)
        },
        true
    )
    m.observe(
        alltags,
        function(d) {
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
    expect(ab).toEqual([[2, "here"], [2, "ba"]])
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
    expect(mobx.toJS(o, false)).toEqual({
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
    expect(mobx.toJS(o, true)).toEqual(mobx.toJS(o, false))
    expect(ab).toEqual([[3, "google"]])
    expect(tb).toEqual(["reactjs,frp,foo,bar,x"])
})

test("toJS handles dates", () => {
    var a = observable({
        d: new Date()
    })

    var b = mobx.toJS(a)
    expect(b.d instanceof Date).toBe(true)
    expect(a.d === b.d).toBe(true)
})

test("json cycles", function() {
    var a = observable({
        b: 1,
        c: [2],
        d: mobx.observable.map(),
        e: a
    })

    a.e = a
    a.c.push(a, a.d)
    a.d.set("f", a)
    a.d.set("d", a.d)
    a.d.set("c", a.c)

    var cloneA = mobx.toJS(a, true)
    var cloneC = cloneA.c
    var cloneD = cloneA.d

    expect(cloneA.b).toBe(1)
    expect(cloneA.c[0]).toBe(2)
    expect(cloneA.c[1]).toBe(cloneA)
    expect(cloneA.c[2]).toBe(cloneD)
    expect(cloneD.f).toBe(cloneA)
    expect(cloneD.d).toBe(cloneD)
    expect(cloneD.c).toBe(cloneC)
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
