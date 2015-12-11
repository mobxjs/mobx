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

test('transform into reactive graph', function(t) {
	
	function Folder(name) {
		m.extendObservable(this, {
			name: name,
			children: []
		});
	}
	
	var _childrenRecalc = 0;
	function DerivedFolder(state, baseFolder) {
		this.state = state;
		this.baseFolder = baseFolder;
		m.extendObservable(this, {
			name: function() {
				return this.baseFolder.name;
			},
			isVisible: function() {
				return !this.state.filter || this.name.indexOf(this.state.filter) !== -1 || this.children.length > 0;
			},
			children: function() {
				_childrenRecalc++;
				return this.baseFolder.children.map(transformFolder).filter(function(folder) {
					return folder.isVisible === true;
				});
			}
		})
	}
	
	var state = m.observable({
		filter: null,
	});

	var _transformCount = 0;
	var transformFolder = m.createTransformer(function(folder) {
		_transformCount++;
		console.log("Transform", folder.name);
		return new DerivedFolder(state, folder);
	});

	state.root = new Folder("/");
	m.autorun(function() {
		state.derived = transformFolder(state.root);
		state.derived.children;
	});
	
	/** test convience */
	function childrenRecalcs() {
		var  a = _childrenRecalc;
		_childrenRecalc = 0;
		return a;
	}

	function transformCount() {
		var  a = _transformCount;
		_transformCount = 0;
		return a;
	}

	t.equal(state.derived.name, "/");
	t.equal(state.derived.children.length, 0);
	t.equal(transformCount(), 1);
	t.equal(childrenRecalcs(), 1);
	
	state.root.children.push(new Folder("hoi"));
	t.equal(state.derived.name, "/");
	t.equal(state.derived.children.length, 1);
	t.equal(state.derived.children[0].name, "hoi");
	t.equal(transformCount(), 1);
	t.equal(childrenRecalcs(), 1);	
	
	state.filter = "boe";
	t.equal(state.derived.name, "/");
	t.equal(state.derived.isVisible, false);
	t.equal(state.derived.children.length, 0);
	t.equal(transformCount(), 0);
	t.equal(childrenRecalcs(), 2);	

	state.filter = "oi";
	t.equal(state.derived.name, "/");
	t.equal(state.derived.isVisible, true);
	t.equal(state.derived.children.length, 1);
	t.equal(state.derived.children[0].name, "hoi");
	t.equal(transformCount(), 0);
	t.equal(childrenRecalcs(), 1);
	
	t.end();
	
});