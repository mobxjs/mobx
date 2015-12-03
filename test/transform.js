var m = require('../');
var test = require('tape');

test('transform1', function(t) {
	var todoCalc = 0;
	var stateCalc = 0;
	var state = m.observable({
		todos: [{
			title: "coffee"
		}],
		name: "michel"
	});
	
	var transformResult = m.transform(state, function(object, recurse) {
		// root?
		if (object.name) {
			stateCalc++;
			return object.name + object.todos.map(function(todo) {
				return recurse(todo);
			}).join(",");
		} 
		// todo
		else {
			todoCalc++;
			return object.title.toUpperCase();
		}
	});
	
	var mapped = null;
	m.autorun(function() {
		mapped = transformResult.value.get();
	});

	t.equal(mapped, "michelCOFFEE");
	t.equal(stateCalc, 1);
	t.equal(todoCalc, 1);
	
	state.name = "john";
	t.equal(mapped, "johnCOFFEE");
	t.equal(stateCalc, 2);
	t.equal(todoCalc, 1);
	
	state.todos[0].title = "TEA";
	t.equal(mapped, "johnTEA");
	t.equal(stateCalc, 3);
	t.equal(todoCalc, 2);
	
	state.todos.push({ title: "BISCUIT" });
	t.equal(mapped, "johnTEA,BISCUIT");
	t.equal(stateCalc, 4);
	t.equal(todoCalc, 3);
	
	t.end();
});