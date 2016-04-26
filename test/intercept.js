var test = require('tape');
var m = require('..');
var intercept = m.intercept;

test('intercept observable value', t => {
	var a = m.observable(1);
	
	var d = intercept(a, () => {
		return null;
	});
	
	a.set(2);
	
	t.equal(a.get(), 1, "should be unchanged");
	
	d();
	
	a.set(3);
	t.equal(a.get(), 3, "should be changed");
	
	d = intercept(a, (c) => {
		if (c.newValue % 2 === 0)
			throw "value should be odd!";
		return c;
	});
	
	t.throws(() => {
		a.set(4);
	}, "value should be odd!");
	
	t.equal(a.get(), 3, "unchanged");
	a.set(5);
	t.equal(a.get(), 5, "changed");
	
	d();
	d = intercept(a, c => {
		c.newValue *= 2;
		return c;
	});
	
	a.set(6);
	t.equal(a.get(), 12, "should be doubled");
	
	var d2 = intercept(a, c => {
		c.newValue += 1;
		return c;
	});
	
	a.set(7);
	t.equal(a.get(), 15, "doubled and added");
	
	d();
	a.set(8);
	t.equal(a.get(), 9, "just added");
	
	t.end();
});