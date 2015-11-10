var mobservable = require('mobservable');
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

exports.basic = function(test) {
    var x = m(3);
    var b = buffer();
    x.observe(b);
    test.equal(3, x());

    x(5);
    test.equal(5, x());
    test.deepEqual([5], b.toArray());
    test.equal(mobservable._.isComputingView(), false);
    test.done();
}

exports.basic2 = function(test) {
    var x = observable(3);
    var z = observable(function () { return x() * 2});
    var y = observable(function () { return x() * 3});

    z.observe(voidObserver);

    test.equal(z(), 6);
    test.equal(y(), 9);

    x(5);
    test.equal(z(), 10);
    test.equal(y(), 15);

    test.equal(mobservable._.isComputingView(), false);
    test.done();
}

exports.dynamic = function(test) {
    try {
        var x = m(3);
        var y = m(function() {
            return x();
        });
        var b = buffer();
        y.observe(b, true);

        test.equal(3, y()); // First evaluation here..

        x(5);
        test.equal(5, y());

        test.deepEqual([3, 5], b.toArray());
        test.equal(mobservable._.isComputingView(), false);

        test.done();
    }
    catch(e) {
        console.log(e.stack);
    }
}

exports.dynamic2 = function(test) {
    try {
        var x = observable(3);
        var y = observable(function() {
            return x() * x();
        });

        test.equal(9, y());
        var b = buffer();
        y.observe(b);

        x(5);
        test.equal(25, y());

        //no intermediate value 15!
        test.deepEqual([25], b.toArray());
        test.equal(mobservable._.isComputingView(), false);

        test.done();
    }
    catch(e) {
        console.log(e.stack);
    }
}

exports.readme1 = function(test) {
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
        test.deepEqual([24,12],b.toArray());
        test.equal(mobservable._.isComputingView(), false);

        test.done();
    } catch (e) {
        console.log(e.stack); throw e;
    }
}

exports.testBatch = function(test) {
    var a = observable(2);
    var b = observable(3);
    var c = observable(function() { return a() * b() });
    var d = observable(function() { return c() * b() });
    var buf = buffer();
    d.observe(buf);

    a(4);
    b(5);
    // Note, 60 should not happen! (that is d beign computed before c after update of b)
    test.deepEqual([36, 100], buf.toArray());

    var x = mobservable.transaction(function() {
        a(2);
        b(3);
        a(6);
        test.deepEqual(100, d()); // still hunderd
        return 2;
    });

    test.equal(x, 2); // test return value
    test.deepEqual([36, 100, 54], buf.toArray());// only one new value for d
    test.done();
}

exports.testTransactionWithIntermediateEvaluation = function(test) {
    var a = observable(2);
    var calcs = 0;
    var b = observable(function() {
        calcs++;
        return a() * 2;
    });

    // if not inspected during transaction, postpone value to end
    mobservable.transaction(function() {
        a(3);
        test.equal(b(), 6);
        test.equal(calcs, 1);
    });
    test.equal(b(), 6);
    test.equal(calcs, 2);

    // if inspected, evaluate eagerly
    mobservable.transaction(function() {
        a(4);
        test.equal(b(), 8);
        test.equal(calcs, 1);
    });
    test.equal(b(), 8);
    test.equal(calcs, 2);

    test.done();
}

exports.testTransactionWithIntermediateEvaluation = function(test) {
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
        test.equal(b, 4);
        test.equal(calcs, 1);
    });
    test.equal(b, 6);
    test.equal(calcs, 2);

    // if inspected, evaluate eagerly
    mobservable.transaction(function() {
        a(4);
        test.equal(b, 6);
        test.equal(calcs, 2);
    });
    test.equal(b, 8);
    test.equal(calcs, 3);

    test.done();
}

exports.testScope = function(test) {
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
    test.equals(36, order.total());
    test.equal(mobservable._.isComputingView(), false);

    test.done();
}

exports.testProps1 = function(test) {
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
    test.equals(48, order.total);
    order.price = 10;
    order.amount = 3;
    test.equals(36, order.total);

    var totals = [];
    var sub = mobservable.autorun(function() {
        totals.push(order.total);
    });
    order.amount = 4;
    sub();
    order.amount = 5;
    test.deepEqual(totals, [36,48]);

    test.equal(mobservable._.isComputingView(), false);
    test.done();
};

exports.testProps2 = function(test) {
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
    test.equals(48, order.total);
    order.price = 10;
    order.amount = 3;
    test.equals(36, order.total);
    test.done();
};

exports.testProps3 = function(test) {
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
    test.equals(48, order.total);
    order.price = 10;
    order.amount = 3;
    test.equals(36, order.total);
    test.done();
};

exports.testProps4 = function(test) {
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
    test.equal(x.sum, 3);
    x.fluff.push(3);
    test.equal(x.sum, 6);
    x.fluff = [5,6];
    test.equal(x.sum, 11);
    x.fluff.push(2);
    test.equal(x.sum, 13);
    test.done();
}

exports.testProps5 = function(test) {
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
    test.equal(sum, 14);
    x.a = 1;
    test.equal(sum, 10);
    
    test.done();
}

exports.test_object_enumerable_props = function(test) {
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
    test.deepEqual(ar, ['a', 'c']); // or should 'b' be in here as well?
    test.done();    
}


exports.testObserveProperty = function(test) {
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

    test.deepEqual(sb, [null, 10]);
    test.deepEqual(mb, [undefined, 15]);

    test.done();
}

exports.testObserveObject = function(test) {
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
    test.deepEqual(events, [
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
    test.equals(events.length, 0);
    
    test.done();
}

exports.testObserve = function(test) {
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
    
    test.deepEqual(events, [ 
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
    
    test.done();
}

exports.testChangeCountOptimization = function(test) {
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

    test.equals(b(), 4);
    test.equals(c(), 4);
    test.equals(bCalcs, 1);
    test.equals(cCalcs, 1);

    a(5);

    test.equals(b(), 4);
    test.equals(c(), 4);
    test.equals(bCalcs, 2);
    test.equals(cCalcs, 1);

    test.equal(mobservable._.isComputingView(), false);
    test.done();
}

exports.testObservablesRemoved = function(test) {
    var calcs = 0;
    var a = observable(1);
    var b = observable(2);
    var c = observable(function() {
        calcs ++;
        if (a() === 1)
        return b() * a() * b();
        return 3;
    });


    test.equals(calcs, 0);
    c.observe(voidObserver);
    test.equals(c(), 4);
    test.equals(calcs, 1);
    a(2);
    test.equals(c(), 3);
    test.equals(calcs, 2);

    b(3); // should not retrigger calc
    test.equals(c(), 3);
    test.equals(calcs, 2);

    a(1);
    test.equals(c(), 9);
    test.equals(calcs, 3);

    test.equal(mobservable._.isComputingView(), false);
    test.done();
}


exports.testLazyEvaluation = function (test) {
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

    test.equal(bCalcs, 0);
    test.equal(cCalcs, 0);
    test.equal(c(), 3);
    test.equal(bCalcs,1);
    test.equal(cCalcs,1);

    test.equal(c(), 3);
    test.equal(bCalcs,2);
    test.equal(cCalcs,2);

    a(2);
    test.equal(bCalcs,2);
    test.equal(cCalcs,2);

    test.equal(c(), 4);
    test.equal(bCalcs,3);
    test.equal(cCalcs,3);

    var d = observable(function() {
        dCalcs += 1;
        return b() * 2;
    });

    var handle = d.observe(function() {
        observerChanges += 1;
    }, false);
    test.equal(bCalcs,4);
    test.equal(cCalcs,3);
    test.equal(dCalcs,1); // d is evaluated, so that its dependencies are known

    a(3);
    test.equal(d(), 8);
    test.equal(bCalcs,5);
    test.equal(cCalcs,3);
    test.equal(dCalcs,2);

    test.equal(c(), 5);
    test.equal(bCalcs,5);
    test.equal(cCalcs,4);
    test.equal(dCalcs,2);

    test.equal(b(), 4);
    test.equal(bCalcs,5);
    test.equal(cCalcs,4);
    test.equal(dCalcs,2);

    handle(); // unlisten
    test.equal(d(), 8);
    test.equal(bCalcs,6); // gone to sleep
    test.equal(cCalcs,4);
    test.equal(dCalcs,3);

    test.equal(observerChanges, 1);

    test.equal(mobservable._.isComputingView(), false);
    test.done();
};

exports.test_multiple_view_dependencies = function(test) {
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
    test.equals(bCalcs, 1);
    test.equals(dCalcs, 2);
    test.equals(fCalcs, 2);
    test.deepEqual(buffer, [8, 11]);

    c(4);
    test.equals(bCalcs, 1);
    test.equals(dCalcs, 3);
    test.equals(fCalcs, 3);
    test.deepEqual(buffer, [8, 11, 14]);

    dis();
    c(5);
    test.equals(bCalcs, 1);
    test.equals(dCalcs, 3);
    test.equals(fCalcs, 3);
    test.deepEqual(buffer, [8, 11, 14]);
    
    test.done();
}

exports.test_nested_observable2 = function(test) {
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

    test.deepEqual(b, [100,150,450,150,20]);
    test.equal(innerCalcs, 9);
    test.equal(totalCalcs, 5);

    test.done();
};

exports.test_expr = function(test) {
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

    test.deepEqual(b, [100,150,450,150,20]);
    test.equal(innerCalcs, 9);
    test.equal(totalCalcs, 5);

    test.done();
};

exports.test_observe = function(test) {
    var x = m(3);
    var x2 = m(function() { return x() * 2; });
    var b = [];

    var cancel = mobservable.autorun(function() {
        b.push(x2());
    });

    x(4);
    x(5);
    test.deepEqual(b, [6, 8, 10]);
    cancel();
    x(7);
    test.deepEqual(b, [6, 8, 10]);

    test.done();
};
exports.test_when = function(test) {
    var x = m(3);

    var called = 0;
    mobservable.autorunUntil(function() {
        return (x() === 4);
    }, function() {
        called += 1;
    });

    x(5);
    test.equal(called, 0);
    x(4);
    test.equal(called, 1);
    x(3);
    test.equal(called, 1);
    x(4);
    test.equal(called, 1);
    
    test.done();
};

exports.test_async = function(test) {
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
        test.equal(called, 1);
        test.equal(value, 10);

        x(4);
        x(6);
        y(1);
        
        setTimeout(function() {
            test.equal(called, 2);
            test.equal(value, 6);
            
            x(7);
            disposer();
            // after calling disposer, autorunAsync should not update anymore! even if its scheduled
            
            setTimeout(function() {
                test.equal(called, 2);
                test.equal(value, 6);
                test.done();
            }, 10);
        }, 10);
    }, 10);
};

exports.test_expr = function(test) {
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
    
    test.deepEqual(b, [100,150,450,150,20]);
    test.equal(innerCalcs, 9);
    test.equal(totalCalcs, 5);    
    
    test.done();
}; 

exports.test_json1 = function(test) {
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
    test.equal(output, "write blog, improve coverage");
    todos.push({ title: "take a nap" }); // prints: write blog, improve coverage, take a nap
    test.equal(output, "write blog, improve coverage, take a nap");

    test.done();
}

exports.test_json2 = function(test) {
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
    test.deepEqual(mobservable.toJSON(o), source);
    test.deepEqual(source, o);

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

    test.deepEqual(mobservable.toJSON(o), {
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
    test.deepEqual(ab, [ [ 2, 'here' ], [ 2, 'ba' ] ]);
    test.deepEqual(tb,  [ 'react,frp,mweh', 'reactjs,frp,mweh', 'reactjs,frp,mweh,pff' ]);
    ab = [];
    tb = [];

    o.todos.push(mobservable.observable({
        title: "test",
        tags: ["x"]
    }));

    test.deepEqual(o, {
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
    test.deepEqual(ab, [[3, "ba"]]);
    test.deepEqual(tb, ["reactjs,frp,mweh,pff,x"]);
    ab = [];
    tb = [];

    o.todos[1] = mobservable.observable({
        title: "clean the attic",
        tags: ["needs sabbatical"],
        details: {
            url: "booking.com"
        }
    });
    test.deepEqual(o, {
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
    test.deepEqual(ab, [[3, "booking.com"]]);
    test.deepEqual(tb, ["reactjs,frp,needs sabbatical,x"]);
    ab = [];
    tb = [];

    o.todos[1].details = mobservable.observable({ url: "google" });
    o.todos[1].tags = ["foo", "bar"];
    test.deepEqual(mobservable.toJSON(o), {
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
    test.deepEqual(o, mobservable.toJSON(o));
    test.deepEqual(ab, [[3, "google"]]);
    test.deepEqual(tb, ["reactjs,frp,foo,bar,x"]);

    test.done();
}
