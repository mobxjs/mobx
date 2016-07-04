var test = require('tape');
var mobx = require('..');
var m = mobx;
var observable = mobx.observable;
var transaction = mobx.transaction;

var voidObserver = function(){};

function buffer() {
    var b = [];
    var res = function(newValue) {
        b.push(newValue);
    };
    res.toArray = function() {
        return b;
    }
    return res;
}

test('argumentless observable', t => {
	var a = observable();

	t.equal(m.isObservable(a), true);
	t.equal(a.get(), undefined);

	t.end();
})

test('basic', function(t) {
    var x = observable(3);
    var b = buffer();
    m.observe(x, b);
    t.equal(3, x.get());

    x.set(5);
    t.equal(5, x.get());
    t.deepEqual([5], b.toArray());
    t.equal(mobx.extras.isComputingDerivation(), false);
    t.end();
})

test('basic2', function(t) {
    var x = observable(3);
    var z = observable(function () { return x.get() * 2});
    var y = observable(function () { return x.get() * 3});

    m.observe(z, voidObserver);

    t.equal(z.get(), 6);
    t.equal(y.get(), 9);

    x.set(5);
    t.equal(z.get(), 10);
    t.equal(y.get(), 15);

    t.equal(mobx.extras.isComputingDerivation(), false);
    t.end();
})

test('dynamic', function(t) {
    try {
        var x = observable(3);
        var y = m.computed(function() {
            return x.get();
        });
        var b = buffer();
        m.observe(y, b, true);

        t.equal(3, y.get()); // First evaluation here..

        x.set(5);
        t.equal(5, y.get());

        t.deepEqual(b.toArray(), [3, 5]);
        t.equal(mobx.extras.isComputingDerivation(), false);

        t.end();
    }
    catch(e) {
        console.log(e.stack);
    }
})

test('dynamic2', function(t) {
    try {
        var x = observable(3);
        var y = observable(function() {
            return x.get() * x.get();
        });

        t.equal(9, y.get());
        var b = buffer();
        m.observe(y, b);

        x.set(5);
        t.equal(25, y.get());

        //no intermediate value 15!
        t.deepEqual([25], b.toArray());
        t.equal(mobx.extras.isComputingDerivation(), false);

        t.end();
    }
    catch(e) {
        console.log(e.stack);
    }
})

test('readme1', function(t) {
    try {
        var b = buffer();

        var vat = observable(0.20);
        var order = {};
        order.price = observable(10);
        // Prints: New price: 24
        //in TS, just: value(() => this.price() * (1+vat()))
        order.priceWithVat = observable(function() {
            return order.price.get() * (1 + vat.get());
        });

        m.observe(order.priceWithVat, b);

        order.price.set(20);
        t.deepEqual([24],b.toArray());
        order.price.set(10);
        t.deepEqual([24,12],b.toArray());
        t.equal(mobx.extras.isComputingDerivation(), false);

        t.end();
    } catch (e) {
        console.log(e.stack); throw e;
    }
})

test('batch', function(t) {
    var a = observable(2);
    var b = observable(3);
    var c = observable(function() { return a.get() * b.get() });
    var d = observable(function() { return c.get() * b.get() });
    var buf = buffer();
    m.observe(d, buf);

    a.set(4);
    b.set(5);
    // Note, 60 should not happen! (that is d beign computed before c after update of b)
    t.deepEqual(buf.toArray(), [36, 100]);

    var x = mobx.transaction(function() {
        a.set(2);
        b.set(3);
        a.set(6);
        t.equal(d.value, 100); // not updated; in transaction
        t.equal(d.get(), 54); // consistent due to inspection
        return 2;
    });

    t.equal(x, 2); // test return value
    t.deepEqual(buf.toArray(), [36, 100, 54]);// only one new value for d
    t.end();
})

test('transaction with inspection', function(t) {
    var a = observable(2);
    var calcs = 0;
    var b = observable(function() {
        calcs++;
        return a.get() * 2;
    });

    // if not inspected during transaction, postpone value to end
    mobx.transaction(function() {
        a.set(3);
        t.equal(b.get(), 6);
        t.equal(calcs, 1);
    });
    t.equal(b.get(), 6);
    t.equal(calcs, 2);

    // if inspected, evaluate eagerly
    mobx.transaction(function() {
        a.set(4);
        t.equal(b.get(), 8);
        t.equal(calcs, 3);
    });
    t.equal(b.get(), 8);
    t.equal(calcs, 4);

    t.end();
});

test('transaction with inspection 2', function(t) {
    var a = observable(2);
    var calcs = 0;
    var b;
    mobx.autorun(function() {
        calcs++;
        b = a.get() * 2;
    });

    // if not inspected during transaction, postpone value to end
    mobx.transaction(function() {
        a.set(3);
        t.equal(b, 4);
        t.equal(calcs, 1);
    });
    t.equal(b, 6);
    t.equal(calcs, 2);

    // if inspected, evaluate eagerly
    mobx.transaction(function() {
        a.set(4);
        t.equal(b, 6);
        t.equal(calcs, 2);
    });
    t.equal(b, 8);
    t.equal(calcs, 3);

    t.end();
})

test('scope', function(t) {
    var vat = observable(0.2);
    var Order = function() {
        this.price = observable(20);
        this.amount = observable(2);
        this.total = observable(function() {
            return (1+vat.get()) * this.price.get() * this.amount.get();
        }, this);
    };

    var order = new Order();
    m.observe(order.total, voidObserver);
    order.price.set(10);
    order.amount.set(3);
    t.equal(36, order.total.get());
    t.equal(mobx.extras.isComputingDerivation(), false);

    t.end();
})

test('props1', function(t) {
    var vat = observable(0.2);
    var Order = function() {
        mobx.extendObservable(this, {
            'price' : 20,
            'amount' : 2,
            'total': function() {
                return (1+vat.get()) * this.price * this.amount; // price and amount are now properties!
            }
        });
    };

    var order = new Order();
    t.equal(48, order.total);
    order.price = 10;
    order.amount = 3;
    t.equal(36, order.total);

    var totals = [];
    var sub = mobx.autorun(function() {
        totals.push(order.total);
    });
    order.amount = 4;
    sub();
    order.amount = 5;
    t.deepEqual(totals, [36,48]);

    t.equal(mobx.extras.isComputingDerivation(), false);
    t.end();
})

test('props2', function(t) {
    var vat = observable(0.2);
    var Order = function() {
        mobx.extendObservable(this, {
            price: 20,
            amount: 2,
            total: function() {
                return (1+vat.get()) * this.price * this.amount; // price and amount are now properties!
            }
        });
    };

    var order = new Order();
    t.equal(48, order.total);
    order.price = 10;
    order.amount = 3;
    t.equal(36, order.total);
    t.end();
})

test('props3', function(t) {
    var vat = observable(0.2);
    var Order = function() {
        this.price = 20;
        this.amount = 2;
        this.total = function() {
            return (1+vat.get()) * this.price * this.amount; // price and amount are now properties!
        };
        mobx.extendObservable(this, this);
    };

    var order = new Order();
    t.equal(48, order.total);
    order.price = 10;
    order.amount = 3;
    t.equal(36, order.total);
    t.end();
})

test('props4', function(t) {
    function Bzz() {
        mobx.extendObservable(this, {
            fluff: [1,2],
            sum: function() {
                return this.fluff.reduce(function(a,b) {
                    return a + b;
                }, 0);
            }
        });
    }

    var x = new Bzz();
    var ar = x.fluff;
    t.equal(x.sum, 3);
    x.fluff.push(3);
    t.equal(x.sum, 6);
    x.fluff = [5,6];
    t.equal(x.sum, 11);
    x.fluff.push(2);
    t.equal(x.sum, 13);
    t.end();
})

test('extend observable multiple prop maps', function(t) {
    var x = { a: 1 };
    mobx.extendObservable(x, {
        b: 2,
        c: 2
    }, {
        c: 3,
        d: 4
    }, {
        a: 5
    });

    var sum = 0;
    var disposer = mobx.autorun(function() {
        sum = x.a + x.b + x.c + x.d;
    });
    t.equal(sum, 14);
    x.a = 1;
    t.equal(sum, 10);

    t.end();
})

test('object enumerable props', function(t) {
    var x = mobx.observable({
        a: 3,
        b: function() {
            return 2 * this.a;
        }
    });
    mobx.extendObservable(x, { c: 4 });
    var ar = [];
    for(var key in x)
        ar.push(key);
    t.deepEqual(ar, ['a', 'c']); // or should 'b' be in here as well?
    t.end();
})

test('observe property', function(t) {
    var sb = [];
    var mb = [];

    var Wrapper = function (chocolateBar) {
        mobx.extendObservable(this, {
            chocolateBar: chocolateBar,
            calories: function () {
                return this.chocolateBar.calories;
            }
        });
    };

    var snickers = mobx.observable({
        calories: null
    });
    var mars = mobx.observable({
        calories: undefined
    });

    var wrappedSnickers = new Wrapper(snickers);
    var wrappedMars = new Wrapper(mars);

    var disposeSnickers = mobx.autorun(function () {
        sb.push(wrappedSnickers.calories);
    });
    var disposeMars = mobx.autorun(function () {
        mb.push(wrappedMars.calories);
    });
    snickers.calories = 10;
    mars.calories = 15;

    disposeSnickers();
    disposeMars();
    snickers.calories = 5;
    mars.calories = 7;

    t.deepEqual(sb, [null, 10]);
    t.deepEqual(mb, [undefined, 15]);

    t.end();
})

test('observe object', function(t) {
    var events = [];
    var a = observable({
        a: 1,
        da: function() { return this.a * 2 }
    });
    var stop = m.observe(a, function(change) {
        events.push(change);
    });

    a.a = 2;
    mobx.extendObservable(a, {
        a: 3, b: 3
    });
    a.a = 4;
    a.b = 5;
    t.deepEqual(events, [
        { type: 'update',
            object: a,
            name: 'a',
			newValue: 2,
            oldValue: 1 },
        { type: 'update',
            object: a,
            name: 'a',
			newValue: 3,
            oldValue: 2 },
        { type: 'add',
            object: a,
			newValue: 3,
            name: 'b' },
        { type: 'update',
            object: a,
            name: 'a',
			newValue: 4,
            oldValue: 3 },
        { type: 'update',
            object: a,
            name: 'b',
			newValue: 5,
            oldValue: 3 }
    ]);

    stop();
    events = [];
    a.a = 6;
    t.equals(events.length, 0);

    t.end();
});

test('mobx.observe', function(t) {
    var events = [];
    var po = { a: 1 };
    var o = observable({ b: 2 });
    var ar = observable([ 3 ]);
    var map = mobx.map({ });

    var push = function(event) { events.push(event); };

    var stop1 = mobx.observe(po, push);
    var stop2 = mobx.observe(o, push);
    var stop3 = mobx.observe(ar, push);
    var stop4 = mobx.observe(map, push);

    po.a = 4;
    o.b = 5;
    ar[0] = 6;
    map.set("d", 7);

    stop1();
    stop2();
    stop3();
    stop4();

    po.a = 8;
    o.b = 9;
    ar[0] = 10;
    map.set("d", 11);

    t.deepEqual(events, [
        { type: 'update',
            object: po,
            name: 'a',
			newValue: 4,
            oldValue: 1 },
        { type: 'update',
            object: o,
            name: 'b',
			newValue: 5,
            oldValue: 2 },
        { object: ar,
            type: 'update',
            index: 0,
			newValue: 6,
            oldValue: 3 },
        { type: 'add',
            object: map,
			newValue: 7,
            name: 'd' }
    ]);

    t.end();
});

test('change count optimization', function(t) {
    var bCalcs = 0;
    var cCalcs = 0;
    var a = observable(3);
    var b = observable(function() {
        bCalcs += 1;
        return 4 + a.get() - a.get();
    });
    var c = observable(function() {
        cCalcs += 1;
        return b.get();
    });

    m.observe(c, voidObserver);

    t.equal(b.get(), 4);
    t.equal(c.get(), 4);
    t.equal(bCalcs, 1);
    t.equal(cCalcs, 1);

    a.set(5);

    t.equal(b.get(), 4);
    t.equal(c.get(), 4);
    t.equal(bCalcs, 2);
    t.equal(cCalcs, 1);

    t.equal(mobx.extras.isComputingDerivation(), false);
    t.end();
})

test('observables removed', function(t) {
    var calcs = 0;
    var a = observable(1);
    var b = observable(2);
    var c = observable(function() {
        calcs ++;
        if (a.get() === 1)
        return b.get() * a.get() * b.get();
        return 3;
    });


    t.equal(calcs, 0);
    m.observe(c, voidObserver);
    t.equal(c.get(), 4);
    t.equal(calcs, 1);
    a.set(2);
    t.equal(c.get(), 3);
    t.equal(calcs, 2);

    b.set(3); // should not retrigger calc
    t.equal(c.get(), 3);
    t.equal(calcs, 2);

    a.set(1);
    t.equal(c.get(), 9);
    t.equal(calcs, 3);

    t.equal(mobx.extras.isComputingDerivation(), false);
    t.end();
})

test('lazy evaluation', function (t) {
    var bCalcs = 0;
    var cCalcs = 0;
    var dCalcs = 0;
    var observerChanges = 0;

    var a = observable(1);
    var b = observable(function() {
        bCalcs += 1;
        return a.get() +1;
    });

    var c = observable(function() {
        cCalcs += 1;
        return b.get() +1;
    });

    t.equal(bCalcs, 0);
    t.equal(cCalcs, 0);
    t.equal(c.get(), 3);
    t.equal(bCalcs,1);
    t.equal(cCalcs,1);

    t.equal(c.get(), 3);
    t.equal(bCalcs,2);
    t.equal(cCalcs,2);

    a.set(2);
    t.equal(bCalcs,2);
    t.equal(cCalcs,2);

    t.equal(c.get(), 4);
    t.equal(bCalcs,3);
    t.equal(cCalcs,3);

    var d = observable(function() {
        dCalcs += 1;
        return b.get() * 2;
    });

    var handle = m.observe(d, function() {
        observerChanges += 1;
    }, false);
    t.equal(bCalcs,4);
    t.equal(cCalcs,3);
    t.equal(dCalcs,1); // d is evaluated, so that its dependencies are known

    a.set(3);
    t.equal(d.get(), 8);
    t.equal(bCalcs,5);
    t.equal(cCalcs,3);
    t.equal(dCalcs,2);

    t.equal(c.get(), 5);
    t.equal(bCalcs,5);
    t.equal(cCalcs,4);
    t.equal(dCalcs,2);

    t.equal(b.get(), 4);
    t.equal(bCalcs,5);
    t.equal(cCalcs,4);
    t.equal(dCalcs,2);

    handle(); // unlisten
    t.equal(d.get(), 8);
    t.equal(bCalcs,6); // gone to sleep
    t.equal(cCalcs,4);
    t.equal(dCalcs,3);

    t.equal(observerChanges, 1);

    t.equal(mobx.extras.isComputingDerivation(), false);
    t.end();
})

test('multiple view dependencies', function(t) {
    var bCalcs = 0;
    var dCalcs = 0;
    var a = observable(1);
    var b = observable(function() {
        bCalcs++;
        return 2 * a.get();
    });
    var c = observable(2);
    var d = observable(function() {
        dCalcs++;
        return 3 * c.get();
    });

    var zwitch = true;
    var buffer = [];
    var fCalcs = 0;
    var dis = mobx.autorun(function() {
        fCalcs++;
        if (zwitch)
            buffer.push(b.get() + d.get());
        else
            buffer.push(d.get() + b.get());
    });

    zwitch = false;
    c.set(3);
    t.equal(bCalcs, 1);
    t.equal(dCalcs, 2);
    t.equal(fCalcs, 2);
    t.deepEqual(buffer, [8, 11]);

    c.set(4);
    t.equal(bCalcs, 1);
    t.equal(dCalcs, 3);
    t.equal(fCalcs, 3);
    t.deepEqual(buffer, [8, 11, 14]);

    dis();
    c.set(5);
    t.equal(bCalcs, 1);
    t.equal(dCalcs, 3);
    t.equal(fCalcs, 3);
    t.deepEqual(buffer, [8, 11, 14]);

    t.end();
})

test('nested observable2', function(t) {
    var factor = observable(0);
    var price = observable(100);
    var totalCalcs = 0;
    var innerCalcs = 0;

    var total = observable(function() {
        totalCalcs += 1; // outer observable shouldn't recalc if inner observable didn't publish a real change
        return price.get() * observable(function() {
            innerCalcs += 1;
            return factor.get() % 2 === 0 ? 1 : 3;
        }).get();
    });

    var b = [];
    var sub = m.observe(total, function(x) { b.push(x); }, true);

    price.set(150);
    factor.set(7); // triggers innerCalc twice, because changing the outcome triggers the outer calculation which recreates the inner calculation
    factor.set(5); // doesn't trigger outer calc
    factor.set(3); // doesn't trigger outer calc
    factor.set(4); // triggers innerCalc twice
    price.set(20);

    t.deepEqual(b, [100,150,450,150,20]);
    t.equal(innerCalcs, 9);
    t.equal(totalCalcs, 5);

    t.end();
})

test('expr', function(t) {
    var factor = observable(0);
    var price = observable(100);
    var totalCalcs = 0;
    var innerCalcs = 0;

    var total = observable(function() {
        totalCalcs += 1; // outer observable shouldn't recalc if inner observable didn't publish a real change
        return price.get() * mobx.expr(function() {
            innerCalcs += 1;
            return factor.get() % 2 === 0 ? 1 : 3;
        });
    });

    var b = [];
    var sub = m.observe(total, function(x) { b.push(x); }, true);

    price.set(150);
    factor.set(7); // triggers innerCalc twice, because changing the outcome triggers the outer calculation which recreates the inner calculation
    factor.set(5); // doesn't trigger outer calc
    factor.set(3); // doesn't trigger outer calc
    factor.set(4); // triggers innerCalc twice
    price.set(20);

    t.deepEqual(b, [100,150,450,150,20]);
    t.equal(innerCalcs, 9);
    t.equal(totalCalcs, 5);

    t.end();
})

test('observe', function(t) {
    var x = observable(3);
    var x2 = observable(function() { return x.get() * 2; });
    var b = [];

    var cancel = mobx.autorun(function() {
        b.push(x2.get());
    });

    x.set(4);
    x.set(5);
    t.deepEqual(b, [6, 8, 10]);
    cancel();
    x.set(7);
    t.deepEqual(b, [6, 8, 10]);

    t.end();
})

test('when', function(t) {
    var x = observable(3);

    var called = 0;
    mobx.autorunUntil(function() {
        return (x.get() === 4);
    }, function() {
        called += 1;
    });

    x.set(5);
    t.equal(called, 0);
    x.set(4);
    t.equal(called, 1);
    x.set(3);
    t.equal(called, 1);
    x.set(4);
    t.equal(called, 1);

    t.end();
})

test('when 2', function(t) {
    var x = observable(3);

    var called = 0;
    var d = mobx.when("when x is 3", function() {
        return (x.get() === 3);
    }, function() {
        called += 1;
    });

    t.equal(called, 1);
    t.equal(x.observers.length, 0)
    x.set(5);
    x.set(3);
    t.equal(called, 1);

	t.equal(d.$mobx.name, "when x is 3")

    t.end();
})

test('expr2', function(t) {
    var factor = observable(0);
    var price = observable(100);
    var totalCalcs = 0;
    var innerCalcs = 0;

    var total = observable(function() {
        totalCalcs += 1; // outer observable shouldn't recalc if inner observable didn't publish a real change
        return price.get() * mobx.expr(function() {
            innerCalcs += 1;
            return factor.get() % 2 === 0 ? 1 : 3;
        });
    });

    var b = [];
    var sub = m.observe(total, function(x) { b.push(x); }, true);

    price.set(150);
    factor.set(7); // triggers innerCalc twice, because changing the outcome triggers the outer calculation which recreates the inner calculation
    factor.set(5); // doesn't trigger outer calc
    factor.set(3); // doesn't trigger outer calc
    factor.set(4); // triggers innerCalc twice
    price.set(20);

    t.deepEqual(b, [100,150,450,150,20]);
    t.equal(innerCalcs, 9);
    t.equal(totalCalcs, 5);

    t.end();
})

test('json1', function(t) {
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

    var analyze = observable(function() {
        return [
            o.todos.length,
            o.todos[1].details.url
        ]
    });

    var alltags = observable(function() {
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

    t.deepEqual(mobx.toJSON(o), {
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
    t.deepEqual(mobx.toJSON(o, false), {
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
    t.deepEqual(mobx.toJSON(o, true), mobx.toJSON(o, false));
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

    var cloneA = mobx.toJSON(a, true);
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
			fullName: function() {
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
	function Person() {
		this.firstName = "michel";
		this.lastName = mobx.observable("weststrate");
	}
	
	const p1 = new Person();
	// check before lazy initialization
	t.deepEqual(mobx.toJS(p1), {
		firstName: "michel",
		lastName: "weststrate"
	});

	// check after lazy initialization
	t.deepEqual(mobx.toJS(p1), {
		firstName: "michel",
		lastName: "weststrate"
	});
	
	t.end()
})

function stripSpyOutput(events) {
	events.forEach(ev => {
		delete ev.time;
		delete ev.fn;
		delete ev.object;
	});
	return events;
}

test('issue 50', function(t) {
    m._.resetGlobalState();
    global.__mobxGlobal.mobxGuid = 0;
    var x = observable({
        a: true,
        b: false,
        c: function() {
            events.push("calc c");
            return this.b;
        }
    });

    var result
    var events = [];
    var disposer1 = mobx.autorun(function ar() {
        events.push("auto");
        result = [x.a, x.b, x.c].join(",");
    });

    var disposer2 = mobx.spy(function(info) {
        events.push(info);
    });

    setTimeout(function() {
        mobx.transaction(function() {
            events.push("transstart");
            x.a = !x.a;
            x.b = !x.b;
            events.push("transpreend");
        });
        events.push("transpostend");
        t.equal(result, "false,true,true");
        t.equal(x.c, x.b);

        t.deepEqual(stripSpyOutput(events), [
			'auto',
			'calc c',
			{ name: 'anonymous transaction', spyReportStart: true, target: undefined, type: 'transaction' },
			'transstart',
			{ name: 'a', newValue: false, oldValue: true, spyReportStart: true, type: 'update' }, { spyReportEnd: true },
			{ name: 'b', newValue: true, oldValue: false, spyReportStart: true, type: 'update' }, { spyReportEnd: true },
			'transpreend',
			{ target: { a: false, b: true }, type: 'compute' },
			'calc c',
			{ spyReportStart: true, type: 'reaction' },
			'auto', 
			{ spyReportEnd: true },
			{ spyReportEnd: true },
			'transpostend'			
        ]);

        disposer1();
        disposer2();
        t.end();
    }, 500);

});

test('verify transaction events', function(t) {
    m._.resetGlobalState();
    global.__mobxGlobal.mobxGuid = 0;

    var x = observable({
        b: 1,
        c: function() {
            events.push("calc c");
            return this.b;
        }
    });

    var events = [];
    var disposer1 = mobx.autorun(function ar() {
        events.push("auto");
        x.c;
    });

    var disposer2 = mobx.spy(function(info) {
        events.push(info);
    });

    mobx.transaction(function() {
        events.push("transstart");
        x.b = 1;
        x.b = 2;
        events.push("transpreend");
    });
    events.push("transpostend");

	t.deepEqual(stripSpyOutput(events), [
		'auto',
		'calc c',
		{ name: 'anonymous transaction', spyReportStart: true, target: undefined, type: 'transaction' },
		'transstart',
		{ name: 'b', newValue: 2, oldValue: 1, spyReportStart: true, type: 'update' }, { spyReportEnd: true }, 
		'transpreend', { target: { b: 2 }, type: 'compute' },
		'calc c',
		{ spyReportStart: true, type: 'reaction' },
		'auto',
		{ spyReportEnd: true },
		{ spyReportEnd: true },
		'transpostend'
    ]);

    disposer1();
    disposer2();
    t.end();
});

test("verify array in transaction", function(t) {
    var ar = observable([]);
    var aCount= 0;
    var aValue;

    mobx.autorun(function() {
        aCount++;
        aValue = 0;
        for(var i = 0; i < ar.length; i++)
            aValue += ar[i];
    });

    mobx.transaction(function() {
        ar.push(2);
        ar.push(3);
        ar.push(4);
        ar.unshift(1);
    });
    t.equal(aValue, 10);
    t.equal(aCount, 2);
    t.end();
})

test('delay autorun until end of transaction', function(t) {
    m._.resetGlobalState();
    global.__mobxGlobal.mobxGuid = 0;
    var events = [];
    var x = observable({
        a: 2,
        b: function() {
            events.push("calc y");
            return this.a;
        }
    });
    var disposer1;
    var disposer2 = mobx.spy(function(info) {
        events.push(info);
    });
    var didRun = false;

    mobx.transaction(function() {
        mobx.transaction(function() {

            disposer1 = mobx.autorun(function test() {
                didRun = true;
                events.push("auto");
                x.b;
            });

            t.equal(didRun, false, "autorun should not have run yet");

            x.a = 3;
            x.a = 4;

            events.push("end1");
        });
        t.equal(didRun, false, "autorun should not have run yet");
        x.a = 5;
        events.push("end2");
    });

    t.equal(didRun, true, "autorun should not have run yet");
    events.push("post trans1");
    x.a = 6;
    events.push("post trans2");
    disposer1();
    x.a = 3;
    events.push("post trans3");

    t.deepEqual(stripSpyOutput(events), [
		{ name: 'anonymous transaction', spyReportStart: true, target: undefined, type: 'transaction' },
			{ name: 'anonymous transaction', spyReportStart: true, target: undefined, type: 'transaction' },
				{ name: 'a', newValue: 3, oldValue: 2, spyReportStart: true, type: 'update' }, { spyReportEnd: true }, 
				{ name: 'a', newValue: 4, oldValue: 3, spyReportStart: true, type: 'update' }, { spyReportEnd: true },
				'end1', 
			{ spyReportEnd: true },
			{ name: 'a', newValue: 5, oldValue: 4, spyReportStart: true, type: 'update' }, { spyReportEnd: true },
			'end2', 
			{ spyReportStart: true, type: 'reaction' },
				'auto',
				{ target: { a: 3 }, type: 'compute' },
				'calc y',
			{ spyReportEnd: true },
		{ spyReportEnd: true },
		'post trans1',
		{ name: 'a', newValue: 6, oldValue: 5, spyReportStart: true, type: 'update' },
			{ target: { a: 3 }, type: 'compute' },
			'calc y',
			{ spyReportStart: true, type: 'reaction' },
				'auto',
			{ spyReportEnd: true },
		{ spyReportEnd: true },
		'post trans2', 
		{ name: 'a', newValue: 3, oldValue: 6, spyReportStart: true, type: 'update' }, { spyReportEnd: true },
		'post trans3'
    ]);

    disposer2();
    t.end();
});

test('prematurely end autorun', function(t) {
    var x = observable(2);
    var dis1, dis2;
    mobx.transaction(function() {
        dis1 =  mobx.autorun(function() {
            x.get();
        });
        dis2 =  mobx.autorun(function() {
            x.get();
        });

        t.equal(x.observers.length, 0);
        t.equal(dis1.$mobx.observing.length, 0);
        t.equal(dis2.$mobx.observing.length, 0);

        dis1();
    });
    t.equal(x.observers.length, 1);
    t.equal(dis1.$mobx.observing.length, 0);
    t.equal(dis2.$mobx.observing.length, 1);

    dis2();

    t.equal(x.observers.length, 0);
    t.equal(dis1.$mobx.observing.length, 0);
    t.equal(dis2.$mobx.observing.length, 0);

    t.end();
});

test('issue 65; transaction causing transaction', function(t) {
    var x = mobx.observable({
        a: 3,
        b: function() {
            return mobx.transaction(function() {
                return this.a * 2;
            }, this);
        }
    });

    var res;
    mobx.autorun(function() {
        res = x.a + x.b;
    });

    mobx.transaction(function() {
        x.a = 2;
        x.a = 5;
    });
    t.equal(res, 15);
    t.end();
});

test('issue 71, transacting running transformation', function(t) {
    var state = mobx.observable({
        things: []
    });

    function Thing(value) {
        mobx.extendObservable(this, {
            value: value,
            pos: function() {
                return state.things.indexOf(this);
            },
            isVisible: function() {
                return this.pos !== -1;
            }
        });

        mobx.autorunUntil(function() {
            return this.isVisible;
        }, function() {
            if (this.pos < 4)
                state.things.push(new Thing(value + 1));
        }, this);
    }

    var copy;
    var vSum;
    mobx.autorun(function() {
        copy = state.things.map(function(thing) { return thing.value });
        vSum = state.things.reduce(function(a, thing) {
            return a  + thing.value
        }, 0);
    });

    t.deepEqual(copy, []);

    mobx.transaction(function() {
        state.things.push(new Thing(1));
    });

    t.deepEqual(copy, [1,2,3,4,5]);
    t.equal(vSum, 15);

    state.things.splice(0,2);
    state.things.push(new Thing(6));

    t.deepEqual(copy, [3,4,5,6,7]);
    t.equal(vSum, 25);

    t.end();
});

test('eval in transaction', function(t) {
    var bCalcs = 0;
    var x = mobx.observable({
        a: 1,
        b: function() {
            bCalcs++;
            return this.a * 2;
        }
    });
    var c;

    mobx.autorun(function() {
       c = x.b;
    });

    t.equal(bCalcs, 1);
    t.equal(c, 2);

    mobx.transaction(function() {
        x.a = 3;
        t.equal(x.b, 6);
        t.equal(bCalcs, 2);
        t.equal(c, 2);

        x.a = 4;
        t.equal(x.b, 8);
        t.equal(bCalcs, 3);
        t.equal(c, 2);
    });
    t.equal(bCalcs, 4); // 2 or 3 would be fine as well
    t.equal(c, 8);
    t.end();
})

test('forcefully tracked reaction should still yield valid results', function(t) {
    var x = observable(3);
    var z;
    var runCount = 0;
    var identity = function() {
        runCount++;
        z = x.get();
    };
    var a = new mobx.Reaction("test", function() {
        this.track(identity);
    });
    a.runReaction();

    t.equal(z, 3);
    t.equal(runCount, 1);

    transaction(function() {
        x.set(4);
        a.track(identity);
        t.equal(a.isScheduled(), true);
        t.equal(z, 4);
        t.equal(runCount, 2);
    });

    t.equal(z, 4);
    t.equal(runCount, 3);

    transaction(function() {
        x.set(5);
        t.equal(a.isScheduled(), true);
        a.track(identity);
        t.equal(z, 5);
        t.equal(runCount, 4);
        t.equal(a.isScheduled(), true);

        x.set(6);
        t.equal(z, 5);
        t.equal(runCount, 4);
    });
    t.equal(a.isScheduled(), false);
    t.equal(z, 6);
    t.equal(runCount, 5);
    t.end();
});

test('autoruns created in autoruns should kick off', function(t) {
	var x = observable(3);
	var x2 = [];
	var d;

	var a = m.autorun(function() {
		if (d) {
			// dispose previous autorun
			d();
		}
		d = m.autorun(function() {
			x2.push(x.get() * 2);
		});
	})

	// a should be observed by the inner autorun, not the outer
	t.equal(a.$mobx.observing.length, 0);
	t.equal(d.$mobx.observing.length, 1);

	x.set(4);
	t.deepEqual(x2, [6, 8]);


	t.end();
});

test('#328 atom throwing exception if observing stuff in onObserved', t => {
	var b = mobx.observable(1)
	var a = new mobx.Atom('test atom', () => {
		b.get();
	});
	var d = mobx.autorun(() => {
		a.reportObserved(); // threw
	})
	d();
	t.end()
});

