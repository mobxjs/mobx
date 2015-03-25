require('typescript-require')
var mobservable = require('../mobservable.ts')
var property = mobservable.property;

/*
	results of this test:
	300/40000 mseconds on netbook
	220/37000 after removing forEach
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

	// one observers that listens to many..
	var b = property(function() {
		var res = 0;
		for(var i = 0; i < observers.length; i++)
			res += observers[i]();
		return res;
	})

	var start = +(new Date);

	b(); // start observers
	//test.equals(1000000, b());
	var initial = +(new Date);

	a(3);
	//test.equals(1500000, b());
	var end = +(new Date);

	console.log("Started/Updated in " + (initial - start) + "/" + (end - initial) + " ms.");
	test.done();
}