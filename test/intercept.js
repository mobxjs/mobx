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

test('intercept array', t => {
	var a = m.observable([1, 2]);
	
	var d = a.intercept(c => null);
	a.push(2);
	t.deepEqual(a.slice(), [1, 2]);
	
	d();
	
	d = intercept(a, c => {
		if (c.type === "splice") {
			c.added.push(c.added[0] * 2);
			c.removedCount = 1;
			return c;
		} else if (c.type === "update") {
			c.newValue = c.newValue * 3;
			return c;
		}			
	});
	
	a.unshift(3,4);
	
	t.deepEqual(a.slice(), [3, 4, 6, 2], "splice has been modified");
	a[2] = 5;
	t.deepEqual(a.slice(), [3, 4, 15, 2], "update has tripled");
	
	t.end();
});

test('intercept object', t => {
	var a = {
		b: 3
	}
	
	// bit magical, but intercept makes a observable, to be consistent with observe.
	// deprecated immediately :)
	var d = intercept(a, c => {
		c.newValue *= 3;
		return c;
	});
	
	a.b = 4;
	
	t.equal(a.b, 12, "intercept applied");
	
	var d2 = intercept(a, "b", c => {
		c.newValue += 1;
		return c;
	});
	
	a.b = 5;
	t.equal(a.b, 16, "attribute selector applied last");
	
	var d3 = intercept(a, c => {
		t.equal(c.name, "b"),
		t.equal(c.object, a);
		t.equal(c.type, "update");
		return null;
	})
	
	a.b = 7;
	t.equal(a.b, 16, "interceptor not applied");
	
	d3();
	a.b = 7;
	t.equal(a.b, 22, "interceptor applied again");
	
	var d4 = intercept(a, c => {
		if (c.type === "add") {
			return null;
		}
		return c;
	});
	
	m.extendObservable(a, { c: 1 });
	t.equal(a.c, undefined, "extension intercepted");
	t.equal(m.isObservable(a, "c"), false);
	
	d4();

	m.extendObservable(a, { c: 2 });
	t.equal(a.c, 6, "extension not intercepted");
	t.equal(m.isObservable(a, "c"), true);
	
	t.end(); 
});

test('intercept map', t => {
	var a = m.map({
		b: 3
	})
	
	var d = intercept(a, c => {
		c.newValue *= 3;
		return c;
	});
	
	a.set("b", 4);
	
	t.equal(a.get("b"), 12, "intercept applied");
	
	var d2 = intercept(a, "b", c => {
		c.newValue += 1;
		return c;
	});
	
	a.set("b", 5);
	t.equal(a.get("b"), 16, "attribute selector applied last");
	
	var d3 = intercept(a, c => {
		t.equal(c.name, "b"),
		t.equal(c.object, a);
		t.equal(c.type, "update");
		return null;
	})
	
	a.set("b", 7);
	t.equal(a.get("b"), 16, "interceptor not applied");
	
	d3();
	a.set("b", 7);
	t.equal(a.get("b"), 22, "interceptor applied again");
	
	var d4 = intercept(a, c => {
		if (c.type === "delete")
			return null;
		return c;
	});
	
	a.delete("b");
	t.equal(a.has("b"), true);
	t.equal(a.get("b"), 22, "delete intercepted");

	d4();
	a.delete("b");
	t.equal(a.has("b"), false);
	t.equal(a.get("c"), undefined, "delete not intercepted");
	
	t.end(); 
});