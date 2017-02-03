"use strict"

var test = require('tape');
var mobx = require('../');
var utils = require('./utils/test-utils');

test('action should wrap in transaction', t => {
	var values = [];

	var observable = mobx.observable(0);
	var d = mobx.autorun(() => values.push(observable.get()));

	var increment = mobx.action("increment", (amount) => {
		observable.set(observable.get() + amount * 2);
		observable.set(observable.get() - amount); // oops
	});

	t.equal(mobx.isAction(increment), true);
	t.equal(mobx.isAction(function () {}), false);

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


test('test action should be untracked', t => {
	var a = mobx.observable(3);
	var b = mobx.observable(4);
	var latest = 0;
	var runs = 0;

	var action = mobx.action((baseValue) => {
		b.set(baseValue * 2);
		latest = b.get(); // without action this would trigger loop
	});

	var d = mobx.autorun(() => {
		runs++;
		var current = a.get();
		action(current);
	});

	t.equal(b.get(), 6);
	t.equal(latest, 6);

	a.set(7);
	t.equal(b.get(), 14);
	t.equal(latest, 14);

	a.set(8);
	t.equal(b.get(), 16);
	t.equal(latest, 16);

	b.set(7); // should have no effect
	t.equal(a.get(), 8)
	t.equal(b.get(), 7);
	t.equal(latest, 16); // effect not triggered

	a.set(3);
	t.equal(b.get(), 6);
	t.equal(latest, 6);

	t.equal(runs, 4);

	d();
	t.end();
});

test('should be possible to create autorun in ation', t => {
	var a = mobx.observable(1);
	var values = [];

	var adder = mobx.action(inc => {
		return mobx.autorun(() => {
			values.push(a.get() + inc);
		})
	});

	var d1 = adder(2);
	a.set(3);
	var d2 = adder(17);
	a.set(24);
	d1();
	a.set(11);
	d2();
	a.set(100);

	t.deepEqual(values, [
		3,
		5,
		20,
		41,
		26,
		28
	]);
	t.end();
})

test('should be possible to change unobserved state in an action called from computed', t => {
	var a = mobx.observable(2);

	var testAction = mobx.action(() => {
		a.set(3)
	});

	var c = mobx.computed(() => {
		testAction();
	});

	t.plan(1)
	mobx.autorun(() => {
		t.doesNotThrow(() => {
			c.get()
		})
	});

	mobx.extras.resetGlobalState();
	t.end();
});

test('should not be possible to change observed state in an action called from computed', t => {
	var a = mobx.observable(2);
	var d = mobx.autorun(() => {
		a.get()
	})

	var testAction = mobx.action(() => {
		a.set(3)
	});

	var c = mobx.computed(() => {
		testAction();
		return a.get()
	});

	t.throws(() => {
		c.get()
	}, /Computed values are not allowed to not cause side effects by changing observables that are already being observed/)

	mobx.extras.resetGlobalState();
	d();
	t.end();
});

test('action in autorun should be untracked', t => {
	var a = mobx.observable(2);
	var b = mobx.observable(3);

	var data = [];
	var multiplier = mobx.action(val => val * b.get());

	var d = mobx.autorun(() => {
		data.push(multiplier(a.get()));
	});

	a.set(3);
	b.set(4);
	a.set(5);

	d();

	a.set(6);

	t.deepEqual(data, [
		6, 9, 20
	]);

	t.end();
})

test('action should not be converted to computed when using (extend)observable', t => {
	var a = mobx.observable({
		a: 1,
		b: mobx.action(function() {
			this.a++;
		})
	})

	t.equal(mobx.isAction(a.b), true);
	a.b();
	t.equal(a.a, 2);

	mobx.extendObservable(a, {
		c: mobx.action(function() {
			this.a *= 3;
		})
	});

	t.equal(mobx.isAction(a.c), true);
	a.c();
	t.equal(a.a, 6);

	t.end();
})

test('#286 exceptions in actions should not affect global state', t => {
	var autorunTimes = 0;
    function Todos() {
		mobx.extendObservable(this, {
			count: 0,
			add: mobx.action(function() {
				this.count++;
				if (this.count === 2) {
					throw new Error('An Action Error!');
				}
			})
		})
    }
    const todo = new Todos;
    mobx.autorun(() => {
		autorunTimes++;
		return todo.count;
    });
    try {
		todo.add();
		t.equal(autorunTimes, 2);
		todo.add();
    } catch (e) {
		t.equal(autorunTimes, 3);
		todo.add();
		t.equal(autorunTimes, 4);
    }
	t.end();
})

test('runInAction', t => {
	mobx.useStrict(true);
	var values = [];
	var events = [];
	var spyDisposer = mobx.spy(ev => {
		if (ev.type === 'action') events.push({
			name: ev.name,
			arguments: ev.arguments
		})
	});

	var observable = mobx.observable(0);
	var d = mobx.autorun(() => values.push(observable.get()));

	var res = mobx.runInAction("increment", () => {
		observable.set(observable.get() + 6 * 2);
		observable.set(observable.get() - 3); // oops
		return 2;
	});

	t.equal(res, 2);
	t.deepEqual(values, [0, 9]);

	res = mobx.runInAction(() => {
		observable.set(observable.get() + 5 * 2);
		observable.set(observable.get() - 4); // oops
		return 3;
	});

	t.equal(res, 3);
	t.deepEqual(values, [0, 9, 15]);
	t.deepEqual(events, [
		{ arguments: [], name: 'increment' },
		{ arguments: [], name: '<unnamed action>' }
	]);

	mobx.useStrict(false);
	spyDisposer();

	d();
	t.end();
})

test('action in autorun does not keep / make computed values alive', t => {
	let calls = 0
	const myComputed = mobx.computed(() => calls++)
	const callComputedTwice = () => {
		myComputed.get()
		myComputed.get()
	}

	const runWithMemoizing = fun => { mobx.autorun(fun)() }

	callComputedTwice()
	t.equal(calls, 2)

	runWithMemoizing(callComputedTwice)
	t.equal(calls, 3)

	callComputedTwice()
	t.equal(calls, 5)

	runWithMemoizing(function() {
		mobx.runInAction(callComputedTwice)
	})
	t.equal(calls, 6)

	callComputedTwice()
	t.equal(calls, 8)

	t.end()
})

test('computed values and actions', t => {
	let calls = 0

	const number = mobx.observable(1)
	const squared = mobx.computed(() => {
		calls++
		return number.get() * number.get()
	})
	const changeNumber10Times = mobx.action(() => {
		squared.get()
		squared.get()
		for (let i = 0; i < 10; i++)
			number.set(number.get() + 1)
	})

	changeNumber10Times()
	t.equal(calls, 1)

	mobx.autorun(() => {
		changeNumber10Times()
		t.equal(calls, 2)
	})()
	t.equal(calls, 2)

	changeNumber10Times()
	t.equal(calls, 3)

	t.end()
})

test('bound actions bind', t => {
	var called = 0;
	var x = mobx.observable({
		y: 0,
		z: mobx.action.bound(function(v) {
			this.y += v;
			this.y += v;
		}),

		get yValue() {
			called++;
			return this.y;
		}
	})

	var d = mobx.autorun(() => {
		x.yValue;
	})
	var events = [];
	var d2 = mobx.spy(e => events.push(e));

	var runner = x.z;
	runner(3);
	t.equal(x.yValue, 6);
	t.equal(called, 2);

	t.deepEqual(events.filter(e => e.type === "action").map(e => e.name), ["z"])
	t.deepEqual(Object.keys(x), ["y"]);

	d();
	d2();
	t.end();
})
