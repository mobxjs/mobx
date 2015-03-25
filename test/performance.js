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
exports.perf1 = function(test) {
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