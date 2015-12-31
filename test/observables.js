var test = require('tape');
var mobservable = require('..');
var m = mobservable.observable;
var observable = mobservable.observable;

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

test('basic', function(t) {
    var x = m(3);
    var b = buffer();
    x.observe(b);
    t.equal(3, x());

    x(5);
    t.equal(5, x());
    t.deepEqual([5], b.toArray());
    t.equal(mobservable._.isComputingView(), false);
    t.end();
})

test('basic2', function(t) {
    var x = observable(3);
    var z = observable(function () { return x() * 2});
    var y = observable(function () { return x() * 3});

    debugger;
    z.observe(voidObserver);

    t.equal(z(), 6);
    t.equal(y(), 9);

    x(5);
    t.equal(z(), 10);
    t.equal(y(), 15);

    t.equal(mobservable._.isComputingView(), false);
    t.end();
})

test('dynamic', function(t) {
    try {
        var x = m(3);
        var y = m(function() {
            return x();
        });
        var b = buffer();
        y.observe(b, true);

        t.equal(3, y()); // First evaluation here..

        x(5);
        t.equal(5, y());

        t.deepEqual(b.toArray(), [3, 5]);
        t.equal(mobservable._.isComputingView(), false);

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
            return x() * x();
        });

        t.equal(9, y());
        var b = buffer();
        y.observe(b);

        x(5);
        t.equal(25, y());

        //no intermediate value 15!
        t.deepEqual([25], b.toArray());
        t.equal(mobservable._.isComputingView(), false);

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
            return order.price() * (1+vat());
        });

        order.priceWithVat.observe(b);

        order.price(20);
        order.price(10);
        t.deepEqual([24,12],b.toArray());
        t.equal(mobservable._.isComputingView(), false);

        t.end();
    } catch (e) {
        console.log(e.stack); throw e;
    }
})

test('batch', function(t) {
    var a = observable(2);
    var b = observable(3);
    var c = observable(function() { return a() * b() });
    var d = observable(function() { return c() * b() });
    var buf = buffer();
    d.observe(buf);
    debugger;
    a(4);
    b(5);
    // Note, 60 should not happen! (that is d beign computed before c after update of b)
    t.deepEqual(buf.toArray(), [36, 100]);

    var x = mobservable.transaction(function() {
        a(2);
        b(3);
        a(6);
        t.deepEqual(100, d()); // still hunderd
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
        return a() * 2;
    });

    // if not inspected during transaction, postpone value to end
    mobservable.transaction(function() {
        a(3);
        t.equal(b(), 6);
        t.equal(calcs, 1);
    });
    t.equal(b(), 6);
    t.equal(calcs, 2);

    // if inspected, evaluate eagerly
    mobservable.transaction(function() {
        a(4);
        t.equal(b(), 8);
        t.equal(calcs, 3);
    });
    t.equal(b(), 8);
    t.equal(calcs, 4);

    t.end();
});

test('transaction with inspection 2', function(t) {
    var a = observable(2);
    var calcs = 0;
    var b;
    mobservable.autorun(function() {
        calcs++;
        b = a() * 2;
    });

    // if not inspected during transaction, postpone value to end
    mobservable.transaction(function() {
        a(3);
        t.equal(b, 4);
        t.equal(calcs, 1);
    });
    t.equal(b, 6);
    t.equal(calcs, 2);

    // if inspected, evaluate eagerly
    mobservable.transaction(function() {
        a(4);
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
            return (1+vat()) * this.price() * this.amount();
        }, this);
    };

    var order = new Order();
    order.total.observe(voidObserver);
    order.price(10);
    order.amount(3);
    t.equal(36, order.total());
    t.equal(mobservable._.isComputingView(), false);

    t.end();
})

test('props1', function(t) {
    var vat = observable(0.2);
    var Order = function() {
        mobservable.extendObservable(this, {
            'price' : 20,
            'amount' : 2,
            'total': function() {
                return (1+vat()) * this.price * this.amount; // price and amount are now properties!
            }
        });
    };

    var order = new Order();
    t.equal(48, order.total);
    order.price = 10;
    order.amount = 3;
    t.equal(36, order.total);

    var totals = [];
    var sub = mobservable.autorun(function() {
        totals.push(order.total);
    });
    order.amount = 4;
    sub();
    order.amount = 5;
    t.deepEqual(totals, [36,48]);

    t.equal(mobservable._.isComputingView(), false);
    t.end();
})

test('props2', function(t) {
    var vat = observable(0.2);
    var Order = function() {
        mobservable.extendObservable(this, {
            price: 20,
            amount: 2,
            total: function() {
                return (1+vat()) * this.price * this.amount; // price and amount are now properties!
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
            return (1+vat()) * this.price * this.amount; // price and amount are now properties!
        };
        mobservable.extendObservable(this, this);
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
        mobservable.extendObservable(this, {
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
    mobservable.extendObservable(x, {
        b: 2,
        c: 2
    }, {
        c: 3,
        d: 4
    }, {
        a: 5
    });
    
    var sum = 0;
    var disposer = mobservable.autorun(function() {
        sum = x.a + x.b + x.c + x.d;
    });
    t.equal(sum, 14);
    x.a = 1;
    t.equal(sum, 10);
    
    t.end();
})

test('object enumerable props', function(t) {
    var x = mobservable.observable({
        a: 3,
        b: function() {
            return 2 * this.a;
        }
    });
    mobservable.extendObservable(x, { c: 4 });
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
        mobservable.extendObservable(this, {
            chocolateBar: chocolateBar,
            calories: function () {
                return this.chocolateBar.calories;
            }
        });
    };

    var snickers = mobservable.observable({
        calories: null
    });
    var mars = mobservable.observable({
        calories: undefined
    });

    var wrappedSnickers = new Wrapper(snickers);
    var wrappedMars = new Wrapper(mars);

    var disposeSnickers = mobservable.autorun(function () {
        sb.push(wrappedSnickers.calories);
    });
    var disposeMars = mobservable.autorun(function () {
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
    var stop = a.$mobservable.observe(function(change) {
        events.push(change);
    });
    
    a.a = 2;
    mobservable.extendObservable(a, {
        a: 3, b: 3
    });
    a.a = 4;
    a.b = 5;
    t.deepEqual(events, [
        { type: 'update',
            object: a,
            name: 'a',
            oldValue: 1 },
        { type: 'update',
            object: a,
            name: 'a',
            oldValue: 2 },
        { type: 'add',
            object: a,
            name: 'b' },
        { type: 'update',
            object: a,
            name: 'a',
            oldValue: 3 },
        { type: 'update',
            object: a,
            name: 'b',
            oldValue: 3 } 
    ]);

    stop();
    events = [];
    a.a = 6;
    t.equals(events.length, 0);
    
    t.end();
});

test('mobservable.observe', function(t) {
    var events = [];
    var po = { a: 1 };
    var o = observable({ b: 2 });
    var ar = observable([ 3 ]);
    var map = mobservable.map({ });
    
    var push = function(event) { events.push(event); };
    
    var stop1 = mobservable.observe(po, push);
    var stop2 = mobservable.observe(o, push);
    var stop3 = mobservable.observe(ar, push);
    var stop4 = mobservable.observe(map, push);
    
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
            oldValue: 1 },
        { type: 'update',
            object: o,
            name: 'b',
            oldValue: 2 },
        { object: ar,
            type: 'update',
            index: 0,
            oldValue: 3 },
        { type: 'add',
            object: map,
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
        return 4 + a() - a();
    });
    var c = observable(function() {
        cCalcs += 1;
        return b();
    });

    c.observe(voidObserver);

    t.equal(b(), 4);
    t.equal(c(), 4);
    t.equal(bCalcs, 1);
    t.equal(cCalcs, 1);

    a(5);

    t.equal(b(), 4);
    t.equal(c(), 4);
    t.equal(bCalcs, 2);
    t.equal(cCalcs, 1);

    t.equal(mobservable._.isComputingView(), false);
    t.end();
})

test('observables removed', function(t) {
    var calcs = 0;
    var a = observable(1);
    var b = observable(2);
    var c = observable(function() {
        calcs ++;
        if (a() === 1)
        return b() * a() * b();
        return 3;
    });


    t.equal(calcs, 0);
    c.observe(voidObserver);
    t.equal(c(), 4);
    t.equal(calcs, 1);
    a(2);
    t.equal(c(), 3);
    t.equal(calcs, 2);

    b(3); // should not retrigger calc
    t.equal(c(), 3);
    t.equal(calcs, 2);

    a(1);
    t.equal(c(), 9);
    t.equal(calcs, 3);

    t.equal(mobservable._.isComputingView(), false);
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
        return a() +1;
    });

    var c = observable(function() {
        cCalcs += 1;
        return b() +1;
    });

    t.equal(bCalcs, 0);
    t.equal(cCalcs, 0);
    t.equal(c(), 3);
    t.equal(bCalcs,1);
    t.equal(cCalcs,1);

    t.equal(c(), 3);
    t.equal(bCalcs,2);
    t.equal(cCalcs,2);

    a(2);
    t.equal(bCalcs,2);
    t.equal(cCalcs,2);

    t.equal(c(), 4);
    t.equal(bCalcs,3);
    t.equal(cCalcs,3);

    var d = observable(function() {
        dCalcs += 1;
        return b() * 2;
    });

    var handle = d.observe(function() {
        observerChanges += 1;
    }, false);
    t.equal(bCalcs,4);
    t.equal(cCalcs,3);
    t.equal(dCalcs,1); // d is evaluated, so that its dependencies are known

    a(3);
    t.equal(d(), 8);
    t.equal(bCalcs,5);
    t.equal(cCalcs,3);
    t.equal(dCalcs,2);

    t.equal(c(), 5);
    t.equal(bCalcs,5);
    t.equal(cCalcs,4);
    t.equal(dCalcs,2);

    t.equal(b(), 4);
    t.equal(bCalcs,5);
    t.equal(cCalcs,4);
    t.equal(dCalcs,2);

    handle(); // unlisten
    t.equal(d(), 8);
    t.equal(bCalcs,6); // gone to sleep
    t.equal(cCalcs,4);
    t.equal(dCalcs,3);

    t.equal(observerChanges, 1);

    t.equal(mobservable._.isComputingView(), false);
    t.end();
})

test('multiple view dependencies', function(t) {
    var bCalcs = 0;
    var dCalcs = 0;
    var a = m(1);
    var b = m(function() {
        bCalcs++;
        return 2 * a();
    });
    var c = m(2);
    var d = m(function() {
        dCalcs++;
        return 3 * c();
    })

    var zwitch = true;
    var buffer = [];
    var fCalcs = 0;
    var dis = mobservable.autorun(function() {
        fCalcs++;
        if (zwitch)
            buffer.push(b() + d());
        else
            buffer.push(d() + b());
    });

    zwitch = false;
    c(3);
    t.equal(bCalcs, 1);
    t.equal(dCalcs, 2);
    t.equal(fCalcs, 2);
    t.deepEqual(buffer, [8, 11]);

    c(4);
    t.equal(bCalcs, 1);
    t.equal(dCalcs, 3);
    t.equal(fCalcs, 3);
    t.deepEqual(buffer, [8, 11, 14]);

    dis();
    c(5);
    t.equal(bCalcs, 1);
    t.equal(dCalcs, 3);
    t.equal(fCalcs, 3);
    t.deepEqual(buffer, [8, 11, 14]);
    
    t.end();
})

test('nested observable2', function(t) {
    var factor = m(0);
    var price = m(100);
    var totalCalcs = 0;
    var innerCalcs = 0;

    var total = m(function() {
        totalCalcs += 1; // outer observable shouldn't recalc if inner observable didn't publish a real change
        return price() * m(function() {
            innerCalcs += 1;
            return factor() % 2 === 0 ? 1 : 3;
        })();
    });

    var b = [];
    var sub = total.observe(function(x) { b.push(x); }, true);

    price(150);
    factor(7); // triggers innerCalc twice, because changing the outcome triggers the outer calculation which recreates the inner calculation
    factor(5); // doesn't trigger outer calc
    factor(3); // doesn't trigger outer calc
    factor(4); // triggers innerCalc twice
    price(20);

    t.deepEqual(b, [100,150,450,150,20]);
    t.equal(innerCalcs, 9);
    t.equal(totalCalcs, 5);

    t.end();
})

test('expr', function(t) {
    var factor = m(0);
    var price = m(100);
    var totalCalcs = 0;
    var innerCalcs = 0;

    var total = m(function() {
        totalCalcs += 1; // outer observable shouldn't recalc if inner observable didn't publish a real change
        return price() * m(function() {
            innerCalcs += 1;
            return factor() % 2 === 0 ? 1 : 3;
        })();
    });

    var b = [];
    var sub = total.observe(function(x) { b.push(x); }, true);

    price(150);
    factor(7); // triggers innerCalc twice, because changing the outcome triggers the outer calculation which recreates the inner calculation
    factor(5); // doesn't trigger outer calc
    factor(3); // doesn't trigger outer calc
    factor(4); // triggers innerCalc twice
    price(20);

    t.deepEqual(b, [100,150,450,150,20]);
    t.equal(innerCalcs, 9);
    t.equal(totalCalcs, 5);

    t.end();
})

test('observe', function(t) {
    var x = m(3);
    var x2 = m(function() { return x() * 2; });
    var b = [];

    var cancel = mobservable.autorun(function() {
        b.push(x2());
    });

    x(4);
    x(5);
    t.deepEqual(b, [6, 8, 10]);
    cancel();
    x(7);
    t.deepEqual(b, [6, 8, 10]);

    t.end();
})

test('when', function(t) {
    var x = m(3);

    var called = 0;
    mobservable.autorunUntil(function() {
        return (x() === 4);
    }, function() {
        called += 1;
    });

    x(5);
    t.equal(called, 0);
    x(4);
    t.equal(called, 1);
    x(3);
    t.equal(called, 1);
    x(4);
    t.equal(called, 1);
    
    t.end();
})

test('when 2', function(t) {
    var x = m(3);

    var called = 0;
    mobservable.autorunUntil(function() {
        return (x() === 3);
    }, function() {
        called += 1;
    });

    t.equal(called, 1);
    t.equal(x.$mobservable.observers.length, 0)
    x(5);
    x(3);
    t.equal(called, 1);
    
    t.end();
})

test('async', function(t) {
    var called = 0;
    var x = m(3);
    var y = m(1);
   
    var value;
    
    var disposer = mobservable.autorunAsync(
        function() {
            return x() * y();
        }, function(newValue) {
            called += 1;
            value = newValue;
        }
    );
    
    x(4);
    x(5);
    y(2);
    
    setTimeout(function() {
        t.equal(called, 1);
        t.equal(value, 10);

        x(4);
        x(6);
        y(1);
        
        setTimeout(function() {
            t.equal(called, 2);
            t.equal(value, 6);
            
            x(7);
            disposer();
            // after calling disposer, autorunAsync should not update anymore! even if its scheduled
            
            setTimeout(function() {
                t.equal(called, 2);
                t.equal(value, 6);
                t.end();
            }, 10);
        }, 10);
    }, 10);
})

test('expr2', function(t) {
    var factor = m(0);
    var price = m(100);
    var totalCalcs = 0;
    var innerCalcs = 0;
    
    var total = m(function() {
        totalCalcs += 1; // outer observable shouldn't recalc if inner observable didn't publish a real change
        return price() * mobservable.expr(function() {
            innerCalcs += 1;
            return factor() % 2 === 0 ? 1 : 3;
        });
    });
    
    var b = [];
    var sub = total.observe(function(x) { b.push(x); }, true);
    
    price(150);
    factor(7); // triggers innerCalc twice, because changing the outcome triggers the outer calculation which recreates the inner calculation
    factor(5); // doesn't trigger outer calc
    factor(3); // doesn't trigger outer calc
    factor(4); // triggers innerCalc twice
    price(20);
    
    t.deepEqual(b, [100,150,450,150,20]);
    t.equal(innerCalcs, 9);
    t.equal(totalCalcs, 5);    
    
    t.end();
})

test('json1', function(t) {
    var todos = m([
        {
            title: "write blog"
        },
        {
            title: "improve coverge"
        }
    ]);

    var output;
    mobservable.autorun(function() {
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

    var o = mobservable.observable(source);

    //console.log(JSON.stringify(source,null,4));
    t.deepEqual(mobservable.toJSON(o), source);
    t.deepEqual(source, o);

    var analyze = m(function() {
        return [
            o.todos.length,
            o.todos[1].details.url
        ]
    });

    var alltags = m(function() {
        return o.todos.map(function(todo) {
            return todo.tags.join(",");
        }).join(",");
    });

    var ab = [];
    var tb = [];

    analyze.observe(function(d) { ab.push(d); }, true);
    alltags.observe(function(d) { tb.push(d); }, true);

    o.todos[0].details.url = "boe";
    o.todos[1].details.url = "ba";
    o.todos[0].tags[0] = "reactjs";
    o.todos[1].tags.push("pff");

    t.deepEqual(mobservable.toJSON(o), {
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

    o.todos.push(mobservable.observable({
        title: "test",
        tags: ["x"]
    }));

    t.deepEqual(o, {
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

    o.todos[1] = mobservable.observable({
        title: "clean the attic",
        tags: ["needs sabbatical"],
        details: {
            url: "booking.com"
        }
    });
    t.deepEqual(o, {
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

    o.todos[1].details = mobservable.observable({ url: "google" });
    o.todos[1].tags = ["foo", "bar"];
    t.deepEqual(mobservable.toJSON(o, false), {
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
    t.deepEqual(o, mobservable.toJSON(o));
    t.deepEqual(ab, [[3, "google"]]);
    t.deepEqual(tb, ["reactjs,frp,foo,bar,x"]);

    t.end();
})

test('json cycles', function(t) {
    var a = observable({
        b: 1,
        c: [2],
        d: mobservable.map(),
        e: a
    });
    
    a.e = a;
    a.c.push(a, a.d);
    a.d.set("f", a);
    a.d.set("d", a.d);
    a.d.set("c", a.c);

    var cloneA = mobservable.toJSON(a, true);
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

test('issue 50', function(t) {
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
    var disposer1 = mobservable.autorun(function ar() {
        events.push("auto");
        result = [x.a, x.b, x.c].join(",");
    });
    
    var disposer2 = mobservable.extras.trackTransitions(true, function(info) {
        events.push([info.state, info.name]);
    });
    
    setTimeout(function() {
        mobservable.transaction(function() {
            events.push("transstart");
            x.a = !x.a;
            x.b = !x.b;
            events.push("transpreend");
        });
        events.push("transpostend");
        t.equal(result, "false,true,true");
        t.equal(x.c, x.b);
  
        t.deepEqual(events, [
             'auto', 
             'calc c', 
             'transstart', 
             [ 'STALE', '.a' ], 
             [ 'STALE', 'ar' ],
             [ 'STALE', '.b' ], 
             [ 'STALE', '.c' ], 
             'transpreend', 
             [ 'READY', '.a' ], 
             [ 'READY', '.b' ], 
             [ 'PENDING', '.c' ], 
             'calc c', 
             [ 'READY', '.c' ], 
             [ 'PENDING', 'ar' ], 
             'auto', 
             [ 'READY', 'ar' ], 
             'transpostend' 
        ]);
        
        disposer1();
        disposer2();
        t.end();
    }, 500);
    
});

test('verify transaction events', function(t) {
    var x = observable({
        b: 1,
        c: function() {
            events.push("calc c");
            return this.b;
        }
    });
    
    var events = [];
    var disposer1 = mobservable.autorun(function ar() {
        events.push("auto");
        x.c;
    });
    
    var disposer2 = mobservable.extras.trackTransitions(true, function(info) {
        events.push([info.state, info.name]);
    });
    
    mobservable.transaction(function() {
        events.push("transstart");
        x.b = 1;
        x.b = 2;
        events.push("transpreend");
    });
    events.push("transpostend");

    t.deepEqual(events, [
            'auto', 
            'calc c', 
            'transstart', 
            [ 'STALE', '.b' ], 
            [ 'STALE', '.c' ],
            [ 'STALE', 'ar' ],
            'transpreend', 
            [ 'READY', '.b' ], 
            [ 'PENDING', '.c' ], 
            'calc c', 
            [ 'READY', '.c' ], 
            [ 'PENDING', 'ar' ], 
            'auto', 
            [ 'READY', 'ar' ], 
            'transpostend' 
    ]);
    
    disposer1();
    disposer2();
    t.end();
});

test("verify array in transaction", function(t) {
    var ar = m([]);
    var aCount= 0;
    var aValue;
    
    mobservable.autorun(function() {
        aCount++;
        aValue = 0;
        for(var i = 0; i < ar.length; i++)
            aValue += ar[i];
    });
    
    mobservable.transaction(function() {
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
    var events = [];
    var x = observable({
        a: 2,
        b: function() {
            events.push("calc y");
            return this.a;
        }
    });
    var disposer1; 
    var disposer2 = mobservable.extras.trackTransitions(true, function(info) {
        events.push([info.state, info.name]);
    });

    mobservable.transaction(function() {
        mobservable.transaction(function() {
            
            disposer1 = mobservable.autorun(function test() {
                events.push("auto");
                x.b;
            });
            
            x.a = 3;
            x.a = 4;
            
            events.push("end1");
        });
        x.a = 5;
        events.push("end2");
    });
    events.push("post trans1");
    x.a = 6;
    events.push("post trans2");
    disposer1();
    x.a = 3;
    events.push("post trans3");

    t.deepEqual(events, [
            [ 'STALE', '.a' ], 
            [ 'STALE', '.a' ],
            "end1",
            [ 'STALE', '.a' ],
            "end2",
            [ 'READY', '.a'],
            [ 'READY', '.a'],
            [ 'READY', '.a'],
            [ 'PENDING', 'test'],
            'auto',
            [ 'PENDING', '.b'],
            'calc y',
            [ 'READY', '.b'],
            [ 'READY', 'test'],
            "post trans1",
            [ 'STALE', '.a'],
            [ 'STALE', '.b'],
            [ 'STALE', 'test' ],
            [ 'READY', '.a'],
            [ 'PENDING', '.b'],
            'calc y',
            [ 'READY', '.b'],
            [ 'PENDING', 'test'],
            "auto",
            [ 'READY', 'test'],
            'post trans2',
            [ 'STALE', '.a'],
            [ 'READY', '.a'],
            'post trans3'
    ]);
    
    disposer2();
    t.end();
});

test('prematurely end autorun', function(t) {
    var x = observable(2);
    var dis1, dis2;
    mobservable.transaction(function() {
        dis1 =  mobservable.autorun(function() {
            x();
        });
        dis2 =  mobservable.autorun(function() {
            x();
        });

        t.equal(x.$mobservable.observers.length, 0);
        t.equal(x.$mobservable.externalRefenceCount, 0);
        t.equal(dis1.$mobservable.observing.length, 0);
        t.equal(dis2.$mobservable.observing.length, 0);
        
        dis1();

    });
    t.equal(x.$mobservable.observers.length, 1);
    t.equal(dis1.$mobservable.externalRefenceCount, 0);
    t.equal(dis2.$mobservable.externalRefenceCount, 1);
    t.equal(dis1.$mobservable.observing.length, 0);
    t.equal(dis2.$mobservable.observing.length, 1);
    
    dis2();

    t.equal(x.$mobservable.observers.length, 0);
    t.equal(dis1.$mobservable.externalRefenceCount, 0);
    t.equal(dis2.$mobservable.externalRefenceCount, 0);
    t.equal(dis1.$mobservable.observing.length, 0);
    t.equal(dis2.$mobservable.observing.length, 0);
    
    t.end();
});

test('isComputing', function(t) {
    mobservable.autorun(function() {
        t.equal(mobservable.extras.isComputingView(), true);
        mobservable.expr(function() {
            t.equal(mobservable.extras.isComputingView(), true);
        });
        mobservable.untracked(function() {
            t.equal(mobservable.extras.isComputingView(), false);
            mobservable.observable(function() {
                t.equal(mobservable.extras.isComputingView(), false);
            })();
            mobservable.autorun(function() {
                t.equal(mobservable.extras.isComputingView(), true);
                mobservable.untracked(function() {
                    t.equal(mobservable.extras.isComputingView(), false);
                });
            });
        });
    });
    t.end();
});

test('issue 65; transaction causing transaction', function(t) {
    var x = mobservable.observable({
        a: 3,
        b: function() {
            return mobservable.transaction(function() {
                return this.a * 2;
            }, this);
        }
    });
    
    var res;
    mobservable.autorun(function() {
        res = x.a + x.b;
    });
    
    mobservable.transaction(function() {
        x.a = 2;
        x.a = 5;
    });
    t.equal(res, 15);
    t.end();
});

test('issue 71, transacting running transformation', function(t) {
    var state = mobservable.observable({
        things: []
    });
    
    function Thing(value) {
        mobservable.extendObservable(this, {
            value: value,
            pos: function() {
                return state.things.indexOf(this);
            },
            isVisible: function() {
                return this.pos !== -1;
            }
        });

        mobservable.observeUntil(function() {
            return this.isVisible;
        }, function() {
            if (this.pos < 4)
                state.things.push(new Thing(value + 1));
        }, this);
    }
    
    var copy;
    var vSum;
    mobservable.autorun(function() {
        copy = state.things.map(function(thing) { return thing.value });
        vSum = state.things.reduce(function(a, thing) {
            return a  + thing.value
        }, 0);
    });
    
    t.deepEqual(copy, []);
    
    mobservable.transaction(function() {
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
    var x = mobservable.observable({
        a: 1,
        b: function() {
            bCalcs++;
            return this.a * 2;
        }
    });
    var c;
    
    mobservable.autorun(function() {
       c = x.b; 
    });
    
    t.equal(bCalcs, 1);
    t.equal(c, 2);
    
    mobservable.transaction(function() {
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