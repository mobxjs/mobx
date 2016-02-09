var test = require('tape');
var mobservable = require('..');
var map = mobservable.map;
var autorun = mobservable.autorun;

test('map crud', function(t) {
	var events = [];
	var m = map({ a: 1});
	m.observe(function(changes) {
		events.push(changes);
	});

	t.equal(m.has("a"), true);
	t.equal(m.has("b"), false);
	t.equal(m.get("a"), 1);
	t.equal(m.get("b"), undefined);
	t.equal(m.size, 1);

	m.set("a", 2);
	t.equal(m.has("a"), true);
	t.equal(m.get("a"), 2);

	m.set("b", 3);
	t.equal(m.has("b"), true);
	t.equal(m.get("b"), 3);

	t.deepEqual(m.keys(), ["a", "b"]);
	t.deepEqual(m.values(), [2, 3]);
	t.deepEqual(m.entries(), [["a", 2], ["b", 3]]);
	t.deepEqual(m.toJs(), { a: 2, b: 3});
	t.deepEqual(m.toString(), "[mobservable.map { a: 2, b: 3 }]");
	t.equal(m.size, 2);

	m.clear();
	t.deepEqual(m.keys(), []);
	t.deepEqual(m.values(), []);
	t.deepEqual(m.toJs(), { });
	t.deepEqual(m.toString(), "[mobservable.map {  }]");
	t.equal(m.size, 0);

	t.equal(m.has("a"), false);
	t.equal(m.has("b"), false);
	t.equal(m.get("a"), undefined);
	t.equal(m.get("b"), undefined);

	function removeObjectProp(item) {
		delete item.object;
		return item;
	};
	t.deepEqual(events.map(removeObjectProp),
		[ { type: 'update',
			name: 'a',
			oldValue: 1 },
		{ type: 'add',
			name: 'b' },
		{ type: 'delete',
			name: 'a',
			oldValue: 2 },
		{ type: 'delete',
			name: 'b',
			oldValue: 3 }
		]
	);
	t.end();
})

test('map merge', function(t) {
	var a = map({a: 1, b: 2, c: 2});
	var b = map({c: 3, d: 4});
	a.merge(b);
	t.deepEqual(a.toJs(), { a: 1, b: 2, c: 3, d: 4 });

	t.end();
})

test('observe value', function(t) {
	var a = map();
	var hasX = false;
	var valueX = undefined;
	var valueY = undefined;

	autorun(function () {
		hasX = a.has("x");
	});

	autorun(function() {
		valueX = a.get("x");
	});

	autorun(function() {
		valueY = a.get("y");
	});

	t.equal(hasX, false);
	t.equal(valueX, undefined);

	a.set("x", 3);
	t.equal(hasX, true);
	t.equal(valueX, 3);

	a.set("x", 4);
	t.equal(hasX, true);
	t.equal(valueX, 4);

	a.delete("x");
	t.equal(hasX, false);
	t.equal(valueX, undefined);

	a.set("x", 5);
	t.equal(hasX, true);
	t.equal(valueX, 5);

	t.equal(valueY, undefined);
	a.merge({y : 'hi'});
	t.equal(valueY, 'hi');
	a.merge({y: 'hello'});
	t.equal(valueY, 'hello');

	t.end();
})

test('initialize with entries', function(t) {
	var a = map([["a", 1], ["b", 2]]);
	t.deepEqual(a.toJs(), { a: 1, b: 2});
	t.end();
})

test('observe collections', function(t) {
	var x = map();
	var keys, values, entries;

	autorun(function() {
		keys = x.keys();
	});
	autorun(function() {
		values = x.values();
	});
	autorun(function() {
		entries = x.entries();
	});

	x.set("a", 1);
	t.deepEqual(keys, ["a"]);
	t.deepEqual(values, [1]);
	t.deepEqual(entries, [["a", 1]]);

	// should not retrigger:
	keys = null;
	values = null;
	entries = null;
	x.set("a", 1);
	t.deepEqual(keys, null);
	t.deepEqual(values, null);
	t.deepEqual(entries, null);

	x.set("a", 2);
	t.deepEqual(values, [2]);
	t.deepEqual(entries, [["a", 2]]);

	x.set("b", 3);
	t.deepEqual(keys, ["a","b"]);
	t.deepEqual(values, [2, 3]);
	t.deepEqual(entries, [["a", 2], ["b", 3]]);

	x.has("c");
	t.deepEqual(keys, ["a","b"]);
	t.deepEqual(values, [2, 3]);
	t.deepEqual(entries, [["a", 2], ["b", 3]]);

	x.delete("a");
	t.deepEqual(keys, ["b"]);
	t.deepEqual(values, [3]);
	t.deepEqual(entries, [["b", 3]]);

	t.end();
})

test('asStructure', function(t) {
	var x = map({}, mobservable.asStructure);
	var triggerCount = 0;
	var value = null;

	x.set("a", { b : { c: 1 } } );
	autorun(function() {
		triggerCount += 1;
		value = x.get("a").b.c;
	});

	t.equal(triggerCount, 1);
	t.equal(value, 1);

	x.get("a").b.c = 1;
	x.get("a").b = { c: 1 };
	x.set("a", { b: { c: 1 } });

	t.equal(triggerCount, 1);
	t.equal(value, 1);

	x.get("a").b.c = 2;
	t.equal(triggerCount, 2);
	t.equal(value, 2);

	t.end();
})

test('cleanup', function(t) {
	var x = map({a: 1});

	var aValue;
	var disposer = autorun(function() {
		aValue = x.get("a");
	});

	var observable = x._data.a;

	t.equal(aValue, 1);
	t.equal(observable.observers.length, 1);
	t.equal(x._hasMap.a.observers.length, 1);

	x.delete("a");

	t.equal(aValue, undefined);
	t.equal(observable.observers.length, 0);
	t.equal(x._hasMap.a.observers.length, 1);

	x.set("a", 2);
	observable = x._data.a;

	t.equal(aValue, 2);
	t.equal(observable.observers.length, 1);
	t.equal(x._hasMap.a.observers.length, 1);

	disposer();
	t.equal(aValue, 2);
	t.equal(observable.observers.length, 0);
	t.equal(x._hasMap.a.observers.length, 0);
	t.end();
})

test('strict', function(t) {
	var x = map();
	autorun(function() {
		x.get("y"); // should not throw
	});
	t.end();
})

test('issue 100', function(t) {
	var that = {};
	mobservable.extendObservable(that, {
		myMap: map()
	})
	t.equal(mobservable.isObservableMap(that.myMap), true);
	t.equal(typeof that.myMap.observe, "function");
	t.end();
});