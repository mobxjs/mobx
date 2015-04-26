var mobservable = require('../mobservable.js')

var value = mobservable.value;
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
    test.equal(mobservable.stackDepth(), 0);
    test.done();
}

exports.basic2 = function(test) {
    var x = value(3);
    var z = value(function () { return x() * 2});
    var y = value(function () { return x() * 3});

    z.observe(voidObserver);

    test.equal(z(), 6);
    test.equal(y(), 9);

    x(5);
    test.equal(z(), 10);
    test.equal(y(), 15);

    test.equal(mobservable.stackDepth(), 0);
    test.done();
}

exports.dynamic = function(test) {
    try {
        var x = value(3);
        var y = value(function() {
            return x();
        });
        var b = buffer();
        y.observe(b, true);

        test.equal(3, y()); // First evaluation here..

        x(5);
        test.equal(5, y());

        test.deepEqual([3, 5], b.toArray());
        test.equal(mobservable.stackDepth(), 0);

        test.done();
    }
    catch(e) {
        console.log(e.stack);
    }
}

exports.dynamic2 = function(test) {
    try {
        var x = value(3);
        var y = value(function() {
            return x() * x();
        });

        test.equal(9, y());
        var b = buffer();
        y.observe(b);

        x(5);
        test.equal(25, y());

        //no intermediate value 15!
        test.deepEqual([25], b.toArray());
        test.equal(mobservable.stackDepth(), 0);

        test.done();
    }
    catch(e) {
        console.log(e.stack);
    }
}

exports.readme1 = function(test) {
    try {
        var b = buffer();

        var vat = value(0.20);
        var order = {};
        order.price = value(10);
        // Prints: New price: 24
        //in TS, just: value(() => this.price() * (1+vat()))
        order.priceWithVat = value(function() {
            return order.price() * (1+vat());
        });

        order.priceWithVat.observe(b);

        order.price(20);
        order.price(10);
        test.deepEqual([24,12],b.toArray());
        test.equal(mobservable.stackDepth(), 0);

        test.done();
    } catch (e) {
        console.log(e.stack); throw e;
    }
}

exports.testBatchAndReady = function(test) {
    var a = value(2);
    var b = value(3);
    var c = value(function() { return a() * b() });
    var d = value(function() { return c() * b() });
    var buf = buffer();
    d.observe(buf);

    a(4);
    b(5);
    // Note, 60 should not happen! (that is d beign computed before c after update of b)
    test.deepEqual([36, 100], buf.toArray());

    mobservable.onceReady(function() {
        //this is called async, and only after everything has finished, so d should be 54
        test.deepEqual(54, d()); // only one new value for d
        test.equal(mobservable.stackDepth(), 0);

        test.done();
    });
    mobservable.batch(function() {
        a(2);
        b(3);
        a(6);
        test.deepEqual(100, d()); // still hunderd
    });

    test.deepEqual([36, 100, 54], buf.toArray());// only one new value for d
}

exports.testScope = function(test) {
    var vat = value(0.2);
    var Order = function() {
        this.price = value(20, this);
        this.amount = value(2, this);
        this.total = value(function() {
            return (1+vat()) * this.price() * this.amount();
        }, this);
    };

    var order = new Order();
    order.total.observe(voidObserver);
    order.price(10).amount(3);
    test.equals(36, order.total());
    test.equal(mobservable.stackDepth(), 0);

    test.done();
}

exports.testdefineObservableProperty = function(test) {
    var vat = value(0.2);
    var Order = function() {
        mobservable.defineObservableProperty(this, 'price', 20);
        mobservable.defineObservableProperty(this, 'amount', 2);
        mobservable.defineObservableProperty(this, 'total', function() {
            return (1+vat()) * this.price * this.amount; // price and amount are now properties!
        });
    };

    var order = new Order();
    order.price = 10;
    order.amount = 3;
    test.equals(36, order.total);

    test.equal(mobservable.stackDepth(), 0);
    test.done();
};

exports.testInitializeObservableProperties = function(test) {
    var vat = value(0.2);
    var Order = function() {
        this.price = value(20);
        this.amount = value(2);
        this.nonsense = 3;
        this.total = value(function() {
            return (1+vat()) * this.price * this.amount; // price and amount are now properties!
        }, this);
        mobservable.initializeObservableProperties(this);
    };

    var order = new Order();
    order.price = 10;
    order.amount = 3;
    test.equals(36, order.total);
    test.equals(3, order.nonsense);

    test.equal(mobservable.stackDepth(), 0);
    test.done();
};

exports.testWatch = function(test) {
    var a = value(3);
    var b = value(2);
    var changed = 0;
    var calcs = 0;
    var res = mobservable.watch(function() {
        calcs += 1;
        return a() * b();
    }, function() {
        changed += 1;
    });

    test.equals(2, res.length);
    test.equals(6, res[0]);
    test.equals(changed, 0);
    test.equals(calcs, 1);

    b(4);
    test.equals(changed, 1);
    test.equals(calcs, 1); // no more calcs!

    test.equal(mobservable.stackDepth(), 0);
    test.done();
}

exports.testWatchDisposed = function(test) {
    var a = value(3);
    var b = value(2);
    var changed = 0;
    var calcs = 0;
    var res = mobservable.watch(function() {
        calcs += 1;
        return a() * b();
    }, function() {
        changed += 1;
    });

    test.equals(2, res.length);
    test.equals(6, res[0]);
    test.equals(changed, 0);
    test.equals(calcs, 1);

    res[1](); //cleanup
    b(4);
    test.equals(changed, 0);
    test.equals(calcs, 1);

    test.equal(mobservable.stackDepth(), 0);
    test.done();
}

exports.testChangeCountOptimization = function(test) {
    var bCalcs = 0;
    var cCalcs = 0;
    var a = value(3);
    var b = value(function() {
        bCalcs += 1;
        return 4 + a() - a();
    });
    var c = value(function() {
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

    test.equal(mobservable.stackDepth(), 0);
    test.done();
}

exports.testObservablesRemoved = function(test) {
    var calcs = 0;
    var a = value(1);
    var b = value(2);
    var c = value(function() {
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

    test.equal(mobservable.stackDepth(), 0);
    test.done();
}


exports.testLazyEvaluation = function (test) {
    var bCalcs = 0;
    var cCalcs = 0;
    var dCalcs = 0;
    var observerChanges = 0;

    var a = value(1);
    var b = value(function() {
        bCalcs += 1;
        return a() +1;
    });

    var c = value(function() {
        cCalcs += 1;
        return b() +1;
    });

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

    var d = value(function() {
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

    test.equal(mobservable.stackDepth(), 0);
    test.done();
};
