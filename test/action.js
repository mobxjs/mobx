var test = require('tape');
var mobx = require('../');

test('action should wrap in transaction', t => {
	var values = [];

	var observable = mobx.observable(0);
	var d = mobx.autorun(() => values.push(observable.get()));

	var increment = mobx.action("increment", (amount) => {
		observable.set(observable.get() + amount * 2);
		observable.set(observable.get() - amount); // oops
	});

	increment(7);

	t.deepEqual(values, [0, 7]);

	t.end();
});


test('action modifications should be picked up 1', t => {
	var a = mobx.observable(1);
	var i = 3;
	var b = 0;

	mobx.autorun(() => {
		b = a.get() * 2;
	});

	t.equal(b, 2);

	var action = mobx.action(() => {
		a.set(++i);
	});

	action();
	t.equal(b, 8);

	action();
	t.equal(b, 10);

	t.end();
});

test('action modifications should be picked up 1', t => {
	var a = mobx.observable(1);
	var b = 0;

	mobx.autorun(() => {
		b = a.get() * 2;
	});

	t.equal(b, 2);

	var action = mobx.action(() => {
		a.set(a.get() + 1); // ha, no loop!
	});

	action();
	t.equal(b, 4);

	action();
	t.equal(b, 6);

	t.end();
});

test('action modifications should be picked up 3', t => {
	var a = mobx.observable(1);
	var b = 0;

	var doubler = mobx.computed(() => a.get() * 2);

	doubler.observe(() => {
		b = doubler.get();
	}, true);

	t.equal(b, 2);

	var action = mobx.action(() => {
		a.set(a.get() + 1); // ha, no loop!
	});

	action();
	t.equal(b, 4);

	action();
	t.equal(b, 6);

	t.end();
});


// test action should be untracked
// test('action should respect strict mode', t => {

// });

// test('strict mode should not allow changes outside action', t => {

// });