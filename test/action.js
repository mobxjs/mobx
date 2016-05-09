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

// test action should be untracked

test('action modifications should be picked up', t => {
	
	t.end();
});

// test('action should respect strict mode', t => {

// });

// test('strict mode should not allow changes outside action', t => {
	
// });