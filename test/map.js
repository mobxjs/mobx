"use strict"

var test = require('tape');
var mobx = require('..');
var map = mobx.map;
var autorun = mobx.autorun;
var iterall = require('iterall');

test('map crud', function (t) {
	mobx.extras.getGlobalState().mobxGuid = 0; // hmm dangerous reset?

	var events = [];
	var m = map({ '1': 'a' });
	m.observe(function (changes) {
		events.push(changes);
	});

	t.equal(m.has("1"), true);
	t.equal(m.has(1), false);
	t.equal(m.get("1"), 'a');
	t.equal(m.get("b"), undefined);
	t.equal(m.size, 1);

	m.set("1", 'aa');
	m.set(1, 'b');
	t.equal(m.has("1"), true);
	t.equal(m.get("1"), 'aa');
	t.equal(m.get(1), 'b');

	var k = ['arr'];
	m.set(k, 'arrVal');
	t.equal(m.has(k), true);
	t.equal(m.get(k), 'arrVal');
  
	t.deepEqual(m.keys(), ["1", 1, k]);
	t.deepEqual(m.values(), ['aa', 'b', 'arrVal']);
	t.deepEqual(m.entries(), [["1", 'aa'], [1, 'b'], [k, 'arrVal']]);
	t.deepEqual(m.toJS(), new Map([['1', 'b'], [k, 'arrVal']]));
	t.deepEqual(m.toPOJO(), { '1': 'b', 'arr': 'arrVal' });
	t.deepEqual(JSON.stringify(m), '{"1":"b","arr":"arrVal"}');
	t.deepEqual(m.toString(), "ObservableMap@1[{ 1: aa, 1: b, arr: arrVal }]");
	t.equal(m.size, 3);

	m.clear();
	t.deepEqual(m.keys(), []);
	t.deepEqual(m.values(), []);
	t.deepEqual(m.toJS(), {});
	t.deepEqual(m.toString(), "ObservableMap@1[{  }]");
	t.equal(m.size, 0);

	t.equal(m.has("1"), false);
	t.equal(m.has("2"), false);
	t.equal(m.get("1"), undefined);
	t.equal(m.get("2"), undefined);

	function removeObjectProp(item) {
		delete item.object;
		return item;
	};
	t.deepEqual(events.map(removeObjectProp),
		[{ type: 'update',
			name: '1',
			oldValue: 'a',
			newValue: 'aa'
		},
		{ type: 'add',
			name: '1',
			newValue: 'b'
		},
		{ type: 'add',
			name: 'arr',
			newValue: 'arrVal'
		},
		{ type: 'delete',
			name: '1',
			oldValue: 'aa'
		},
		{ type: 'delete',
			name: '1',
			oldValue: 'b'
		},
		{ type: 'delete',
			name: 'arr',
			oldValue: 'arrVal'
		}
		]
	);
	t.end();
})

test('map merge', function (t) {
	var a = map({ '0': 0, a: 1, b: 2, c: 2 });
	var b = map({ c: 3, d: 4 });
	var c = map(new Map([[0, 4], ['d', 5]]));
	a.merge(b).merge(c);
	t.deepEqual(a.toJS(), new Map([['0', 0], ['a', 1], ['b', 2], ['c', 3], [0, 4], ['d', 5]]));

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
	t.deepEqual(a.toJS(), new Map([["a", 1], ["b", 2]]));
	t.end();
})

test('initialize with empty value', function (t) {
	var a = map();
	var b = map({});
	var c = map([]);

	a.set('0', 0);
	b.set('0', 0);
	c.set('0', 0);

	t.deepEqual(a.toJS(), new Map([['0', 0]]));
	t.deepEqual(b.toJS(), new Map([['0', 0]]));
	t.deepEqual(c.toJS(), new Map([['0', 0]]));

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

	var observable = x._data.get("a");

	t.equal(aValue, 1);
	t.equal(observable.observers.length, 1);
	t.equal(x._hasMap.get("a").observers.length, 1);

	t.equal(x.delete("a"), true);
	t.equal(x.delete("not-existing"), false);

	t.equal(aValue, undefined);
	t.equal(observable.observers.length, 0);
	t.equal(x._hasMap.get("a").observers.length, 1);

	x.set("a", 2);
	observable = x._data.get("a");

	t.equal(aValue, 2);
	t.equal(observable.observers.length, 1);
	t.equal(x._hasMap.get("a").observers.length, 1);

	disposer();
	t.equal(aValue, 2);
	t.equal(observable.observers.length, 0);
	t.equal(x._hasMap.get("a").observers.length, 0);
	t.end();
})

test('strict', function (t) {
	var x = map();
	autorun(function () {
		x.get("y"); // should not throw
	});
	t.end();
})

test('NaN as map key', function(t) {
	var a = map(new Map([[NaN, 0]]));

	t.equal(a.has(NaN), true);
	t.equal(a.get(NaN), 0);
	a.set(NaN, 1);
	a.merge(map(new Map([[NaN, 2]])));
	t.equal(a.get(NaN), 2);
	t.equal(a.size, 1);

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

test('map modifier', t => {
	var x = mobx.observable(mobx.asMap({ a: 1 }));
	t.equal(x instanceof mobx.ObservableMap, true);
	t.equal(mobx.isObservableMap(x), true);
	t.equal(x.get("a"), 1);
	x.set("b", {});
	t.equal(mobx.isObservableObject(x.get("b")), true);

	x = mobx.observable(mobx.asMap([["a", 1]]));
	t.equal(x instanceof mobx.ObservableMap, true);
	t.equal(x.get("a"), 1);

	x = mobx.observable(mobx.asMap());
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

// TODO: test, asMap should be sticky?

test('256, map.clear should not be tracked', t => {
	var x = mobx.observable(mobx.asMap({ a: 3 }));
	var c = 0;
	var d = mobx.autorun(() => { c++; x.clear() });

	t.equal(c, 1);
	x.set("b", 3);
	t.equal(c, 1);

	d();
	t.end();
})


test('256, map.merge should be not be tracked for target', t => {
	var x = mobx.observable(mobx.asMap({ a: 3 }));
	var y = mobx.observable(mobx.asMap({ b: 3 }));
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

	// t.throws(() => mobx.observable.shallowMap(x3), /only strings, numbers and booleans are accepted as key in observable maps/)

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

	const form = function (settings) {
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

	const customerSearchStore = function () {

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

test('869, deeply observable map should make added items observables as well', t => {
  var store = {
    map_deep1: mobx.observable(new Map()),
    map_deep2: mobx.observable.map(),
  };

  t.ok(mobx.isObservable(store.map_deep1), 'should make map Observable');
  t.ok(mobx.isObservableMap(store.map_deep1), 'should make map ObservableMap');
  t.ok(mobx.isObservable(store.map_deep2), 'should make map Observable');
  t.ok(mobx.isObservableMap(store.map_deep2), 'should make map ObservableMap');

  store.map_deep2.set('a', []);
  t.ok(mobx.isObservable(store.map_deep2.get('a')), 'should make added items observables');

  store.map_deep1.set('a', []);
  t.ok(mobx.isObservable(store.map_deep1.get('a')), 'should make added items observables');

  t.end();
});

test('using deep map', t => {
  var store = {
    map_deep: mobx.observable(new Map()),
  };

  // Creating autorun triggers one observation, hence -1
  let observed = -1;
  mobx.autorun(function () {
    // Use the map, to observe all changes
    var _ = mobx.toJS(store.map_deep);
    observed++;
  });

  store.map_deep.set('shoes', []);
  t.equal(observed, 1, 'should observe new item added');

  store.map_deep.get('shoes').push({ color: 'black' });
  t.equal(observed, 2, 'should observe item mutated');

  store.map_deep.get('shoes')[0].color = 'red';
  t.equal(observed, 3, 'should observe nested item mutated');

  t.end();
});

test("issue 893", t => {
  const m = mobx.observable.map();
  const keys = ['constructor', 'toString', 'assertValidKey', 'isValidKey', 'toJSON', 'toJS']
  for (let key of keys) {
	  t.equal(m.get(key), undefined);
  }
  t.end();
});

test("work with 'toString' key", t => {
	const m = mobx.observable.map();
	t.equal(m.get('toString'), undefined);
	m.set('toString', 'test');
	t.equal(m.get('toString'), 'test');
	t.end();
});