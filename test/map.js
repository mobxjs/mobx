var test = require('tape');
var mobx = require('..');
var map = mobx.map;
var autorun = mobx.autorun;
var iterall = require('iterall');

test('map crud', function (t) {
	mobx.extras.getGlobalState().mobxGuid = 0; // hmm dangerous reset?

	var events = [];
	var m = map({ a: 1 });
	m.observe(function (changes) {
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
	t.deepEqual(m.toJS(), { a: 2, b: 3 });
	t.deepEqual(JSON.stringify(m), '{"a":2,"b":3}');
	t.deepEqual(m.toString(), "ObservableMap@1[{ a: 2, b: 3 }]");
	t.equal(m.size, 2);

	m.clear();
	t.deepEqual(m.keys(), []);
	t.deepEqual(m.values(), []);
	t.deepEqual(m.toJS(), {});
	t.deepEqual(m.toString(), "ObservableMap@1[{  }]");
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
		[{
			type: 'update',
			name: 'a',
			oldValue: 1,
			newValue: 2
		},
		{
			type: 'add',
			name: 'b',
			newValue: 3
		},
		{
			type: 'delete',
			name: 'a',
			oldValue: 2
		},
		{
			type: 'delete',
			name: 'b',
			oldValue: 3
		}
		]
	);
	t.end();
})

test('map merge', function (t) {
	var a = map({ a: 1, b: 2, c: 2 });
	var b = map({ c: 3, d: 4 });
	a.merge(b);
	t.deepEqual(a.toJS(), { a: 1, b: 2, c: 3, d: 4 });

	t.end();
})

test('observe value', function (t) {
	var a = map();
	var hasX = false;
	var valueX = undefined;
	var valueY = undefined;

	autorun(function () {
		hasX = a.has("x");
	});

	autorun(function () {
		valueX = a.get("x");
	});

	autorun(function () {
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
	a.merge({ y: 'hi' });
	t.equal(valueY, 'hi');
	a.merge({ y: 'hello' });
	t.equal(valueY, 'hello');

	a.replace({ y: "stuff", z: "zoef" });
	t.equal(valueY, "stuff");
	t.deepEqual(a.keys(), ["y", "z"])

	t.end();
})

test('initialize with entries', function (t) {
	var a = map([["a", 1], ["b", 2]]);
	t.deepEqual(a.toJS(), { a: 1, b: 2 });
	t.end();
})

test('initialize with empty value', function (t) {
	var a = map();
	var b = map({});
	var c = map([]);

	a.set('0', 0);
	b.set('0', 0);
	c.set('0', 0);

	t.deepEqual(a.toJS(), { '0': 0 });
	t.deepEqual(b.toJS(), { '0': 0 });
	t.deepEqual(c.toJS(), { '0': 0 });

	t.end();
})

test('observe collections', function (t) {
	var x = map();
	var keys, values, entries;

	autorun(function () {
		keys = x.keys();
	});
	autorun(function () {
		values = x.values();
	});
	autorun(function () {
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
	t.deepEqual(keys, ["a", "b"]);
	t.deepEqual(values, [2, 3]);
	t.deepEqual(entries, [["a", 2], ["b", 3]]);

	x.has("c");
	t.deepEqual(keys, ["a", "b"]);
	t.deepEqual(values, [2, 3]);
	t.deepEqual(entries, [["a", 2], ["b", 3]]);

	x.delete("a");
	t.deepEqual(keys, ["b"]);
	t.deepEqual(values, [3]);
	t.deepEqual(entries, [["b", 3]]);

	t.end();
})

test.skip('asStructure', function (t) {
	var x = mobx.observable.structureMap({});
	var triggerCount = 0;
	var value = null;

	x.set("a", { b: { c: 1 } });
	autorun(function () {
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

test('cleanup', function (t) {
	var x = map({ a: 1 });

	var aValue;
	var disposer = autorun(function () {
		aValue = x.get("a");
	});

	var observable = x._data.a;

	t.equal(aValue, 1);
	t.equal(observable.observers.length, 1);
	t.equal(x._hasMap.a.observers.length, 1);

	t.equal(x.delete("a"), true);
	t.equal(x.delete("not-existing"), false);

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

test('strict', function (t) {
	var x = map();
	autorun(function () {
		x.get("y"); // should not throw
	});
	t.end();
})

test('issue 100', function (t) {
	var that = {};
	mobx.extendObservable(that, {
		myMap: map()
	})
	t.equal(mobx.isObservableMap(that.myMap), true);
	t.equal(typeof that.myMap.observe, "function");
	t.end();
});

test('issue 119 - unobserve before delete', function (t) {
	var propValues = [];
	var myObservable = mobx.observable({
		myMap: map()
	});
	myObservable.myMap.set('myId', {
		myProp: 'myPropValue',
		myCalculatedProp: mobx.computed(function () {
			if (myObservable.myMap.has('myId'))
				return myObservable.myMap.get('myId').myProp + ' calculated';
			return undefined;
		})
	});
	// the error only happens if the value is observed
	mobx.autorun(function () {
		myObservable.myMap.values().forEach(function (value) {
			console.log('x');
			propValues.push(value.myCalculatedProp);
		});
	});
	myObservable.myMap.delete('myId');

	t.deepEqual(propValues, ['myPropValue calculated']);
	t.end();
})

test('issue 116 - has should not throw on invalid keys', function (t) {
	var x = map();
	t.equal(x.has(undefined), false);
	t.equal(x.has({}), false);
	t.equal(x.get({}), undefined);
	t.equal(x.get(undefined), undefined);
	t.throws(function () {
		x.set({});
	});
	t.end();
});

test('map modifier', t => {
	var x = mobx.observable.map({ a: 1 });
	t.equal(x instanceof mobx.ObservableMap, true);
	t.equal(mobx.isObservableMap(x), true);
	t.equal(x.get("a"), 1);
	x.set("b", {});
	t.equal(mobx.isObservableObject(x.get("b")), true);

	x = mobx.observable.map([["a", 1]]);
	t.equal(x instanceof mobx.ObservableMap, true);
	t.equal(x.get("a"), 1);

	x = mobx.observable.map();
	t.equal(x instanceof mobx.ObservableMap, true);
	t.deepEqual(x.keys(), []);

	x = mobx.observable({ a: mobx.observable.map({ b: { c: 3 } }) });
	t.equal(mobx.isObservableObject(x), true);
	t.equal(mobx.isObservableObject(x.a), false);
	t.equal(mobx.isObservableMap(x.a), true);
	t.equal(mobx.isObservableObject(x.a.get("b")), true);

	t.end();
});

test('map modifier with modifier', t => {
	var x = mobx.observable.map({ a: { c: 3 } });
	t.equal(mobx.isObservableObject(x.get("a")), true);
	x.set("b", { d: 4 });
	t.equal(mobx.isObservableObject(x.get("b")), true);

	x = mobx.observable.shallowMap({ a: { c: 3 } });
	t.equal(mobx.isObservableObject(x.get("a")), false);
	x.set("b", { d: 4 });
	t.equal(mobx.isObservableObject(x.get("b")), false);

	x = mobx.observable({ a: mobx.observable.shallowMap({ b: {} }) });
	t.equal(mobx.isObservableObject(x), true);
	t.equal(mobx.isObservableMap(x.a), true);
	t.equal(mobx.isObservableObject(x.a.get("b")), false);
	x.a.set("e", {});
	t.equal(mobx.isObservableObject(x.a.get("e")), false);

	t.end();
});

test('256, map.clear should not be tracked', t => {
	var x = new mobx.ObservableMap({ a: 3 });
	var c = 0;
	var d = mobx.autorun(() => { c++; x.clear() });

	t.equal(c, 1);
	x.set("b", 3);
	t.equal(c, 1);

	d();
	t.end();
})


test('256, map.merge should be not be tracked for target', t => {
	var x = mobx.observable.map({ a: 3 });
	var y = mobx.observable.map({ b: 3 });
	var c = 0;

	var d = mobx.autorun(() => {
		c++;
		x.merge(y);
	});

	t.equal(c, 1);
	t.deepEqual(x.keys(), ["a", "b"]);

	y.set("c", 4)
	t.equal(c, 2);
	t.deepEqual(x.keys(), ["a", "b", "c"]);

	x.set("d", 5);
	t.equal(c, 2, "autorun should not have been triggered");
	t.deepEqual(x.keys(), ["a", "b", "c", "d"]);

	d();
	t.end();
})

test('308, map keys should be coerced to strings correctly', t => {
	var m = mobx.map()
	m.set(1, true) // => "[mobx.map { 1: true }]"
	m.delete(1) // => "[mobx.map { }]"
	t.deepEqual(m.keys(), [])

	m.set(1, true) // => "[mobx.map { 1: true }]"
	m.delete('1') // => "[mobx.map { 1: undefined }]"
	t.deepEqual(m.keys(), [])

	m.set(1, true) // => "[mobx.map { 1: true, 1: true }]"
	m.delete('1') // => "[mobx.map { 1: undefined, 1: undefined }]"
	t.deepEqual(m.keys(), [])

	m.set(true, true)
	t.equal(m.get("true"), true)
	m.delete(true)
	t.deepEqual(m.keys(), [])

	t.end()
})

test('map should support iterall / iterable ', t => {
	var a = mobx.map({ a: 1, b: 2 })

	function leech(iter) {
		var values = [];
		do {
			var v = iter.next();
			if (!v.done)
				values.push(v.value);
		} while (!v.done)
		return values;
	}

	t.equal(iterall.isIterable(a), true)

	t.deepEqual(leech(iterall.getIterator(a)), [
		["a", 1],
		["b", 2]
	])

	t.deepEqual(leech(a.entries()), [
		["a", 1],
		["b", 2]
	])

	t.deepEqual(leech(a.keys()), ["a", "b"])
	t.deepEqual(leech(a.values()), [1, 2])

	t.end()
})

test('support for ES6 Map', t => {
	var x = new Map()
	x.set("x", 3)
	x.set("y", 2)

	var m = mobx.observable(x);
	t.equal(mobx.isObservableMap(m), true);
	t.deepEqual(m.entries(), [["x", 3], ["y", 2]]);

	var x2 = new Map()
	x2.set("y", 4)
	x2.set("z", 5)
	m.merge(x2);
	t.deepEqual(m.get("z"), 5)

	var x3 = new Map()
	x3.set({ y: 2 }, { z: 4 })

	t.throws(() => mobx.observable.shallowMap(x3), /only strings, numbers and booleans are accepted as key in observable maps/)

	t.end();
})

test('deepEqual map', t => {
	var x = new Map()
	x.set("x", 3)
	x.set("y", { z: 2 })

	var x2 = mobx.observable.map();
	x2.set("x", 3)
	x2.set("y", { z: 3 })

	t.equals(mobx.extras.deepEqual(x, x2), false)
	x2.get("y").z = 2
	t.equals(mobx.extras.deepEqual(x, x2), true)

	x2.set("z", 1)
	t.equals(mobx.extras.deepEqual(x, x2), false)
	x2.delete("z")
	t.equals(mobx.extras.deepEqual(x, x2), true)
	x2.delete("y")
	t.equals(mobx.extras.deepEqual(x, x2), false)

	t.end();
})

test('798, cannot return observable map from computed prop', t => {
	// MWE: this is an anti pattern, yet should be possible in certain cases nonetheless..?
	// https://jsfiddle.net/7e6Ltscr/

	form = function (settings) {
		var form = mobx.observable({
			reactPropsMap: mobx.observable.map({
				onSubmit: function () {
					console.log('onSubmit init!');
				}
			}),
			model: {
				value: 'TEST'
			}
		});

		form.reactPropsMap.set('onSubmit', function () {
			console.log('onSubmit overwritten!');
		});

		return form;
	};

	customerSearchStore = function () {

		var customerSearchStore = mobx.observable({
			customerType: 'RUBY',
			searchTypeFormStore: mobx.computed(function () {
				return form(customerSearchStore.customerType);
			}),
			customerSearchType: mobx.computed(function () {
				return form(customerSearchStore.searchTypeFormStore.model.value);
			})
		});
		return customerSearchStore;
	};
	var cs = customerSearchStore();

	t.doesNotThrow(() => {
		console.log(cs.customerSearchType);
	})

	t.end()
})