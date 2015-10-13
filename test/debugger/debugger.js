// run using node-debug debugger.js
var mobservable = require('mobservable');

var object = mobservable.observable({
	a: 3,
	b: function double() {
		return this.a * 2
	}, 
	c: {
		x: 1
	},
	d: [
		1,
		2,
		{ 
			e: 3
		}		
	]
});

var ar = mobservable.observable([
	4, 5, { f: 6}
]);

/*
var object3 = {};
Object.defineProperty(object3, "myprop", {
	enumerable: true,
	configurable: true,
	get: function() { return 3; },
	set: function(x) { }
});

var object4 = {};
Object.defineProperty(object4, "4", {
	enumerable: true,
	configurable: true,
	get: function() { return 3; },
	set: function(x) { }
});
*/
debugger;