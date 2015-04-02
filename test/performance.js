require('typescript-require')
var mobservable = require('../mobservable.ts')
var property = mobservable.property;

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

	console.log("Started/Updated in " + (initial - start) + "/" + (end - initial) + " ms.");
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

	console.log("Started/Updated in " + (initial - start) + "/" + (end - initial) + " ms.");
	test.done();
}

exports.perfArray = function(test) {
	var aCalc = 0;
	var ar = mobservable.array([]);
	var sum = property(function() {
		aCalc++;
		return ar.reduce(function(a, b) {
			return a + b;
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
	test.equals(999000, sum());
	test.equals(999, aCalc);

	var end = +(new Date);

	console.log("Started/Updated in " + (initial - start) + "/" + (end - initial) + " ms.");
	test.done();
}

exports.perfArray2 = function(test) {
	var ar = mobservable.array([]);
	var aCalc = 0;
	var sum = property(function() {
		var s = 0;
		aCalc++;
		for(var i = 0; i < ar.length; i++)
			s+=ar[i];
		return s;
	});
	sum(); // calculate

	var start = +(new Date);

	test.equals(1, aCalc);
debugger;
	for(var i = 0; i < 1000; i++)
		ar.push(i);

	test.equals(499500, sum());
	test.equals(1001, aCalc);

	var initial = +(new Date);
	aCalc = 0;

	for(var i = 0; i < 1000; i++)
		ar[i] = ar[i] * 2;
	test.equals(999000, sum());
	test.equals(999, aCalc);

	var end = +(new Date);

	console.log("Started/Updated in " + (initial - start) + "/" + (end - initial) + " ms.");
	test.done();
}