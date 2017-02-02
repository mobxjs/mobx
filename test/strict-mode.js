var test = require('tape');
var mobx = require('../');

var strictError = /Since strict-mode is enabled, changing observable values outside actions is not allowed. Please wrap the code in an `action` if this change is intended. Tried to modify: /;

test('strict mode should not allow changes outside action', t => {
	var a = mobx.observable(2);
	t.equal(mobx.isStrictModeEnabled(), false)
	mobx.useStrict(true);
	t.equal(mobx.isStrictModeEnabled(), true)

	// allowed, a is not observed
	t.doesNotThrow(() => a.set(3), strictError);

	var d = mobx.autorun(() => a.get())
	// not-allowed, a is observed
	t.throws(() => a.set(3), strictError);
	d()

	mobx.useStrict(false);
	t.equal(mobx.isStrictModeEnabled(), false)
	a.set(4);
	t.equal(a.get(), 4);
	t.end();
});

test('actions can modify observed state in strict mode', t => {
	var a = mobx.observable(2);
	var d = mobx.autorun(() => a.get())

	mobx.useStrict(true);
	mobx.action(() => {
		a.set(3);
		var b = mobx.observable(4);
	})();

	mobx.useStrict(false);
	d()
	t.end();
});

test('actions can modify non-observed state in strict mode', t => {
	var a = mobx.observable(2);

	mobx.useStrict(true);
	mobx.action(() => {
		a.set(3);
		var b = mobx.observable(4);
	})();

	mobx.useStrict(false);
	t.end();
});

test('reactions cannot modify state in strict mode', t => {
	var a = mobx.observable(3);
	var b = mobx.observable(4);
	mobx.useStrict(true);
	mobx.extras.resetGlobalState(); // should preserve strict mode

	var bd = mobx.autorun(() => {
		b.get(); // make sure it is observed
	})

	var d = mobx.autorun(() => {
		t.throws(() => {
			a.get();
			b.set(3)
		}, strictError);
	});

	d = mobx.autorun(() => {
		if (a.get() > 5)
			b.set(7);
	});

	mobx.action(() => a.set(4))(); // ok

	t.throws(() => a.set(5), strictError);

	mobx.useStrict(false);
	d()
	bd()
	t.end();
});


test('action inside reaction in strict mode can modify state', t => {
	var a = mobx.observable(1);
	var b = mobx.observable(2);

	var bd = mobx.autorun(() => {
		b.get(); // make sure it is observed
	})

	mobx.useStrict(true);
	var act = mobx.action(() => b.set(b.get() + 1));

	var d = mobx.autorun(() => {
		if (a.get() % 2 === 0)
			act();
		if (a.get() == 16) {
			t.throws(() => b.set(55), strictError, "finishing act should restore strict mode again");
		}
	});

	var setA = mobx.action(val => a.set(val));
	t.equal(b.get(), 2);
	setA(4);
	t.equal(b.get(), 3);
	setA(5);
	t.equal(b.get(), 3);
	setA(16);
	t.equal(b.get(), 4, "b should not be 55");

	mobx.useStrict(false);
	bd()
	d()
	t.end();
});

test('cannot create or modify objects in strict mode without action', t => {
	var obj = mobx.observable({a: 2});
	var ar = mobx.observable([1]);
	var map = mobx.map({ a: 2});

	mobx.useStrict(true);

	// introducing new observables is ok!
	// mobx.observable({ a: 2, b: function() { return this.a }});
	// mobx.observable({ b: function() { return this.a } });
	// mobx.map({ a: 2});
	// mobx.observable([1, 2, 3]);
	// mobx.extendObservable(obj, { b: 4});

	// t.throws(() => obj.a = 3, strictError);
	// t.throws(() => ar[0] = 2, strictError);
	// t.throws(() => ar.push(3), strictError);
	// t.throws(() => map.set("a", 3), strictError);
	// t.throws(() => map.set("b", 4), strictError);
	// t.throws(() => map.delete("a"), strictError);

	mobx.useStrict(false);

	// can modify again
	obj.a  = 42;

	t.end();
})

test('can create objects in strict mode with action', t => {
	var obj = mobx.observable({a: 2});
	var ar = mobx.observable([1]);
	var map = mobx.map({ a: 2});

	mobx.useStrict(true);

	mobx.action(() => {
		mobx.observable({ a: 2, b: function() { return this.a }});
		mobx.map({ a: 2});
		mobx.observable([1, 2, 3]);

		obj.a = 3;
		mobx.extendObservable(obj, { b: 4});
		ar[0] = 2;
		ar.push(3);
		map.set("a", 3);
		map.set("b", 4);
		map.delete("a");
	})();

	mobx.useStrict(false);
	t.end();
})

test('strict mode checks', function(t) {
    var x = mobx.observable(3);
	var d = x.observe(function() {})

    mobx.extras.allowStateChanges(false, function() {
        x.get();
    });

    mobx.extras.allowStateChanges(true, function() {
        x.set(7);
    });

    t.throws(function() {
        mobx.extras.allowStateChanges(false, function() {
            x.set(4);
        });
    });

	mobx.extras.resetGlobalState();
	d()
    t.end();
});
