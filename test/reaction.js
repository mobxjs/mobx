var test = require('tape')
var mobx = require('..')
var reaction = mobx.reaction

test('basic', t => {
	var a = mobx.observable(1);
	var values = [];

	var d = reaction(() => a.get(), newValue => {
		values.push(newValue);
	})

	a.set(2);
	a.set(3);
	d();
	a.set(4);

	t.deepEqual(values, [2, 3]);
	t.end();
})

test('effect fireImmediately is honored', t => {
	var a = mobx.observable(1);
	var values = [];

	var d = reaction(() => a.get(), newValue => {
		values.push(newValue);
	}, true)

	a.set(2);
	a.set(3);
	d();
	a.set(4);

	t.deepEqual(values, [1, 2, 3]);
	t.end()
})

test('effect is untracked', t => {
	var a = mobx.observable(1);
	var b =  mobx.observable(2);
	var values = [];

	var d = reaction(() => a.get(), newValue => {
		values.push(newValue * b.get());
	}, true)

	a.set(2);
	b.set(7); // shoudn't trigger a new change
	a.set(3);
	d();
	a.set(4);

	t.deepEqual(values, [2, 4, 21]);
	t.end()
})

test('effect debounce is honored', t => {
	t.plan(2)

	var a = mobx.observable(1);
	var values = [];
	var exprCount = 0;

	var d = reaction(() => {
		exprCount ++;
		return a.get()
	}, newValue => {
		values.push(newValue);
	}, false, 100)

	setTimeout(() => a.set(2), 30); // should not become visible nor evaluate expr; first is skipped
	setTimeout(() => a.set(3), 150); // should not be visible, combined with the next
	setTimeout(() => a.set(4), 160);
	setTimeout(() => a.set(5), 300);
	setTimeout(() => d(), 500);
	setTimeout(() => a.set(6), 700);

	setTimeout(() => {
		t.deepEqual(values, [4, 5])
		t.equal(exprCount, 3)
	}, 900)
})

test('effect debounce + fire immediately is honored', t => {
	t.plan(2)

	var a = mobx.observable(1);
	var values = [];
	var exprCount = 0;

	var d = reaction(() => {
		exprCount ++;
		return a.get()
	}, newValue => {
		values.push(newValue);
	}, true, 100)

	setTimeout(() => a.set(3), 150);
	setTimeout(() => a.set(4), 300);

	setTimeout(() => {
		d();
		t.deepEqual(values, [1, 3, 4])
		t.equal(exprCount, 3)
	}, 500)
})

test("#278 do not rerun if expr output doesn't change", t => {
	var a = mobx.observable(1);
	var values = [];

	var d = reaction(() => a.get() < 10 ? a.get() : 11, newValue => {
		values.push(newValue);
	})

	a.set(2);
	a.set(3);
	a.set(10);
	a.set(11);
	a.set(12);
	a.set(4);
	a.set(5);
	a.set(13);

	d();
	a.set(4);

	t.deepEqual(values, [2, 3, 11, 4, 5, 11]);
	t.end();
})

test("#278 do not rerun if expr output doesn't change structurally", t => {
	var users = mobx.observable([
		{
			name: "jan",
			uppername: function() { return this.name.toUpperCase() }
		},
		{
			name: "piet",
			uppername: function() { return this.name.toUpperCase() }
		}
	]);
	var values = [];

	var d = reaction(mobx.asStructure(
		() => users.map(user => user.uppername)	
	), newValue => {
		values.push(newValue);
	}, true)

	users[0].name = "john";
	users[0].name = "JoHn";
	users[0].name = "jOHN";
	users[1].name = "johan";

	d();
	users[1].name = "w00t";

	t.deepEqual(values, [
		["JAN", "PIET"],
		["JOHN", "PIET"],
		["JOHN", "JOHAN"]
	]);
	t.end();
})
