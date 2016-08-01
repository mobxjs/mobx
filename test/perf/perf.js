var test = require('tape');
var mobx = require('../..');
var observable = mobx.observable;
var log = require('./index.js').logMeasurement;

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
                return a.get() * idx;
            }))
        })(i);
    }

    var bCalcs = 0;
    // one observers that listens to many..
    var b = observable(function() {
        var res = 0;
        for(var i = 0; i < observers.length; i++)
        	res += observers[i].get();
        bCalcs += 1;
        return res;
    })

    var start = now();

    mobx.observe(b, voidObserver, true); // start observers
    t.equal(99990000, b.get());
    var initial = now();

    a.set(3);
    t.equal(149985000, b.get()); // yes, I verified ;-).
    //t.equal(2, bCalcs);
    var end = now();

    log("One observers many observes one - Started/Updated in " + (initial - start) + "/" + (end - initial) + " ms.");
    t.end();
})

test('five hundrend properties that observe their sibling', function (t) {
    gc();
    var observables = [observable(1)];
    for(var i = 0; i < 500; i++) {
        (function(idx) {
            observables.push(observable(function() { return observables[idx].get() + 1 }));
        })(i);
    }

    var start = now();

    var last = observables[observables.length -1];
    mobx.observe(last, voidObserver);
    t.equal(501, last.get());
    var initial = now();

    observables[0].set(2);
    t.equal(502, last.get());
    var end = now();

    log("500 props observing sibling -  Started/Updated in " + (initial - start) + "/" + (end - initial) + " ms.");
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
    	    sum += values[i].get();
        return sum;
    })

    mobx.observe(sum, voidObserver, true);

    var start = new Date();

    for(var i = 0; i < 10000; i++)
	    values[99].set(i);

    t.equal(sum.get(), 9999);
    log("Late dependency change - Updated in " + ((new Date) - start) + "ms.");
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
                return a.get() * idx;
            }))
        })(i);
    }

    // one observers that listens to many..
    var b = observable(function() {
        var res = 0;
        for(var i = 0; i < observers.length; i++)
        	res += observers[i].get();
        return res;
    });

    var sum = 0;
    var subscription = mobx.observe(b, function(newValue) {
        sum = newValue;
    }, true);

    t.equal(sum, 49995000);

    // unsubscribe, nobody should listen to a() now!
    subscription();

    var start = now();

    a.set(3);
    t.equal(sum, 49995000); // unchanged!

    var end = now();

    log("Unused computables -   Updated in " + (end - start) + " ms.");
    t.end();
})

test('many unreferenced observables', function(t) {
    gc();
    var a = observable(3);
    var b = observable(6);
    var c = observable(7);
    var d = observable(function() { return a.get() * b.get() * c.get() });
    t.equal(d.get(), 126);
    t.equal(d.dependenciesState, -1);
    var start = now();
    for(var i = 0; i < 10000; i++) {
        c.set(i);
        d.get();
    }
    var end = now();

    log("Unused observables -  Updated in " + (end - start) + " ms.");

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
            return a + c * b.get();
        }, 0);
    });
    mobx.observe(sum, voidObserver);

    var start = now();

    for(var i = 0; i < 1000; i++)
        ar.push(i);

    t.equal(499500, sum.get());
    t.equal(1001, aCalc);
    aCalc = 0;

    var initial = now();

    for(var i = 0; i < 1000; i++)
    ar[i] = ar[i] * 2;
    b.set(2);

    t.equal(1998000, sum.get());
    t.equal(1000, aCalc);

    var end = now();

    log("Array reduce -  Started/Updated in " + (initial - start) + "/" + (end - initial) + " ms.");
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
            s+=ar[i] * b.get();
        return s;
    });
    mobx.observe(sum, voidObserver, true); // calculate

    var start = now();

    t.equal(1, aCalc);
    for(var i = 0; i < 1000; i++)
    	ar.push(i);

    t.equal(499500, sum.get());
    t.equal(1001, aCalc);

    var initial = now();
    aCalc = 0;

    for(var i = 0; i < 1000; i++)
    	ar[i] = ar[i] * 2;
    b.set(2);

    t.equal(1998000, sum.get());
    t.equal(1000, aCalc);

    var end = now();

    log("Array loop -  Started/Updated in " + (initial - start) + "/" + (end - initial) + " ms.");
    t.end();
})

function order_system_helper(t, usebatch, keepObserving) {
    gc();
    t.equal(mobx.extras.isComputingDerivation(), false);
    var orders = observable([]);
    var vat = observable(2);

    var totalAmount = observable(function() {
        var sum = 0, l = orders.length;
        for(var i = 0; i < l; i++)
        	sum += orders[i].total.get();
        return sum;
    });

	// TODO: use extendObservable!
    function OrderLine(order, price, amount) {
        this.price = observable(price);
        this.amount = observable(amount);
        this.total = observable(function() {
            return order.vat.get() * this.price.get() * this.amount.get();
        }, this);
    }

    function Order(includeVat) {
        this.includeVat = observable(includeVat);
        this.lines = observable([]);

        this.vat = observable(function() {
            if (this.includeVat.get())
            	return vat.get();
            return 1;
        }, this);

        this.total = observable(function() {
            return this.lines.reduce(function(acc, order) {
                return acc + order.total.get();
            }, 0);
        }, this);
    }

    var disp;
    if (keepObserving)
        disp = mobx.observe(totalAmount, voidObserver);

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
        mobx.transaction(setup);
    else
        setup();

    t.equal(totalAmount.get(), 375000);

    var initial = now();

    function update() {
        for(var i = 0; i < 50; i++)
            orders[i].includeVat.set(!orders[i].includeVat.get());
        vat.set(3);
    }

    if (usebatch)
        mobx.transaction(update)
    else
        update();

    t.equal(totalAmount.get(), 500000);

    if (keepObserving)
        disp();

    var end = now()
    log("Order system batched: " + usebatch + " tracked: " + keepObserving + "  Started/Updated in " + (initial - start) + "/" + (end - initial) + " ms.");

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
    log('\nCreate array -  Created in ' + (now() - start) + 'ms.');
    t.end();
})

test('create array (fast)', function(t) {
    gc();
    var a = [];
    for(var i = 0; i < 1000; i++)
        a.push(i);
    var start = now();
    for(var i = 0; i < 1000; i++)
        mobx.fastArray(a);
    log('\nCreate array (non-recursive)  Created in ' + (now() - start) + 'ms.');
    t.end();
})

test('observe and dispose', t => {
	gc()

	var start = now();
	var a = mobx.observable(1)
	var observers = []
	var MAX = 50000;

	for(var i = 0; i < MAX * 2; i++)
		observers.push(mobx.autorun(() => a.get()));
	a.set(2);
	// favorable order
	// + unfavorable order
	for(var i = 0; i < MAX; i++) {
		observers[i]()
		observers[observers.length - 1 - i]()
	}

	log("Observable with many observers  + dispose: " + (now() - start) + "ms")
	t.end()
})

test('sort', t => {
	gc()

	function Item(a, b, c) {
		mobx.extendObservable(this, {
			a: a, b: b, c: c, d: function() {
				return this.a + this.b + this.c;
			}
		})
	}
	var items = mobx.observable([])

	function sortFn (l, r) {
		items.length; // screw all optimizations!
		l.d;
		r.d;
		if (l.a > r.a)
			return 1
		if (l.a < r.a)
			return -1;
		if (l.b > r.b)
			return 1;
		if (l.b < r.b)
			return -1;
		if (l.c > r.c)
			return 1;
		if (l.c < r.c)
			return -1;
		return 0;
	}

	var sorted = mobx.computed(() => {
		items.sort(sortFn)
	})


	var start = now();
	var MAX = 100000;

	var ar = mobx.autorun(() => sorted.get())

	mobx.transaction(() => {
		for (var i = 0; i < MAX; i++)
			items.push(new Item(i % 10, i % 3, i %7))
	})

	log("expensive sort: created " + (now() - start))
	var start = now();

	for (var i = 0; i < 5; i++) {
		items[i * 1000].a = 7;
		items[i * 1100].b = 5;
		items[i * 1200].c = 9;
	}

	log("expensive sort: updated " + (now() - start))
	var start = now();

	ar();

	log("expensive sort: disposed" + (now() - start))

	var plain = mobx.toJS(items, false);
	t.equal(plain.length, MAX)

	var start = now();
	for (var i = 0; i <5; i++) {
		plain[i * 1000].a = 7;
		plain.sort(sortFn);
		plain[i * 1100].b = 5;
		plain.sort(sortFn);
		plain[i * 1200].c = 9;
		plain.sort(sortFn);
	}
	log("native plain sort: updated " + (now() - start))

	t.end()
})

test('computed temporary memoization', t => {
  "use strict";
  var computeds = []
  for(let i = 0; i < 40; i++) {
    computeds.push(mobx.computed(() =>
      i ? computeds[i - 1].get() + computeds[i - 1].get() : 1
    ))
  }
  var start = now()
  t.equal(computeds[27].get(), 134217728)

  log("computed memoization " + (now() - start) + 'ms')
  t.end()
})

function now() {
    return + new Date();
}
