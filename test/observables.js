var mobservable = require('mobservable');
var m = mobservable;

var makeReactive = mobservable.makeReactive;
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
    var x = mobservable(3);
    var b = buffer();
    x.observe(b);
    test.equal(3, x());

    x(5);
    test.equal(5, x());
    test.deepEqual([5], b.toArray());
    test.equal(mobservable._.stackDepth(), 0);
    test.done();
}

exports.basic2 = function(test) {
    var x = makeReactive(3);
    var z = makeReactive(function () { return x() * 2});
    var y = makeReactive(function () { return x() * 3});

    z.observe(voidObserver);

    test.equal(z(), 6);
    test.equal(y(), 9);

    x(5);
    test.equal(z(), 10);
    test.equal(y(), 15);

    test.equal(mobservable._.stackDepth(), 0);
    test.done();
}

exports.dynamic = function(test) {
    try {
        var x = mobservable(3);
        var y = mobservable(function() {
            return x();
        });
        var b = buffer();
        y.observe(b, true);

        test.equal(3, y()); // First evaluation here..

        x(5);
        test.equal(5, y());

        test.deepEqual([3, 5], b.toArray());
        test.equal(mobservable._.stackDepth(), 0);

        test.done();
    }
    catch(e) {
        console.log(e.stack);
    }
}

exports.dynamic2 = function(test) {
    try {
        var x = makeReactive(3);
        var y = makeReactive(function() {
            return x() * x();
        });

        test.equal(9, y());
        var b = buffer();
        y.observe(b);

        x(5);
        test.equal(25, y());

        //no intermediate value 15!
        test.deepEqual([25], b.toArray());
        test.equal(mobservable._.stackDepth(), 0);

        test.done();
    }
    catch(e) {
        console.log(e.stack);
    }
}

exports.readme1 = function(test) {
    try {
        var b = buffer();

        var vat = makeReactive(0.20);
        var order = {};
        order.price = makeReactive(10);
        // Prints: New price: 24
        //in TS, just: value(() => this.price() * (1+vat()))
        order.priceWithVat = makeReactive(function() {
            return order.price() * (1+vat());
        });

        order.priceWithVat.observe(b);

        order.price(20);
        order.price(10);
        test.deepEqual([24,12],b.toArray());
        test.equal(mobservable._.stackDepth(), 0);

        test.done();
    } catch (e) {
        console.log(e.stack); throw e;
    }
}

exports.testBatch = function(test) {
    var a = makeReactive(2);
    var b = makeReactive(3);
    var c = makeReactive(function() { return a() * b() });
    var d = makeReactive(function() { return c() * b() });
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

exports.testScope = function(test) {
    var vat = makeReactive(0.2);
    var Order = function() {
        this.price = makeReactive(20, this);
        this.amount = makeReactive(2, this);
        this.total = makeReactive(function() {
            return (1+vat()) * this.price() * this.amount();
        }, { scope: this });
    };

    var order = new Order();
    order.total.observe(voidObserver);
    order.price(10);
    order.amount(3);
    test.equals(36, order.total());
    test.equal(mobservable._.stackDepth(), 0);

    test.done();
}

exports.testProps1 = function(test) {
    var vat = makeReactive(0.2);
    var Order = function() {
        mobservable.extendReactive(this, {
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
    var sub = mobservable.sideEffect(function() {
        totals.push(order.total);
    });
    order.amount = 4;
    sub();
    order.amount = 5;
    test.deepEqual(totals, [36,48]);

    test.equal(mobservable._.stackDepth(), 0);
    test.done();
};

exports.testProps2 = function(test) {
    var vat = makeReactive(0.2);
    var Order = function() {
        mobservable.extendReactive(this, {
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
    var vat = makeReactive(0.2);
    var Order = function() {
        this.price = 20;
        this.amount = 2;
        this.total = function() {
            return (1+vat()) * this.price * this.amount; // price and amount are now properties!
        };
        mobservable.extendReactive(this, this);
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
        mobservable.extendReactive(this, {
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


exports.testObserveProperty = function(test) {
    var sb = [];
    var mb = [];

    var Wrapper = function (chocolateBar) {
        mobservable.extendReactive(this, {
            chocolateBar: chocolateBar,
            calories: function () {
                return this.chocolateBar.calories;
            }
        });
    };

    var snickers = mobservable.makeReactive({
        calories: null
    });
    var mars = mobservable.makeReactive({
        calories: undefined
    });

    var wrappedSnickers = new Wrapper(snickers);
    var wrappedMars = new Wrapper(mars);

    var disposeSnickers = mobservable.sideEffect(function () {
        sb.push(wrappedSnickers.calories);
    });
    var disposeMars = mobservable.sideEffect(function () {
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

exports.testWatch = function(test) {
    var a = makeReactive(3);
    var b = makeReactive(2);
    var changed = 0;
    var calcs = 0;
    var res = mobservable.observeUntilInvalid(function() {
        calcs += 1;
        return a() * b();
    }, function() {
        changed += 1;
    });

    test.equals(3, res.length);
    test.equals(6, res[0]);
    test.equals(changed, 0);
    test.equals(calcs, 1);
    test.equals(a.$mobservable.observers.length, 1);
    test.equals(b.$mobservable.observers.length, 1);

    b(4);
    test.equals(changed, 1);
    test.equals(calcs, 1); // no more calcs!
    test.equals(a.$mobservable.observers.length, 0);
    test.equals(b.$mobservable.observers.length, 0);

    test.equal(mobservable._.stackDepth(), 0);
    test.done();
}

exports.testWatchDisposed = function(test) {
    var a = makeReactive(3);
    var b = makeReactive(2);
    var changed = 0;
    var calcs = 0;
    var res = mobservable.observeUntilInvalid(function() {
        calcs += 1;
        return a() * b();
    }, function() {
        changed += 1;
    });

    test.equals(3, res.length);
    test.equals(6, res[0]);
    test.equals(changed, 0);
    test.equals(calcs, 1);

    res[1](); //cleanup
    b(4);
    test.equals(changed, 0); // onInvalidate should not trigger during explicit cleanup
    test.equals(calcs, 1);

    test.equal(mobservable._.stackDepth(), 0);
    test.done();
}

exports.testWatchNested = function(test) {
    var bCalcs = 0, cCalcs = 0, dCalcs = 0;
    var a = makeReactive(3);
    var b, c;
    makeReactive(function() {
        bCalcs += 1;
        c = mobservable.observeUntilInvalid(function() {
            cCalcs += 1;
            return a();
        }, function() {
            dCalcs += 1;
        });
        return c[0];

    }).observe(function(newValue) {
        b = newValue;
    }, true);

    test.equal(b, 3);
    test.equal(c[0], 3);
    test.equal(cCalcs, 1);
    test.equal(dCalcs, 0);
    test.equal(bCalcs, 1);

    a(4); // doesn't affect anything outside the watch!
    test.equal(c[0], 3);
    test.equal(b, 3);
    test.equal(cCalcs, 1);
    test.equal(dCalcs, 1);
    test.equal(bCalcs, 1);

    test.done();
};

exports.testChangeCountOptimization = function(test) {
    var bCalcs = 0;
    var cCalcs = 0;
    var a = makeReactive(3);
    var b = makeReactive(function() {
        bCalcs += 1;
        return 4 + a() - a();
    });
    var c = makeReactive(function() {
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

    test.equal(mobservable._.stackDepth(), 0);
    test.done();
}

exports.testObservablesRemoved = function(test) {
    var calcs = 0;
    var a = makeReactive(1);
    var b = makeReactive(2);
    var c = makeReactive(function() {
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

    test.equal(mobservable._.stackDepth(), 0);
    test.done();
}


exports.testLazyEvaluation = function (test) {
    var bCalcs = 0;
    var cCalcs = 0;
    var dCalcs = 0;
    var observerChanges = 0;

    var a = makeReactive(1);
    var b = makeReactive(function() {
        bCalcs += 1;
        return a() +1;
    });

    var c = makeReactive(function() {
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

    var d = makeReactive(function() {
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

    test.equal(mobservable._.stackDepth(), 0);
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
    var dis = m.observe(function() {
        debugger;
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
    var factor = mobservable(0);
    var price = mobservable(100);
    var totalCalcs = 0;
    var innerCalcs = 0;

    var total = mobservable(function() {
        totalCalcs += 1; // outer observable shouldn't recalc if inner observable didn't publish a real change
        return price() * mobservable(function() {
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
    var factor = mobservable(0);
    var price = mobservable(100);
    var totalCalcs = 0;
    var innerCalcs = 0;

    var total = mobservable(function() {
        totalCalcs += 1; // outer observable shouldn't recalc if inner observable didn't publish a real change
        return price() * mobservable(function() {
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
    var x = mobservable(3);
    var x2 = mobservable(function() { return x() * 2; });
    var b = [];

    var cancel = mobservable.observe(function() {
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
    var x = mobservable(3);

    var called = 0;
    mobservable.when(function() {
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
    var x = mobservable(3);
    var y = mobservable(1);
   
    var value;
    
    var disposer = mobservable.observeAsync(
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
            // after calling disposer, observeAsync should not update anymore! even if its scheduled
            
            setTimeout(function() {
                test.equal(called, 2);
                test.equal(value, 6);
                test.done();
            }, 10);
        }, 10);
    }, 10);
};

exports.test_json1 = function(test) {
    var todos = mobservable([
        {
            title: "write blog"
        },
        {
            title: "improve coverge"
        }
    ]);

    var output;
    mobservable.sideEffect(function() {
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

    var o = mobservable.makeReactive(source);

    //console.log(JSON.stringify(source,null,4));
    test.deepEqual(mobservable.toJson(o), source);
    test.deepEqual(source, o);

    var analyze = mobservable(function() {
        return [
            o.todos.length,
            o.todos[1].details.url
        ]
    });

    var alltags = mobservable(function() {
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

    test.deepEqual(mobservable.toJson(o), {
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

    o.todos.push(mobservable.makeReactive({
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

    o.todos[1] = mobservable.makeReactive({
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

    o.todos[1].details = mobservable.makeReactive({ url: "google" });
    o.todos[1].tags = ["foo", "bar"];
    test.deepEqual(mobservable.toJson(o), {
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
    test.deepEqual(o, mobservable.toJson(o));
    test.deepEqual(ab, [[3, "google"]]);
    test.deepEqual(tb, ["reactjs,frp,foo,bar,x"]);

    test.done();
}