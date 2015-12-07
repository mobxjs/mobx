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
	
	var mapped;
	var unloaded = [];
	
	var transformState = m.createTransformer(function(state) {
		stateCalc++;
		return state.name + state.todos.map(transformTodo).join(",");
	})
	
	var transformTodo = m.createTransformer(function(todo) {
		todoCalc++;
		return todo.title.toUpperCase();
	}, function cleanup(todo, text) {
		unloaded.push([todo, text]);
	});
	
	m.autorun(function() {
		mapped = transformState(state);
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
	
	var tea = state.todos.shift();
	t.equal(mapped, "johnBISCUIT");
	t.equal(stateCalc, 5);
	t.equal(todoCalc, 3);
	
	t.equal(unloaded.length, 1);
	t.equal(unloaded[0][0], tea);
	t.equal(unloaded[0][1], "TEA");
	t.equal(m.extras.getDNode(tea, "title").observers.length, 0);
	t.equal(m.extras.getDNode(state.todos[0], "title").observers.length, 1);
	
	
	tea.title = "mint";
	t.equal(mapped, "johnBISCUIT");
	t.equal(stateCalc, 5);
	t.equal(todoCalc, 3);
	
	
	t.end();
});

test('transform using root transformer', function(t) {
	var todoCalc = 0;
	var stateCalc = 0;
	var state = m.observable({
		todos: [{
			title: "coffee"
		}],
		name: "michel"
	});
	
	var unloaded = [];
	
	var transformState = m.createTransformer(function(state) {
		stateCalc++;
		return state.name + state.todos.map(transformTodo).join(",");
	})
	
	var transformTodo = m.createTransformer(function(todo) {
		todoCalc++;
		return todo.title.toUpperCase();
	}, function cleanup(todo, text) {
		unloaded.push([todo, text]);
	});
	
	var transformController = transformState.root(state);
	
	t.equal(transformController.value, "michelCOFFEE");
	t.equal(stateCalc, 1);
	t.equal(todoCalc, 1);
	
	state.name = "john";
	t.equal(transformController.value, "johnCOFFEE");
	t.equal(stateCalc, 2);
	t.equal(todoCalc, 1);
	
	state.todos[0].title = "TEA";
	t.equal(transformController.value, "johnTEA");
	t.equal(stateCalc, 3);
	t.equal(todoCalc, 2);
	
	state.todos.push({ title: "BISCUIT" });
	t.equal(transformController.value, "johnTEA,BISCUIT");
	t.equal(stateCalc, 4);
	t.equal(todoCalc, 3);
	
	var tea = state.todos.shift();
	t.equal(transformController.value, "johnBISCUIT");
	t.equal(stateCalc, 5);
	t.equal(todoCalc, 3);
	
	t.equal(unloaded.length, 1);
	t.equal(unloaded[0][0], tea);
	t.equal(unloaded[0][1], "TEA");
	t.equal(m.extras.getDNode(tea, "title").observers.length, 0);
	t.equal(m.extras.getDNode(state.todos[0], "title").observers.length, 1);
	
	tea.title = "mint";
	t.equal(transformController.value, "johnBISCUIT");
	t.equal(stateCalc, 5);
	t.equal(todoCalc, 3);
	
	transformController.dispose();
	
	state.todos[0].title = "disposed";
	t.equal(stateCalc, 5);
	t.equal(todoCalc, 3);
	t.equal(m.extras.getDNode(state, "name").observers.length, 0);
	
	t.throws(function() {
		transformController.value;
	}, "already disposed");
		
	t.end();
});