var test = require('tape');
var m = require('..');

test('autorun passes Reaction as an argument to view function', function(t) {
	var a = m.observable(1);
	var values = [];

	m.autorun(r => {
		t.equal(typeof r.dispose, 'function');
		if (a.get() === 'pleaseDispose') r.dispose();
		values.push(a.get());
	});

	a.set(2);
	a.set(2);
	a.set('pleaseDispose');
	a.set(3);
	a.set(4);

	t.deepEqual(values, [1, 2, 'pleaseDispose']);

	t.end()
});

test('autorun can be disposed on first run', function(t) {
	var a = m.observable(1);
	var values = [];

	m.autorun(r => {
		r.dispose();
		values.push(a.get());
	});

	a.set(2);

	t.deepEqual(values, [1]);

	t.end()
});

test('autorun warns when passed an action', function(t) {
	var action = m.action(() => {});
	t.plan(1);
	t.throws(() => m.autorun(action), /attempted to pass an action to autorun/);
	t.end();
});

test('autorun batches automatically', function(t) {
	var runs = 0;
	var a1runs = 0;
	var a2runs = 0;

	var x = m.observable({
		a: 1,
		b: 1,
		c: 1,
		get d() {
			runs++
			return this.c + this.b
		}
	})

	var d1 = m.autorun(() => {
		a1runs++
		x.d; // read
	})

	var d2 = m.autorun(() => {
		a2runs++
		x.b = x.a
		x.c = x.a
	})

	t.equal(a1runs, 1)
	t.equal(a2runs, 1)
	t.equal(runs, 1)

	x.a = 17

	t.equal(a1runs, 2)
	t.equal(a2runs, 2)
	t.equal(runs, 2)

	d1()
	d2()
	t.end();
})


test('autorun tracks invalidation of unbound dependencies', function(t) {
	var a = m.observable(0);
	var b = m.observable(0);
	var c = m.computed(() => a.get() + b.get());
	var values = [];

	m.autorun(() => {
		values.push(c.get());
		b.set(100);
	});

	a.set(1);
	t.deepEqual(values, [0, 100, 101]);
	t.end();
})
