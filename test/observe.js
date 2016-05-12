var test = require('tape');
var m = require('..');

test('observe object and map properties', function(t) {
	var map = m.map({ a : 1 });
	var events = [];
	
	t.throws(function() {
		m.observe(map, "b", function() {});
	});
	
	var d1 = m.observe(map, "a", function(newV, oldV) {
		events.push([newV, oldV]);
	});
	
	map.set("a", 2);
	map.set("a", 3);
	d1();
	map.set("a", 4);
	
	var o = m.observable({
		a: 5
	});

	t.throws(function() {
		m.observe(o, "b", function() {});
	});
	var d2 = m.observe(o, "a", function(newV, oldV) {
		events.push([newV, oldV]);
	});
	
	o.a = 6;
	o.a = 7;
	d2();
	o.a = 8;
	
	t.deepEqual(events, [
		[2, 1],
		[3, 2],
		[6, 5],
		[7, 6]
	]);
	
	t.end();	
});

test('observe computed values', function(t) {
	var events = [];

	var v = m.observable(0);
	var f = m.observable(0);
	var c = m.computed(function() { return v.get(); });

	var d2 = c.observe(function(newV, oldV) {
		v.get();
		f.get();
		events.push([newV, oldV]);
	});

	v.set(6);
	f.set(10);

	t.deepEqual(events, [
		[6, 0]
	]);

	t.end();

});