var mobservable = require('mobservable');
var makeReactive = mobservable.makeReactive;

var gc = (function () {
    var memwatch;
    try {
        // memwatch = require("memwatch");
        return function() {
            //memwatch.gc();
        };
    }
    catch (e) {
        console.warn("Garbage collection not available");
        return function() {};
    }
})();

function voidObserver() {
    // nothing, nada, noppes.
}

/*
results of this test:
300/40000 mseconds on netbook (AMD c60 processor, same test is on Intel i7 3770 ~10 times faster)
220/37000 after removing forEach
140/30000 after not using (un)shift / pop / push
186/113 after remove filter/length call to detect whether depencies are stable. 300 times faster. w00t.

*/
exports.one_observes_ten_thousand_that_observe_one = function(test) {
    gc();
    var a = makeReactive(2);

    // many observers that listen to one..
    var observers = [];
    for (var i = 0; i < 10000; i++) {
        (function(idx) {
            observers.push(makeReactive(function() {
                return a() * idx;
            }))
        })(i);
    }

    var bCalcs = 0;
    // one observers that listens to many..
    var b = makeReactive(function() {
        var res = 0;
        for(var i = 0; i < observers.length; i++)
        res += observers[i]();
        bCalcs += 1;
        return res;
    })

    var start = now();

    b.observe(voidObserver, true); // start observers
    test.equals(99990000, b());
    var initial = now();

    a(3);
    test.equals(149985000, b()); // yes, I verified ;-).
    //test.equals(2, bCalcs);
    var end = now();

    console.log("\n  Started/Updated in " + (initial - start) + "/" + (end - initial) + " ms.");
    test.done();
}

exports.five_hunderd_properties_that_observe_their_sibling = function(test) {
    gc();
    var observables = [makeReactive(1)];
    for(var i = 0; i < 500; i++) {
        (function(idx) {
            observables.push(makeReactive(function() { return observables[idx]() + 1 }));
        })(i);
    }

    var start = now();

    var last = observables[observables.length -1];
    last.observe(voidObserver);
    test.equals(501, last());
    var initial = now();

    observables[0](2);
    test.equals(502, last());
    var end = now();

    console.log("\n  Started/Updated in " + (initial - start) + "/" + (end - initial) + " ms.");
    test.done();
}

exports.late_depenency_change = function(test) {
    gc();
    var values = [];
    for(var i = 0; i < 100; i++)
    values.push(makeReactive(0))

    var sum = makeReactive(function() {
        var sum = 0;
        for(var i = 0; i < 100; i++)
        sum += values[i]();
        return sum;
    })

    sum.observe(voidObserver, true);

    var start = new Date();

    for(var i = 0; i < 10000; i++)
    values[99](i);

    test.equals(sum(), 9999);
    console.log("\n  Updated in " + ((new Date) - start) + "ms.");
    test.done();
}

exports.lots_of_unused_computables = function(test) {
    gc();
    var a = makeReactive(1);

    // many observers that listen to one..
    var observers = [];
    for (var i = 0; i < 10000; i++) {
        (function(idx) {
            observers.push(makeReactive(function() {
                return a() * idx;
            }))
        })(i);
    }

    // one observers that listens to many..
    var b = makeReactive(function() {
        var res = 0;
        for(var i = 0; i < observers.length; i++)
        res += observers[i]();
        return res;
    });

    var sum = 0;
    var subscription = b.observe(function(newValue) {
        sum = newValue;
    }, true);

    test.equals(sum, 49995000);

    // unsubscribe, nobody should listen to a() now!
    subscription();

    var start = now();

    a(3);
    test.equals(sum, 49995000); // unchanged!

    var end = now();

    console.log("\n  Updated in " + (end - start) + " ms.");
    test.done();
}

exports.test_many_unreferenced_observables = function(test) {
    var a = makeReactive(3);
    var b = makeReactive(6);
    var c = makeReactive(7);
    var d = makeReactive(function() { return a() * b() * c() });
    test.equal(d(), 126);
    test.equal(d.impl.dependencyState.isSleeping, true);
    var start = now();
    for(var i = 0; i < 10000; i++) {
        c(i);
        d();
    }
    var end = now();

    console.log("\n  Updated in " + (end - start) + " ms.");
    
    test.done();
    
}

exports.array_reduce = function(test) {
    gc();
    var aCalc = 0;
    var ar = makeReactive([]);
    var b = makeReactive(1);

    var sum = makeReactive(function() {
        aCalc++;
        return ar.reduce(function(a, c) {
            return a + c * b();
        }, 0);
    });
    sum.observe(voidObserver);

    var start = now();

    for(var i = 0; i < 1000; i++)
    ar.push(i);

    test.equals(499500, sum());
    test.equals(1001, aCalc);
    aCalc = 0;

    var initial = now();

    for(var i = 0; i < 1000; i++)
    ar[i] = ar[i] * 2;
    b(2);

    test.equals(1998000, sum());
    test.equals(1000, aCalc);

    var end = now();

    console.log("\n  Started/Updated in " + (initial - start) + "/" + (end - initial) + " ms.");
    test.done();
}

exports.array_classic_loop = function(test) {
    gc();
    var ar = makeReactive([]);
    var aCalc = 0;
    var b = makeReactive(1);
    var sum = makeReactive(function() {
        var s = 0;
        aCalc++;
        for(var i = 0; i < ar.length; i++)
            s+=ar[i] * b();
        return s;
    });
    sum.observe(voidObserver, true); // calculate

    var start = now();

    test.equals(1, aCalc);
    for(var i = 0; i < 1000; i++)
    ar.push(i);

    test.equals(499500, sum());
    test.equals(1001, aCalc);

    var initial = now();
    aCalc = 0;

    for(var i = 0; i < 1000; i++)
    ar[i] = ar[i] * 2;
    b(2);

    test.equals(1998000, sum());
    test.equals(1000, aCalc);

    var end = now();

    console.log("\n  Started/Updated in " + (initial - start) + "/" + (end - initial) + " ms.");
    test.done();
}


function order_system_helper(test, usebatch, keepObserving) {
    // Garbage collection is very important here,
    // Due to the async nature of this test and the large memory consumption,
    // during tests runs the garbage collector will otherwise kick in at this point
    // severly slowing down the tests (but after repeating the tests a few times,
    // they will become fast again, so it is not a memory leak but a gc trigger that
    // causes the unreliable results)
    gc();

    var orders = makeReactive([]);
    var vat = makeReactive(2);

    var totalAmount = makeReactive(function() {
        var sum = 0, l = orders.length;
        for(var i = 0; i < l; i++)
        sum += orders[i].total();
        return sum;
    });

    function OrderLine(order, price, amount) {
        this.price = makeReactive(price);
        this.amount = makeReactive(amount);
        this.total = makeReactive(function() {
            return order.vat() * this.price() * this.amount();
        }, { scope: this })
    }

    function Order(includeVat) {
        this.includeVat = makeReactive(includeVat);
        this.lines = makeReactive([]);

        this.vat = makeReactive(function() {
            if (this.includeVat())
            return vat();
            return 1;
        }, { scope: this });

        this.total = makeReactive(function() {
            return this.lines.reduce(function(acc, order) {
                return acc + order.total();
            }, 0);
        }, { scope: this });
    }

    totalAmount();
    if (keepObserving)
    totalAmount.observe(voidObserver);

    var start = now();

    function setup() {
        for(var i = 0; i < 100; i++) {
            var c = new Order(i % 2 == 0);
            orders.push(c);
            for(var j = 0; j < 100; j++)
                c.lines.unshift(new OrderLine(c, 5, 5))
        }
    }

    if (usebatch)
        mobservable.transaction(setup);
    else
        setup();

    test.equals(totalAmount(), 375000);

    var initial = now();

    function update() {
        for(var i = 0; i < 50; i++)
        orders[i].includeVat(!orders[i].includeVat());
        vat(3);
    }

    if (usebatch)
        mobservable.transaction(update)
    else
        update();

    test.equals(totalAmount(), 500000);

    var end = now()
    console.log("\n  Started/Updated in " + (initial - start) + "/" + (end - initial) + " ms.");

    test.done();
};

exports.order_system_observed = function(test) {
    order_system_helper(test, false, true);
};

exports.order_system_batched_observed = function(test) {
    order_system_helper(test, true, true);
};

exports.order_system_lazy = function(test) {
    order_system_helper(test, false, false);
};

exports.order_system_batched_lazy = function(test) {
    order_system_helper(test, true, false);
};

test_array_creation = function(test, amount, size) {
    var a = [];
    for(var i = 0; i < size; i++)
        a.push(i);
    var start = now();
    for(var i = 0; i < amount; i++)
        makeReactive(a);
    console.log('\n  Created in ' + (now() - start) + 'ms.');
    test.done();
};

exports.test_array_0 = function(test) {
    test_array_creation(test, 10000);
};

exports.test_array_100 = function(test) {
    test_array_creation(test, 10000);
};

exports.test_array_10000 = function(test) {
    test_array_creation(test, 10000);
};


function now() {
    return + new Date();
}
