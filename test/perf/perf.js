var test = require('tape');
var mobservable = require('../..');
var observable = mobservable.observable;

function gc() {
    if (typeof global.gc === "function")
        global.gc();
}

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
test('one observes ten thousand that observe one', function (t) {
    gc();
    var a = observable(2);

    // many observers that listen to one..
    var observers = [];
    for (var i = 0; i < 10000; i++) {
        (function(idx) {
            observers.push(observable(function() {
                return a() * idx;
            }))
        })(i);
    }

    var bCalcs = 0;
    // one observers that listens to many..
    var b = observable(function() {
        var res = 0;
        for(var i = 0; i < observers.length; i++)
        res += observers[i]();
        bCalcs += 1;
        return res;
    })

    var start = now();

    b.observe(voidObserver, true); // start observers
    t.equal(b(), 99990000);
    var initial = now();

    a(3);
    t.equal(b(), 149985000); // yes, I verified ;-).
    //t.equal(2, bCalcs);
    var end = now();

    console.log("\n  Started/Updated in " + (initial - start) + "/" + (end - initial) + " ms.");
    t.end();
})

test('five hundrend properties that observe their sibling', function (t) {
    gc();
    var observables = [observable(1)];
    for(var i = 0; i < 500; i++) {
        (function(idx) {
            observables.push(observable(function() { return observables[idx]() + 1 }));
        })(i);
    }

    var start = now();

    var last = observables[observables.length -1];
    last.observe(voidObserver);
    t.equal(501, last());
    var initial = now();

    observables[0](2);
    t.equal(502, last());
    var end = now();

    console.log("\n  Started/Updated in " + (initial - start) + "/" + (end - initial) + " ms.");
    t.end();
})

test('late dependency change', function(t) {
    gc();
    var values = [];
    for(var i = 0; i < 100; i++)
    values.push(observable(0))

    var sum = observable(function() {
        var sum = 0;
        for(var i = 0; i < 100; i++)
        sum += values[i]();
        return sum;
    })

    sum.observe(voidObserver, true);

    var start = new Date();

    for(var i = 0; i < 10000; i++)
    values[99](i);

    t.equal(sum(), 9999);
    console.log("\n  Updated in " + ((new Date) - start) + "ms.");
    t.end();
})

test('lots of unused computables', function(t) {
    gc();
    var a = observable(1);

    // many observers that listen to one..
    var observers = [];
    for (var i = 0; i < 10000; i++) {
        (function(idx) {
            observers.push(observable(function() {
                return a() * idx;
            }))
        })(i);
    }

    // one observers that listens to many..
    var b = observable(function() {
        var res = 0;
        for(var i = 0; i < observers.length; i++)
        res += observers[i]();
        return res;
    });

    var sum = 0;
    var subscription = b.observe(function(newValue) {
        sum = newValue;
    }, true);

    t.equal(sum, 49995000);

    // unsubscribe, nobody should listen to a() now!
    subscription();

    var start = now();

    a(3);
    t.equal(sum, 49995000); // unchanged!

    var end = now();

    console.log("\n  Updated in " + (end - start) + " ms.");
    t.end();
})

test('many unreferenced observables', function(t) {
    gc();
    var a = observable(3);
    var b = observable(6);
    var c = observable(7);
    var d = observable(function() { return a() * b() * c() });
    t.equal(d(), 126);
    t.equal(d.$mobservable.isLazy, true);
    var start = now();
    for(var i = 0; i < 10000; i++) {
        c(i);
        d();
    }
    var end = now();

    console.log("\n  Updated in " + (end - start) + " ms.");

    t.end();
})

test('array reduce', function(t) {
    gc();
    var aCalc = 0;
    var ar = observable([]);
    var b = observable(1);

    var sum = observable(function() {
        aCalc++;
        return ar.reduce(function(a, c) {
            return a + c * b();
        }, 0);
    });
    sum.observe(voidObserver);

    var start = now();

    for(var i = 0; i < 1000; i++)
        ar.push(i);

    t.equal(499500, sum());
    t.equal(1001, aCalc);
    aCalc = 0;

    var initial = now();

    for(var i = 0; i < 1000; i++)
    ar[i] = ar[i] * 2;
    b(2);

    t.equal(1998000, sum());
    t.equal(1000, aCalc);

    var end = now();

    console.log("\n  Started/Updated in " + (initial - start) + "/" + (end - initial) + " ms.");
    t.end();
})

test('array classic loop', function(t) {
    gc();
    var ar = observable([]);
    var aCalc = 0;
    var b = observable(1);
    var sum = observable(function() {
        var s = 0;
        aCalc++;
        for(var i = 0; i < ar.length; i++)
            s+=ar[i] * b();
        return s;
    });
    sum.observe(voidObserver, true); // calculate

    var start = now();

    t.equal(1, aCalc);
    for(var i = 0; i < 1000; i++)
    ar.push(i);

    t.equal(499500, sum());
    t.equal(1001, aCalc);

    var initial = now();
    aCalc = 0;

    for(var i = 0; i < 1000; i++)
    ar[i] = ar[i] * 2;
    b(2);

    t.equal(1998000, sum());
    t.equal(1000, aCalc);

    var end = now();

    console.log("\n  Started/Updated in " + (initial - start) + "/" + (end - initial) + " ms.");
    t.end();
})

function order_system_helper(t, usebatch, keepObserving) {
    gc();
    t.equal(mobservable.extras.isComputingDerivation(), false);
    var orders = observable([]);
    var vat = observable(2);

    var totalAmount = observable(function() {
        var sum = 0, l = orders.length;
        for(var i = 0; i < l; i++)
        sum += orders[i].total();
        return sum;
    });

    function OrderLine(order, price, amount) {
        this.price = observable(price);
        this.amount = observable(amount);
        this.total = observable(function() {
            return order.vat() * this.price() * this.amount();
        }, this);
    }

    function Order(includeVat) {
        this.includeVat = observable(includeVat);
        this.lines = observable([]);

        this.vat = observable(function() {
            if (this.includeVat())
            return vat();
            return 1;
        }, this);

        this.total = observable(function() {
            return this.lines.reduce(function(acc, order) {
                return acc + order.total();
            }, 0);
        }, this);
    }

    var disp;
    if (keepObserving)
        disp = totalAmount.observe(voidObserver);

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

    t.equal(totalAmount(), 375000);

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

    t.equal(totalAmount(), 500000);

    if (keepObserving)
        disp();

    var end = now()
    console.log("\n  Started/Updated in " + (initial - start) + "/" + (end - initial) + " ms.");

    t.end();
};

test('order system observed', function(t) {
    order_system_helper(t, false, true);
})

test('order system batched observed', function(t) {
    order_system_helper(t, true, true);
})

test('order system lazy', function(t) {
    order_system_helper(t, false, false);
})

test('order system batched lazy', function(t) {
    order_system_helper(t, true, false);
})

test('create array', function(t) {
    gc();
    var a = [];
    for(var i = 0; i < 1000; i++)
        a.push(i);
    var start = now();
    for(var i = 0; i < 1000; i++)
        observable(a);
    console.log('\n  Created in ' + (now() - start) + 'ms.');
    t.end();
})

test('create array (fast)', function(t) {
    gc();
    var a = [];
    for(var i = 0; i < 1000; i++)
        a.push(i);
    var start = now();
    for(var i = 0; i < 1000; i++)
        mobservable.fastArray(a);
    console.log('\n  Created in ' + (now() - start) + 'ms.');
    t.end();
})

function now() {
    return + new Date();
}
