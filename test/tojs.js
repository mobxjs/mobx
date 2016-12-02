"use strict"

var test = require('tape');
var mobx = require('..');
var m = mobx;
var observable = mobx.observable;
var transaction = mobx.transaction;


test('json1', function(t) {
	mobx.extras.resetGlobalState()

    var todos = observable([
        {
            title: "write blog"
        },
        {
            title: "improve coverge"
        }
    ]);

    var output;
    mobx.autorun(function() {
        output = todos.map(function(todo) { return todo.title; }).join(", ");
    });

    todos[1].title = "improve coverage"; // prints: write blog, improve coverage
    t.equal(output, "write blog, improve coverage");
    todos.push({ title: "take a nap" }); // prints: write blog, improve coverage, take a nap
    t.equal(output, "write blog, improve coverage, take a nap");

    t.end();
})

test('json2', function(t) {
    var source = {
        todos: [
            {
                title: "write blog",
                tags: ["react","frp"],
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
    };

    var o = mobx.observable(JSON.parse(JSON.stringify(source)));

    t.deepEqual(mobx.toJS(o), source);

    var analyze = mobx.computed(function() {
        return [
            o.todos.length,
            o.todos[1].details.url
        ]
    });

    var alltags = mobx.computed(function() {
        return o.todos.map(function(todo) {
            return todo.tags.join(",");
        }).join(",");
    });

    var ab = [];
    var tb = [];

    m.observe(analyze, function(d) { ab.push(d); }, true);
    m.observe(alltags, function(d) { tb.push(d); }, true);

    o.todos[0].details.url = "boe";
    o.todos[1].details.url = "ba";
    o.todos[0].tags[0] = "reactjs";
    o.todos[1].tags.push("pff");

    t.deepEqual(mobx.toJS(o), {
        "todos": [
            {
                "title": "write blog",
                "tags": [
                    "reactjs",
                    "frp"
                ],
                "details": {
                    "url": "boe"
                }
            },
            {
                "title": "do the dishes",
                "tags": [
                    "mweh", "pff"
                ],
                "details": {
                    "url": "ba"
                }
            }
        ]
    });
    t.deepEqual(ab, [ [ 2, 'here' ], [ 2, 'ba' ] ]);
    t.deepEqual(tb,  [ 'react,frp,mweh', 'reactjs,frp,mweh', 'reactjs,frp,mweh,pff' ]);
    ab = [];
    tb = [];

    o.todos.push(mobx.observable({
        title: "test",
        tags: ["x"]
    }));

    t.deepEqual(mobx.toJS(o), {
        "todos": [
            {
                "title": "write blog",
                "tags": [
                    "reactjs",
                    "frp"
                ],
                "details": {
                    "url": "boe"
                }
            },
            {
                "title": "do the dishes",
                "tags": [
                    "mweh", "pff"
                ],
                "details": {
                    "url": "ba"
                }
            },
            {
                title: "test",
                tags: ["x"]
            }
        ]
    });
    t.deepEqual(ab, [[3, "ba"]]);
    t.deepEqual(tb, ["reactjs,frp,mweh,pff,x"]);
    ab = [];
    tb = [];

    o.todos[1] = mobx.observable({
        title: "clean the attic",
        tags: ["needs sabbatical"],
        details: {
            url: "booking.com"
        }
    });
    t.deepEqual(JSON.parse(JSON.stringify(o)), {
        "todos": [
            {
                "title": "write blog",
                "tags": [
                    "reactjs",
                    "frp"
                ],
                "details": {
                    "url": "boe"
                }
            },
            {
                "title": "clean the attic",
                "tags": [
                    "needs sabbatical"
                ],
                "details": {
                    "url": "booking.com"
                }
            },
            {
                title: "test",
                tags: ["x"]
            }
        ]
    });
    t.deepEqual(ab, [[3, "booking.com"]]);
    t.deepEqual(tb, ["reactjs,frp,needs sabbatical,x"]);
    ab = [];
    tb = [];

    o.todos[1].details = mobx.observable({ url: "google" });
    o.todos[1].tags = ["foo", "bar"];
    t.deepEqual(mobx.toJS(o, false), {
         "todos": [
            {
                "title": "write blog",
                "tags": [
                    "reactjs",
                    "frp"
                ],
                "details": {
                    "url": "boe"
                }
            },
            {
                "title": "clean the attic",
                "tags": [
                    "foo", "bar"
                ],
                "details": {
                    "url": "google"
                }
            },
            {
                title: "test",
                tags: ["x"]
            }
        ]
    });
    t.deepEqual(mobx.toJS(o, true), mobx.toJS(o, false));
    t.deepEqual(ab, [[3, "google"]]);
    t.deepEqual(tb, ["reactjs,frp,foo,bar,x"]);

    t.end();
})

test('toJS handles dates', t => {
	var a = observable({
		d: new Date()
	});

	var b = mobx.toJS(a);
	t.equal(b.d instanceof Date, true)
	t.equal(a.d === b.d, true)
	t.end()
})

test('json cycles', function(t) {
    var a = observable({
        b: 1,
        c: [2],
        d: mobx.map(),
        e: a
    });

    a.e = a;
    a.c.push(a, a.d);
    a.d.set("f", a);
    a.d.set("d", a.d);
    a.d.set("c", a.c);

    var cloneA = mobx.toJS(a, true);
    var cloneC = cloneA.c;
    var cloneD = cloneA.d;

    t.equal(cloneA.b, 1);
    t.equal(cloneA.c[0], 2);
    t.equal(cloneA.c[1], cloneA);
    t.equal(cloneA.c[2], cloneD);
    t.equal(cloneD.f, cloneA);
    t.equal(cloneD.d, cloneD);
    t.equal(cloneD.c, cloneC);
    t.equal(cloneA.e, cloneA);

    t.end();
})

test('#285 class instances with toJS', t => {
	function Person() {
		this.firstName = "michel";
		mobx.extendObservable(this, {
			lastName: "weststrate",
			tags: ["user", "mobx-member"],
			get fullName() {
				return this.firstName + this.lastName
			}
		})
	}

	const p1 = new Person();
	// check before lazy initialization
	t.deepEqual(mobx.toJS(p1), {
		firstName: "michel",
		lastName: "weststrate",
		tags: ["user", "mobx-member"]
	});

	// check after lazy initialization
	t.deepEqual(mobx.toJS(p1), {
		firstName: "michel",
		lastName: "weststrate",
		tags: ["user", "mobx-member"]
	});

	t.end()
})

test('#285 non-mobx class instances with toJS', t => {
	const nameObservable = mobx.observable("weststrate");
	function Person() {
		this.firstName = "michel";
		this.lastName = nameObservable;
	}

	const p1 = new Person();
	// check before lazy initialization
	t.deepEqual(mobx.toJS(p1), {
		firstName: "michel",
		lastName: nameObservable // toJS doesn't recurse into non observable objects!
	});

	t.end()
})

test("verify #566 solution", t => {
	function MyClass() {}
	const a = new MyClass()
	const b = mobx.observable({ x: 3 })
	const c = mobx.observable({ a: a, b: b })

	t.ok(mobx.toJS(c).a === a) // true
	t.ok(mobx.toJS(c).b !== b) // false, cloned
	t.ok(mobx.toJS(c).b.x === b.x) // true, both 3

	t.ok(mobx.toJSlegacy(c).a !== a) // false, cloned as well
	t.ok(mobx.toJSlegacy(c).b !== b) // false, cloned
	t.ok(mobx.toJSlegacy(c).b.x === b.x) // true, both 3
	t.end()
})
