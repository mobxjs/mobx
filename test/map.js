var mobservable = require('..')
var map = mobservable.map;
var autorun = mobservable.autorun;

exports.mapCrud = function(test) {
	var events = [];
	var m = map({ a: 1});
	m.observe(function(changes) {
		events.push(changes);
	});

	test.equal(m.has("a"), true);
	test.equal(m.has("b"), false);
	test.equal(m.get("a"), 1);
	test.equal(m.get("b"), undefined);
	test.equal(m.size(), 1);

	m.set("a", 2);
	test.equal(m.has("a"), true);
	test.equal(m.get("a"), 2);

	m.set("b", 3);
	test.equal(m.has("b"), true);
	test.equal(m.get("b"), 3);

	test.deepEqual(m.keys(), ["a", "b"]);
	test.deepEqual(m.values(), [2, 3]);
	test.deepEqual(m.entries(), [["a", 2], ["b", 3]]);
	test.deepEqual(m.toJs(), { a: 2, b: 3});
	test.deepEqual(m.toString(), "[mobservable.map { a: 2, b: 3 }]");
	test.equal(m.size(), 2);

	m.clear();
	test.deepEqual(m.keys(), []);
	test.deepEqual(m.values(), []);
	test.deepEqual(m.toJs(), { });
	test.deepEqual(m.toString(), "[mobservable.map {  }]");
	test.equal(m.size(), 0);

	test.equal(m.has("a"), false);
	test.equal(m.has("b"), false);
	test.equal(m.get("a"), undefined);
	test.equal(m.get("b"), undefined);

	test.deepEqual(events,
		[ { type: 'update',
			object: m,
			name: 'a',
			oldValue: 1 },
		{ type: 'add',
			object:  m,
			name: 'b' },
		{ type: 'delete',
			object:  m,
			name: 'a',
			oldValue: 2 },
		{ type: 'delete',
			object: m,
			name: 'b',
			oldValue: 3 }
		]
	);
	test.done();
}

exports.mapMerge = function(test) {
	var a = map({a: 1, b: 2, c: 2});
	var b = map({c: 3, d: 4});
	a.merge(b);
	test.deepEqual(a.toJs(), { a: 1, b: 2, c: 3, d: 4 });

	test.done();
}

exports.testObserveValue = function(test) {
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

	test.equal(hasX, false);
	test.equal(valueX, undefined);

	a.set("x", 3);
	test.equal(hasX, true);
	test.equal(valueX, 3);

	a.set("x", 4);
	test.equal(hasX, true);
	test.equal(valueX, 4);

	a.delete("x");
	test.equal(hasX, false);
	test.equal(valueX, undefined);

	a.set("x", 5);
	test.equal(hasX, true);
	test.equal(valueX, 5);

	test.equal(valueY, undefined);
	a.merge({y : 'hi'});
	test.equal(valueY, 'hi');
	a.merge({y: 'hello'});
	test.equal(valueY, 'hello');

	test.done();
}

exports.testObserveCollections = function(test) {
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
	test.deepEqual(keys, ["a"]);
	test.deepEqual(values, [1]);
	test.deepEqual(entries, [["a", 1]]);

	// should not retrigger:
	keys = null;
	values = null;
	entries = null;
	x.set("a", 1);
	test.deepEqual(keys, null);
	test.deepEqual(values, null);
	test.deepEqual(entries, null);

	x.set("a", 2);
	test.deepEqual(values, [2]);
	test.deepEqual(entries, [["a", 2]]);

	x.set("b", 3);
	test.deepEqual(keys, ["a","b"]);
	test.deepEqual(values, [2, 3]);
	test.deepEqual(entries, [["a", 2], ["b", 3]]);

	x.has("c");
	test.deepEqual(keys, ["a","b"]);
	test.deepEqual(values, [2, 3]);
	test.deepEqual(entries, [["a", 2], ["b", 3]]);

	x.delete("a");
	test.deepEqual(keys, ["b"]);
	test.deepEqual(values, [3]);
	test.deepEqual(entries, [["b", 3]]);

	test.done();
}

exports.testAsStructure = function(test) {
	var x = map({}, mobservable.asStructure);
	var triggerCount = 0;
	var value = null;

	x.set("a", { b : { c: 1 } } );
	autorun(function() {
		triggerCount += 1;
		value = x.get("a").b.c;
	});

	test.equal(triggerCount, 1);
	test.equal(value, 1);

	x.get("a").b.c = 1;
	x.get("a").b = { c: 1 };
	x.set("a", { b: { c: 1 } });

	test.equal(triggerCount, 1);
	test.equal(value, 1);

	x.get("a").b.c = 2;
	test.equal(triggerCount, 2);
	test.equal(value, 2);

	test.done();
}

exports.testCleanup = function(test) {
	var x = map({a: 1});

	var aValue;
	var disposer = autorun(function() {
		aValue = x.get("a");
	});

	var observable = x._data.a;

	test.equal(aValue, 1);
	test.equal(observable.observers.length, 1);
	test.equal(x._hasMap.a.observers.length, 1);

	x.delete("a");

	test.equal(aValue, undefined);
	test.equal(observable.observers.length, 0);
	test.equal(x._hasMap.a.observers.length, 1);

	x.set("a", 2);
	observable = x._data.a;

	test.equal(aValue, 2);
	test.equal(observable.observers.length, 1);
	test.equal(x._hasMap.a.observers.length, 1);

	disposer();
	test.equal(aValue, 2);
	test.equal(observable.observers.length, 0);
	test.equal(x._hasMap.a.observers.length, 0);
	test.done();
}

exports.testExtras = function(test) {
	var m = map({a : 1});
	test.equal(mobservable.isObservable(m), true);

	test.deepEqual(mobservable.toJSON(m), m.toJs());

	test.ok(mobservable.extras.getDNode(m._data.a));
	test.equal(mobservable.extras.getDNode(m, "a"),  mobservable.extras.getDNode(m._data.a));

	function name(thing, prop) {
		return mobservable.extras.getDNode(thing, prop).context.name;
	}

	test.equal(name(m, "a"), ".a");
	test.equal(name(m._data.a), ".a");
	test.equal(name(m._hasMap.a), ".(has)a");
	test.equal(name(m._keys), ".keys()");
	test.done();
}

exports.testStrict = function(test) {
	var x = map();
	autorun(function() {
		mobservable.extras.withStrict(true, function() {
			x.get("y"); // should not throw
		});
	});
	test.done();
}