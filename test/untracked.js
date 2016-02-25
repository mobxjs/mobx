var test = require('tape');
var m = require('..');

test('untracked 1', function(t) {
	var cCalcs = 0, dCalcs = 0;
	var a = m.observable(1);
	var b = m.observable(2);
	var c = m.observable(function() {
		cCalcs++;
		return a.get() + m.untracked(function() {
			return b.get();
		});
	});
	var result;
	
	var d = m.autorun(function() {
		dCalcs++;
		result = c.get();
	});
	
	t.equal(result, 3);
	t.equal(cCalcs, 1);
	t.equal(dCalcs, 1);
	
	b.set(3);
	t.equal(result, 3);
	t.equal(cCalcs, 1);
	t.equal(dCalcs, 1);
	
	a.set(2);
	t.equal(result, 5);
	t.equal(cCalcs, 2);
	t.equal(dCalcs, 2);
	
	t.end();
});