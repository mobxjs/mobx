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
