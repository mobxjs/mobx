var mobservable = require('../mobservable.js')
var property = mobservable.property;
var array = mobservable.array;

/*
	results of this test:
	300/40000 mseconds on netbook (AMD c60 processor, same test is on Intel i7 3770 ~10 times faster)
	220/37000 after removing forEach
	140/30000 after not using (un)shift / pop / push
	186/113 after remove filter/length call to detect whether depencies are stable. 300 times faster. w00t.

	// TODO: should upscale this test, since the measurement is now too small....
 */
exports.one_observes_ten_thousand_that_observe_one = function(test) {
	var a = property(2);

	// many observers that listen to one..
	var observers = [];
	for (var i = 0; i < 10000; i++) {
		(function(idx) {
			observers.push(property(function() {
				return a() * idx;
			}))
		})(i);
	}

	var bCalcs = 0;
	// one observers that listens to many..
	var b = property(function() {
		var res = 0;
		for(var i = 0; i < observers.length; i++)
			res += observers[i]();
		bCalcs += 1;
		return res;
	})

	var start = +(new Date);

	b(); // start observers
	test.equals(99990000, b());
	var initial = +(new Date);

	a(3);
	test.equals(149985000, b()); // yes, I verified ;-).
	test.equals(2, bCalcs);
	var end = +(new Date);

	console.log("\n  Started/Updated in " + (initial - start) + "/" + (end - initial) + " ms.");
	test.done();
}

exports.five_hunderd_properties_that_observe_their_sibling = function(test) {
	var observables = [property(1)];
	for(var i = 0; i < 500; i++) {
		(function(idx) {
			observables.push(property(function() { return observables[idx]() + 1 }));
		})(i);
	}

	var start = +(new Date);

	var last = observables[observables.length -1];
	test.equals(501, last());
	var initial = +(new Date);

	observables[0](2);
	test.equals(502, last());
	var end = +(new Date);

	console.log("\n  Started/Updated in " + (initial - start) + "/" + (end - initial) + " ms.");
	test.done();
}

exports.late_depenency_change = function(test) {
	var values = [];
	for(var i = 0; i < 100; i++)
		values.push(property(0))

	var sum = property(function() {
		var sum = 0;
		for(var i = 0; i < 100; i++)
			sum += values[i]();
		return sum;
	})

	sum();

	var start = new Date();

	for(var i = 0; i < 10000; i++)
		values[99](i);

	test.equals(sum(), 9999);
	console.log("\n  Updated in " + ((new Date) - start) + "ms.");
	test.done();
}

exports.array_reduce = function(test) {
	var aCalc = 0;
	var ar = mobservable.array([]);
	var b = property(1);

	var sum = property(function() {
		aCalc++;
		return ar.reduce(function(a, c) {
			return a + c * b();
		}, 0);
	});
	sum(); // calculate

	var start = +(new Date);

	for(var i = 0; i < 1000; i++)
		ar.push(i);

	test.equals(499500, sum());
	test.equals(1001, aCalc);
	aCalc = 0;

	var initial = +(new Date);

	for(var i = 0; i < 1000; i++)
		ar[i] = ar[i] * 2;
	b(2);

	test.equals(1998000, sum());
	test.equals(1000, aCalc);

	var end = +(new Date);

	console.log("\n  Started/Updated in " + (initial - start) + "/" + (end - initial) + " ms.");
	test.done();
}

exports.array_classic_loop = function(test) {
	var ar = mobservable.array([]);
	var aCalc = 0;
	var b = property(1);
	var sum = property(function() {
		var s = 0;
		aCalc++;
		for(var i = 0; i < ar.length; i++)
			s+=ar[i] * b();
		return s;
	});
	sum(); // calculate

	var start = +(new Date);

	test.equals(1, aCalc);
	for(var i = 0; i < 1000; i++)
		ar.push(i);

	test.equals(499500, sum());
	test.equals(1001, aCalc);

	var initial = +(new Date);
	aCalc = 0;

	for(var i = 0; i < 1000; i++)
		ar[i] = ar[i] * 2;
	b(2);

	test.equals(1998000, sum());
	test.equals(1000, aCalc);

	var end = +(new Date);

	console.log("\n  Started/Updated in " + (initial - start) + "/" + (end - initial) + " ms.");
	test.done();
}


function order_system_helper(test, usebatch) {
	var orders = array([]);
	var vat = property(2);

	var totalAmount = property(function() {
		var sum = 0, l = orders.length;
		for(var i = 0; i < l; i++)
			sum += orders[i].total();
		return sum;
	});

	function OrderLine(order, price, amount) {
		this.price = property(price);
		this.amount = property(amount);
		this.total = property(function() {
			return order.vat() * this.price() * this.amount();
		}, this)
	}

	function Order(includeVat) {
		this.includeVat = property(includeVat);
		this.lines = array();

		this.vat = property(function() {
			if (this.includeVat())
				return vat();
			return 1;
		}, this)

		this.total = property(function() {
			return this.lines.reduce(function(acc, order) {
				return acc + order.total();
			}, 0);
		}, this)
	}

	totalAmount();

	var start = +(new Date);

	function setup() {
		for(var i = 0; i < 100; i++) {
			var c = new Order(i % 2 == 0);
			orders.push(c);
			for(var j = 0; j < 100; j++)
				c.lines.unshift(new OrderLine(c, 5, 5))
		}
	}

	if (usebatch)
		mobservable.batch(setup);
	else
		setup();

	test.equals(totalAmount(), 375000);

	var initial = +(new Date);

	function update() {
		for(var i = 0; i < 50; i++)
			orders[i].includeVat(!orders[i].includeVat());
		vat(3);
	}

	if (usebatch)
		mobservable.batch(update)
	else
		update();

	test.equals(totalAmount(), 500000);

	var end = +(new Date);
	console.log("\n  Started/Updated in " + (initial - start) + "/" + (end - initial) + " ms.");

	test.done();
}

exports.order_system = function(test) {
	order_system_helper(test, false);
}

exports.order_system_batched = function(test) {
	order_system_helper(test, true);
}
