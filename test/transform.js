var m = require('../');
var test = require('tape');
var TransformUtils = require('./utils/transform');

test('transform1', function(t) {
	m.extras.resetGlobalState();
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
	}, function cleanup(text, todo) {
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
	t.equal(tea.$mobx.values.title.observers.length, 0);
	t.equal(state.todos[0].$mobx.values.title.observers.length, 1);


	tea.title = "mint";
	t.equal(mapped, "johnBISCUIT");
	t.equal(stateCalc, 5);
	t.equal(todoCalc, 3);

	t.deepEqual(Object.keys(state.todos[0]), ["title"]);


	t.end();
});

test('createTransformer as off-instance computed', t => {
	var runs = 0;

	// observable in closure
	var capitalize = m.observable(false);

	var _computeDisplayName = person => {
		runs++; // count the runs
		var res = person.firstName + " "  + person.lastName;
		if (capitalize.get())
			return res.toUpperCase();
		return res;
	};
	
	// transformer creates a computed but reuses it for every time the same object is passed in
	var displayName = m.createTransformer(_computeDisplayName);
	
	var person1 = m.observable({
		firstName: "Mickey",
		lastName: "Mouse"
	});
	
	var person2 = m.observable({
		firstName: "Donald",
		lastName: "Duck"
	});

	var persons = m.observable([]);
	var displayNames = [];
	
	var disposer = m.autorun(() => {
		displayNames = persons.map(p => displayName(p));
	});
	
	t.equal(runs, 0);
	t.deepEqual(displayNames, []);
	
	persons.push(person1);
	t.equal(runs, 1);
	t.deepEqual(displayNames, ["Mickey Mouse"]);
	
	t.equal(displayName(person1), "Mickey Mouse");
	t.equal(runs, 1, "No new run needed; behaves like a normal computes");
	
	persons.push(person2);
	t.equal(runs, 2, "person 2 calculated");
	t.deepEqual(displayNames, ["Mickey Mouse", "Donald Duck"]);
	
	persons.push(person1);
	t.equal(runs, 2, "person 1 not recalculated");
	t.deepEqual(displayNames, ["Mickey Mouse", "Donald Duck", "Mickey Mouse"]);
	
	person1.firstName = "Minnie";
	t.equal(runs, 3, "computed run only one other time");
	t.deepEqual(displayNames, ["Minnie Mouse", "Donald Duck", "Minnie Mouse"]);

	capitalize.set(true);
	t.equal(runs, 5, "both computeds were invalidated")
	t.deepEqual(displayNames, ["MINNIE MOUSE", "DONALD DUCK", "MINNIE MOUSE"]);

	persons.splice(1, 1);
	t.deepEqual(displayNames, ["MINNIE MOUSE", "MINNIE MOUSE"]);
	
	person2.firstName = "Dagobert";
	t.equal(runs, 5, "No re-run for person2; not observed anymore");
	
	disposer();
	person1.lastName = "Maxi";
	t.equal(runs, 5, "No re-run for person1; not observed anymore");

	t.equal(displayName(person1), "MINNIE MAXI", "display name still consistent");
	t.equal(runs, 6, "Re-run was needed because lazy mode");

	t.end();
});

test('163 - resetGlobalState should clear cache', function(t) {
	var runs = 0;
	function doubler(x) {
		runs++;
		return { value: x.value * 2 };
	}

	var doubleTransformer = m.createTransformer(doubler);
	var a = { value: 2 };

	var autorunTrigger = m.observable(1);
	var transformOutputs = [];

	m.autorun(function() {
		autorunTrigger.get();
		transformOutputs.push(doubleTransformer(a));
	});
	t.equal(runs, 1);

	autorunTrigger.set(2);
	t.equal(runs, 1);
	t.equal(transformOutputs.length, 2);
	t.equal(transformOutputs[1], transformOutputs[0], "transformer should have returned from cache");

	m.extras.resetGlobalState();

	autorunTrigger.set(3);
	t.equal(runs, 2);
	t.equal(transformOutputs.length, 3);
	t.notEqual(transformOutputs[2], transformOutputs[1], "transformer should NOT have returned from cache");

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

// testing: https://github.com/mobxjs/mobx/issues/67
test('transform tree (modifying tree incrementally)', function(t) {
	var pluckFn = TransformUtils.pluckFn;
	var identity = TransformUtils.identity;
	var testSet = TransformUtils.testSet();
	var state = testSet.state;
	var stats = testSet.stats;
	var TreeNode = testSet.TreeNode;
	var DisplayNode = testSet.DisplayNode;

	var nodeCreateCount = 0;
	var renderCount = 0;
	var renderNodeCount = 0;

	var transformNode = m.createTransformer(function(node) {
		nodeCreateCount++;
		return new DisplayNode(node);
	}, function cleanup(displayNode, node) { displayNode.destroy(); });

	// transform nodes to renderedNodes
	m.autorun(function() {
		// KM: ideally, I would like to do an assignment here, but it creates a cycle and would need to preserve ms.asStructure:
		//
		// state.renderedNodes = state.root ? state.root.map(transformNode) : [];
		//

		var renderedNodes = state.root ? state.root.map(transformNode) : [];
		state.renderedNodes.replace(renderedNodes);
	});

	// render
	m.autorun(function() {
		renderCount++;
		renderNodeCount += state.renderedNodes.length;
	});

	t.equal(nodeCreateCount,	0);
	t.equal(stats.refCount,	0);
	t.equal(renderCount, 			1);
	t.equal(renderNodeCount, 	0);
	t.deepEqual(state.renderedNodes.length, 0);

	////////////////////////////////////
	// Incremental Tree
	////////////////////////////////////

	// initialize root
	var node = new TreeNode('root');
	state.root = node;
	t.equal(nodeCreateCount,	1);
	t.equal(stats.refCount,	1);
	t.equal(renderCount, 			2);
	t.equal(renderNodeCount, 	1);
	t.deepEqual(state.renderedNodes.length, 1);
	t.deepEqual(state.renderedNodes.map(pluckFn('node')), state.root.map(identity));
	t.deepEqual(state.renderedNodes.map(pluckFn('node.name')), ['root']);

	// add first child
	state.root.addChild(new TreeNode('root-child-1'));
	t.equal(nodeCreateCount,	1 + 1);
	t.equal(stats.refCount,	1 + 1);
	t.equal(renderCount, 			2 + 1);
	t.equal(renderNodeCount, 	1 + 2);
	t.deepEqual(state.renderedNodes.length, 2);
	t.deepEqual(state.renderedNodes.map(pluckFn('node')), state.root.map(identity));
	t.deepEqual(state.renderedNodes.map(pluckFn('node.name')), ['root', 'root-child-1']);

	// add second child
	state.root.addChild(new TreeNode('root-child-2'));
	t.equal(nodeCreateCount,	1 + 1 + 1);
	t.equal(stats.refCount,	1 + 1 + 1);
	t.equal(renderCount, 			2 + 1 + 1);
	t.equal(renderNodeCount, 	1 + 2 + 3);
	t.deepEqual(state.renderedNodes.length, 3);
	t.deepEqual(state.renderedNodes.map(pluckFn('node')), state.root.map(identity));
	t.deepEqual(state.renderedNodes.map(pluckFn('node.name')), ['root', 'root-child-1', 'root-child-2']);

	// add first child to second child
	node = state.root.find(function(node) { return node.name === 'root-child-2'; });
	node.addChild(new TreeNode('root-child-2-child-1'));
	t.equal(nodeCreateCount,	1 + 1 + 1 + 1);
	t.equal(stats.refCount,	1 + 1 + 1 + 1);
	t.equal(renderCount, 			2 + 1 + 1 + 1);
	t.equal(renderNodeCount, 	1 + 2 + 3 + 4);
	t.deepEqual(state.renderedNodes.length, 4);
	t.deepEqual(state.renderedNodes.map(pluckFn('node')), state.root.map(identity));
	t.deepEqual(state.renderedNodes.map(pluckFn('node.name')), ['root', 'root-child-1', 'root-child-2', 'root-child-2-child-1']);

	// add first child to first child
	node = state.root.find(function(node) { return node.name === 'root-child-1'; });
	node.addChild(new TreeNode('root-child-1-child-1'));
	t.equal(nodeCreateCount,	1 + 1 + 1 + 1 + 1);
	t.equal(stats.refCount, 	1 + 1 + 1 + 1 + 1);
	t.equal(renderCount, 			2 + 1 + 1 + 1 + 1);
	t.equal(renderNodeCount, 	1 + 2 + 3 + 4 + 5);
	t.deepEqual(state.renderedNodes.length, 5);
	t.deepEqual(state.renderedNodes.map(pluckFn('node')), state.root.map(identity));
	t.deepEqual(state.renderedNodes.map(pluckFn('node.name')), ['root', 'root-child-1', 'root-child-1-child-1', 'root-child-2', 'root-child-2-child-1']);

	// remove children from first child
	node = state.root.find(function(node) { return node.name === 'root-child-1'; });
	node.children.splice(0);
	t.equal(nodeCreateCount,	1 + 1 + 1 + 1 + 1 + 0);
	t.equal(stats.refCount, 	1 + 1 + 1 + 1 + 1 - 1);
	t.equal(renderCount, 			2 + 1 + 1 + 1 + 1 + 1);
	t.equal(renderNodeCount, 	1 + 2 + 3 + 4 + 5 + 4);
	t.deepEqual(state.renderedNodes.length, 4);
	t.deepEqual(state.renderedNodes.map(pluckFn('node')), state.root.map(identity));
	t.deepEqual(state.renderedNodes.map(pluckFn('node.name')), ['root', 'root-child-1', 'root-child-2', 'root-child-2-child-1']);

	// remove children from first child with no children should be a no-op
	node = state.root.find(function(node) { return node.name === 'root-child-1'; });
	node.children.splice(0);
	t.equal(nodeCreateCount,	1 + 1 + 1 + 1 + 1 + 0 + 0);
	t.equal(stats.refCount, 	1 + 1 + 1 + 1 + 1 - 1 + 0);
	t.equal(renderCount, 			2 + 1 + 1 + 1 + 1 + 1 + 0);
	t.equal(renderNodeCount, 	1 + 2 + 3 + 4 + 5 + 4 + 0);
	t.deepEqual(state.renderedNodes.length, 4);
	t.deepEqual(state.renderedNodes.map(pluckFn('node')), state.root.map(identity));
	t.deepEqual(state.renderedNodes.map(pluckFn('node.name')), ['root', 'root-child-1', 'root-child-2', 'root-child-2-child-1']);

	// remove children from root
	state.root.children.splice(0);
	t.equal(nodeCreateCount,	1 + 1 + 1 + 1 + 1 + 0 + 0 + 0);
	t.equal(stats.refCount, 	1 + 1 + 1 + 1 + 1 - 1 + 0 - 3);
	t.equal(renderCount, 			2 + 1 + 1 + 1 + 1 + 1 + 0 + 1);
	t.equal(renderNodeCount, 	1 + 2 + 3 + 4 + 5 + 4 + 0 + 1);
	t.deepEqual(state.renderedNodes.length, 1);
	t.deepEqual(state.renderedNodes.map(pluckFn('node')), state.root.map(identity));
	t.deepEqual(state.renderedNodes.map(pluckFn('node.name')), ['root']);

	// teardown
	state.root = null;
	t.equal(nodeCreateCount,	1 + 1 + 1 + 1 + 1 + 0 + 0 + 0 + 0);
	t.equal(stats.refCount, 	0);
	t.equal(renderCount, 			2 + 1 + 1 + 1 + 1 + 1 + 0 + 1 + 1);
	t.equal(renderNodeCount, 	1 + 2 + 3 + 4 + 5 + 4 + 0 + 1 + 0);
	t.deepEqual(state.renderedNodes.length, 0);

	t.end();
});

test('transform tree (modifying tree incrementally)', function(t) {
	var pluckFn = TransformUtils.pluckFn;
	var identity = TransformUtils.identity;
	var testSet = TransformUtils.testSet();
	var state = testSet.state;
	var stats = testSet.stats;
	var TreeNode = testSet.TreeNode;
	var DisplayNode = testSet.DisplayNode;

	var nodeCreateCount = 0;
	var renderCount = 0;
	var renderNodeCount = 0;

	var transformNode = m.createTransformer(function(node) {
		nodeCreateCount++;
		return new DisplayNode(node);
	}, function cleanup(displayNode, node) { displayNode.destroy(); });

	// transform nodes to renderedNodes
	m.autorun(function() {
		var renderedNodes = state.root ? state.root.map(transformNode) : [];
		state.renderedNodes.replace(renderedNodes);
	});

	// render
	m.autorun(function() {
		renderCount++;
		renderNodeCount += state.renderedNodes.length;
	});

	// setup
	var node = new TreeNode('root-1');
	state.root = node;
	t.equal(nodeCreateCount,	1);
	t.equal(stats.refCount, 	1);
	t.equal(renderCount, 			2);
	t.equal(renderNodeCount, 	1);
	t.deepEqual(state.renderedNodes.length, 1);
	t.deepEqual(state.renderedNodes.map(pluckFn('node')), state.root.map(identity));
	t.deepEqual(state.renderedNodes.map(pluckFn('node.name')), ['root-1']);

	////////////////////////////////////
	// Batch Tree (Partial)
	////////////////////////////////////

	// add partial tree as a batch
	var children = [];
	children.push(new TreeNode('root-1-child-1b'));
	children[0].addChild(new TreeNode('root-1-child-1b-child-1'))
	children.push(new TreeNode('root-1-child-2b'));
	children[1].addChild(new TreeNode('root-1-child-2b-child-1'))
	state.root.addChildren(children);
	t.equal(nodeCreateCount,	1 + 4);
	t.equal(stats.refCount, 	1 + 4);
	t.equal(renderCount, 			2 + 1);
	t.equal(renderNodeCount, 	1 + 5);
	t.deepEqual(state.renderedNodes.length, 5);
	t.deepEqual(state.renderedNodes.map(pluckFn('node')), state.root.map(identity));
	t.deepEqual(state.renderedNodes.map(pluckFn('node.name')), ['root-1', 'root-1-child-1b', 'root-1-child-1b-child-1', 'root-1-child-2b', 'root-1-child-2b-child-1']);

	// remove root-1
	state.root = null;
	t.equal(nodeCreateCount,	1 + 4 + 0);
	t.equal(stats.refCount, 	1 + 4 - 5);
	t.equal(renderCount, 			2 + 1 + 1);
	t.equal(renderNodeCount, 	1 + 5 + 0);
	t.deepEqual(state.renderedNodes.length, 0);

	////////////////////////////////////
	// Batch Tree (Full)
	////////////////////////////////////

	// add full tree as a batch
	node = new TreeNode('root-2')
	node.addChild(new TreeNode('root-2-child-1'));
	node.children[0].addChild(new TreeNode('root-2-child-1-child-1'))
	node.addChild(new TreeNode('root-2-child-2'));
	node.children[1].addChild(new TreeNode('root-2-child-2-child-1'))
	state.root = node;
	t.equal(nodeCreateCount,	1 + 4 + 0 + 5);
	t.equal(stats.refCount, 	1 + 4 - 5 + 5);
	t.equal(renderCount, 			2 + 1 + 1 + 1);
	t.equal(renderNodeCount, 	1 + 5 + 0 + 5);
	t.deepEqual(state.renderedNodes.length, 5);
	t.deepEqual(state.renderedNodes.map(pluckFn('node')), state.root.map(identity));
	t.deepEqual(state.renderedNodes.map(pluckFn('node.name')), ['root-2', 'root-2-child-1', 'root-2-child-1-child-1', 'root-2-child-2', 'root-2-child-2-child-1']);

	// teardown
	state.root = null;
	t.equal(nodeCreateCount,	1 + 4 + 0 + 5 + 0);
	t.equal(stats.refCount, 	0);
	t.equal(renderCount, 			2 + 1 + 1 + 1 + 1);
	t.equal(renderNodeCount, 	1 + 5 + 0 + 5 + 0);
	t.deepEqual(state.renderedNodes.length, 0);

	t.end();
});

test('transform tree (modifying expanded)', function(t) {
	var pluckFn = TransformUtils.pluckFn;
	var identity = TransformUtils.identity;
	var testSet = TransformUtils.testSet();
	var state = testSet.state;
	var stats = testSet.stats;
	var TreeNode = testSet.TreeNode;
	var DisplayNode = testSet.DisplayNode;

	var nodeCreateCount = 0;
	var renderCount = 0;
	var renderNodeCount = 0;

	var transformNode = m.createTransformer(function(node) {
		nodeCreateCount++;
		return new DisplayNode(node);
	}, function cleanup(displayNode, node) { displayNode.destroy(); });

	// transform nodes to renderedNodes
	m.autorun(function() {
		var renderedNodes = state.root ? state.root.transform(transformNode) : [];
		state.renderedNodes.replace(renderedNodes);
	});

	// render
	m.autorun(function() {
		renderCount++;
		renderNodeCount += state.renderedNodes.length;
	});

	// patch for collapsed
	TreeNode.prototype.transform = function(iteratee, results) {
		if (this.parent && state.collapsed.has(this.parent.path())) return results || []; // not visible

		results = results || [];
		results.push(iteratee(this));
		this.children.forEach(function(child) { child.transform(iteratee, results); });
		return results;
	}

	// setup
	var node = new TreeNode('root')
	node.addChild(new TreeNode('root-child-1'));
	node.children[0].addChild(new TreeNode('root-child-1-child-1'))
	node.addChild(new TreeNode('root-child-2'));
	node.children[1].addChild(new TreeNode('root-child-2-child-1'))
	state.root = node;
	t.equal(nodeCreateCount,	5);
	t.equal(stats.refCount, 	5);
	t.equal(renderCount, 			2);
	t.equal(renderNodeCount, 	5);
	t.deepEqual(state.renderedNodes.length, 5);
	t.deepEqual(state.renderedNodes.map(pluckFn('node')), state.root.map(identity));
	t.deepEqual(state.renderedNodes.map(pluckFn('node.name')), ['root', 'root-child-1', 'root-child-1-child-1', 'root-child-2', 'root-child-2-child-1']);

	////////////////////////////////////
	// Expanded
	////////////////////////////////////

	// toggle root to collapsed
	state.renderedNodes[0].toggleCollapsed();
	t.equal(nodeCreateCount,	5 + 0);
	t.equal(stats.refCount, 	5 - 4);
	t.equal(renderCount, 			2 + 1);
	t.equal(renderNodeCount, 	5 + 1);
	t.deepEqual(state.renderedNodes.length, 1);
	t.notDeepEqual(state.renderedNodes.map(pluckFn('node')), state.root.map(identity)); // not a direct map of the tree nodes
	t.deepEqual(state.renderedNodes.map(pluckFn('node.name')), ['root']);

	// toggle root to expanded
	state.renderedNodes[0].toggleCollapsed();
	t.equal(nodeCreateCount,	5 + 0 + 4);
	t.equal(stats.refCount, 	5 - 4 + 4);
	t.equal(renderCount, 			2 + 1 + 1);
	t.equal(renderNodeCount, 	5 + 1 + 5);
	t.deepEqual(state.renderedNodes.length, 5);
	t.deepEqual(state.renderedNodes.map(pluckFn('node')), state.root.map(identity));
	t.deepEqual(state.renderedNodes.map(pluckFn('node.name')), ['root', 'root-child-1', 'root-child-1-child-1', 'root-child-2', 'root-child-2-child-1']);

	// toggle child-1 collapsed
	state.renderedNodes[1].toggleCollapsed();
	t.equal(nodeCreateCount,	5 + 0 + 4 + 0);
	t.equal(stats.refCount, 	5 - 4 + 4 - 1);
	t.equal(renderCount, 			2 + 1 + 1 + 1);
	t.equal(renderNodeCount, 	5 + 1 + 5 + 4);
	t.deepEqual(state.renderedNodes.length, 4);
	t.notDeepEqual(state.renderedNodes.map(pluckFn('node')), state.root.map(identity)); // not a direct map of the tree nodes
	t.deepEqual(state.renderedNodes.map(pluckFn('node.name')), ['root', 'root-child-1', 'root-child-2', 'root-child-2-child-1']);

	// toggle child-2-child-1 collapsed should be a no-op
	state.renderedNodes[state.renderedNodes.length-1].toggleCollapsed();
	t.equal(nodeCreateCount,	5 + 0 + 4 + 0 + 0);
	t.equal(stats.refCount, 	5 - 4 + 4 - 1 + 0);
	t.equal(renderCount, 			2 + 1 + 1 + 1 + 0);
	t.equal(renderNodeCount, 	5 + 1 + 5 + 4 + 0);
	t.deepEqual(state.renderedNodes.length, 4);
	t.notDeepEqual(state.renderedNodes.map(pluckFn('node')), state.root.map(identity)); // not a direct map of the tree nodes
	t.deepEqual(state.renderedNodes.map(pluckFn('node.name')), ['root', 'root-child-1', 'root-child-2', 'root-child-2-child-1']);

	// teardown
	state.root = null;
	t.equal(nodeCreateCount,	5 + 0 + 4 + 0 + 0 + 0);
	t.equal(stats.refCount, 	0);
	t.equal(renderCount, 			2 + 1 + 1 + 1 + 0 + 1);
	t.equal(renderNodeCount, 	5 + 1 + 5 + 4 + 0 + 0);
	t.deepEqual(state.renderedNodes.length, 0);

	t.end();
});

test('transform tree (modifying render observable)', function(t) {
	var pluckFn = TransformUtils.pluckFn;
	var identity = TransformUtils.identity;
	var testSet = TransformUtils.testSet();
	var state = testSet.state;
	var stats = testSet.stats;
	var TreeNode = testSet.TreeNode;
	var DisplayNode = testSet.DisplayNode;

	var nodeCreateCount = 0;
	var renderCount = 0;
	var renderNodeCount = 0;
	var renderIconCalc = 0;

	var transformNode = m.createTransformer(function(node) {
		nodeCreateCount++;
		return new DisplayNode(node);
	}, function cleanup(displayNode, node) { displayNode.destroy(); });

	// transform nodes to renderedNodes
	m.autorun(function() {
		var renderedNodes = state.root ? state.root.transform(transformNode) : [];
		state.renderedNodes.replace(renderedNodes);
	});

	// render
	m.autorun(function() {
		renderCount++;
		renderNodeCount += state.renderedNodes.length;
	});

	// custom transform
	TreeNode.prototype.transform = function(iteratee, results) {
		node.icon.get();  // icon dependency

		results = results || [];
		results.push(iteratee(this));
		this.children.forEach(function(child) { child.transform(iteratee, results); });
		return results;
	}

	// setup
	var node = new TreeNode('root')
	node.addChild(new TreeNode('root-child-1'));
	node.children[0].addChild(new TreeNode('root-child-1-child-1'))
	node.addChild(new TreeNode('root-child-2'));
	node.children[1].addChild(new TreeNode('root-child-2-child-1'))
	state.root = node;
	t.equal(nodeCreateCount,	5);
	t.equal(stats.refCount, 	5);
	t.equal(renderCount, 			2);
	t.equal(renderNodeCount, 	5);
	t.deepEqual(state.renderedNodes.length, 5);
	t.deepEqual(state.renderedNodes.map(pluckFn('node')), state.root.map(identity));
	t.deepEqual(state.renderedNodes.map(pluckFn('node.name')), ['root', 'root-child-1', 'root-child-1-child-1', 'root-child-2', 'root-child-2-child-1']);

	////////////////////////////////////
	// Icon
	////////////////////////////////////

	// update root icon
	state.root.icon.set('file');
	t.equal(nodeCreateCount,	5 + 0);
	t.equal(stats.refCount, 	5 + 0);
	t.equal(renderCount, 			2 + 1);
	t.equal(renderNodeCount, 	5 + 5);
	t.deepEqual(state.renderedNodes.length, 5);
	t.deepEqual(state.renderedNodes.map(pluckFn('node')), state.root.map(identity));
	t.deepEqual(state.renderedNodes.map(pluckFn('node.name')), ['root', 'root-child-1', 'root-child-1-child-1', 'root-child-2', 'root-child-2-child-1']);

	// teardown
	state.root = null;
	t.equal(nodeCreateCount,	5 + 0 + 0);
	t.equal(stats.refCount, 	0);
	t.equal(renderCount, 			2 + 1 + 1);
	t.equal(renderNodeCount, 	5 + 5 + 0);
	t.deepEqual(state.renderedNodes.length, 0);

	t.end();
});

test('transform tree (modifying render-only observable)', function(t) {
	var pluckFn = TransformUtils.pluckFn;
	var identity = TransformUtils.identity;
	var testSet = TransformUtils.testSet();
	var state = testSet.state;
	var stats = testSet.stats;
	var TreeNode = testSet.TreeNode;
	var DisplayNode = testSet.DisplayNode;

	var nodeCreateCount = 0;
	var renderCount = 0;
	var renderNodeCount = 0;
	var renderIconCalc = 0;

	var transformNode = m.createTransformer(function(node) {
		nodeCreateCount++;
		return new DisplayNode(node);
	}, function cleanup(displayNode, node) { displayNode.destroy(); });

	// transform nodes to renderedNodes
	m.autorun(function() {
		var renderedNodes = state.root ? state.root.map(transformNode) : [];
		state.renderedNodes.replace(renderedNodes);
	});

	// render
	m.autorun(function() {
		renderCount++;
		renderNodeCount += state.renderedNodes.length;

		state.renderedNodes.forEach(function(renderedNode) {
			m.autorun(function() {
				renderIconCalc++;
				renderedNode.node.icon.get();  // icon dependency
			});
		});
	});

	// setup
	var node = new TreeNode('root')
	node.addChild(new TreeNode('root-child-1'));
	node.children[0].addChild(new TreeNode('root-child-1-child-1'))
	node.addChild(new TreeNode('root-child-2'));
	node.children[1].addChild(new TreeNode('root-child-2-child-1'))
	state.root = node;
	t.equal(nodeCreateCount,	5);
	t.equal(stats.refCount, 	5);
	t.equal(renderCount, 			2);
	t.equal(renderNodeCount, 	5);
	t.equal(renderIconCalc, 	5);
	t.deepEqual(state.renderedNodes.length, 5);
	t.deepEqual(state.renderedNodes.map(pluckFn('node')), state.root.map(identity));
	t.deepEqual(state.renderedNodes.map(pluckFn('node.name')), ['root', 'root-child-1', 'root-child-1-child-1', 'root-child-2', 'root-child-2-child-1']);

	////////////////////////////////////
	// Icon
	////////////////////////////////////

	// update root icon
	state.root.icon.set('file');
	t.equal(nodeCreateCount,	5 + 0);
	t.equal(stats.refCount, 	5 + 0);
	t.equal(renderCount, 			2 + 0);
	t.equal(renderNodeCount, 	5 + 0);
	t.equal(renderIconCalc, 	5 + 1);
	t.deepEqual(state.renderedNodes.length, 5);
	t.deepEqual(state.renderedNodes.map(pluckFn('node')), state.root.map(identity));
	t.deepEqual(state.renderedNodes.map(pluckFn('node.name')), ['root', 'root-child-1', 'root-child-1-child-1', 'root-child-2', 'root-child-2-child-1']);

	// teardown
	state.root = null;
	t.equal(nodeCreateCount,	5 + 0 + 0);
	t.equal(stats.refCount, 	0);
	t.equal(renderCount, 			2 + 0 + 1);
	t.equal(renderNodeCount, 	5 + 0 + 0);
	t.equal(renderIconCalc, 	5 + 1 + 0);
	t.deepEqual(state.renderedNodes.length, 0);

	t.end();
});

test('transform tree (static tags / global filter only)', function(t) {
	var intersection = TransformUtils.intersection;
	var pluckFn = TransformUtils.pluckFn;
	var identity = TransformUtils.identity;
	var testSet = TransformUtils.testSet();
	var state = testSet.state;
	var stats = testSet.stats;
	var TreeNode = testSet.TreeNode;
	var DisplayNode = testSet.DisplayNode;

	var nodeCreateCount = 0;
	var renderCount = 0;
	var renderNodeCount = 0;

	var transformNode = m.createTransformer(function(node) {
		nodeCreateCount++;
		return new DisplayNode(node);
	}, function cleanup(displayNode, node) { displayNode.destroy(); });

	// transform nodes to renderedNodes
	m.autorun(function() {
		var renderedNodes = state.root ? state.root.transform(transformNode) : [];
		state.renderedNodes.replace(renderedNodes);
	});

	// render
	m.autorun(function() {
		renderCount++;
		renderNodeCount += state.renderedNodes.length;
	});

	// no tags
	state.tags = m.observable(m.asStructure([]));

	// custom transform
	TreeNode.prototype.transform = function(iteratee, results) {
		results = results || [];
		if (!state.tags.length || intersection(state.tags, this.tags).length) results.push(iteratee(this));
		this.children.forEach(function(child) { child.transform(iteratee, results); });
		return results;
	}

	// setup
	var node = new TreeNode('root', {tags: [1]});
	node.addChild(new TreeNode('root-child-1', {tags: [2]}));
	node.children[0].addChild(new TreeNode('root-child-1-child-1', {tags: [3]}));
	node.addChild(new TreeNode('root-child-2', {tags: [2]}));
	node.children[1].addChild(new TreeNode('root-child-2-child-1', {tags: [3]}));
	state.root = node;
	t.equal(nodeCreateCount,	5);
	t.equal(stats.refCount, 	5);
	t.equal(renderCount, 			2);
	t.equal(renderNodeCount, 	5);
	t.deepEqual(state.renderedNodes.length, 5);
	t.deepEqual(state.renderedNodes.map(pluckFn('node')), state.root.map(identity));
	t.deepEqual(state.renderedNodes.map(pluckFn('node.name')), ['root', 'root-child-1', 'root-child-1-child-1', 'root-child-2', 'root-child-2-child-1']);

	////////////////////////////////////
	// Tags
	////////////////////////////////////

	// add search tag
	state.tags.push(2);
	t.equal(nodeCreateCount,	5 + 0);
	t.equal(stats.refCount, 	5 - 3);
	t.equal(renderCount, 			2 + 1);
	t.equal(renderNodeCount, 	5 + 2);
	t.deepEqual(state.renderedNodes.length, 2);
	t.notDeepEqual(state.renderedNodes.map(pluckFn('node')), state.root.map(identity));
	t.deepEqual(state.renderedNodes.map(pluckFn('node.name')), ['root-child-1', 'root-child-2']);

	// add search tag
	state.tags.push(3);
	t.equal(nodeCreateCount,	5 + 0 + 2);
	t.equal(stats.refCount, 	5 - 3 + 2);
	t.equal(renderCount, 			2 + 1 + 1);
	t.equal(renderNodeCount, 	5 + 2 + 4);
	t.deepEqual(state.renderedNodes.length, 4);
	t.notDeepEqual(state.renderedNodes.map(pluckFn('node')), state.root.map(identity));
	t.deepEqual(state.renderedNodes.map(pluckFn('node.name')), ['root-child-1', 'root-child-1-child-1', 'root-child-2', 'root-child-2-child-1']);

	// add search tag
	state.tags.push(1);
	t.equal(nodeCreateCount,	5 + 0 + 2 + 1);
	t.equal(stats.refCount, 	5 - 3 + 2 + 1);
	t.equal(renderCount, 			2 + 1 + 1 + 1);
	t.equal(renderNodeCount, 	5 + 2 + 4 + 5);
	t.deepEqual(state.renderedNodes.length, 5);
	t.deepEqual(state.renderedNodes.map(pluckFn('node')), state.root.map(identity));
	t.deepEqual(state.renderedNodes.map(pluckFn('node.name')), ['root', 'root-child-1', 'root-child-1-child-1', 'root-child-2', 'root-child-2-child-1']);

	// remove search tags
	state.tags.splice(0, 2);
	t.equal(nodeCreateCount,	5 + 0 + 2 + 1 + 0);
	t.equal(stats.refCount, 	5 - 3 + 2 + 1 - 4);
	t.equal(renderCount, 			2 + 1 + 1 + 1 + 1);
	t.equal(renderNodeCount, 	5 + 2 + 4 + 5 + 1);
	t.deepEqual(state.renderedNodes.length, 1);
	t.notDeepEqual(state.renderedNodes.map(pluckFn('node')), state.root.map(identity));
	t.deepEqual(state.renderedNodes.map(pluckFn('node.name')), ['root']);

	// teardown
	state.root = null;
	t.equal(nodeCreateCount,	5 + 0 + 2 + 1 + 0 + 0);
	t.equal(stats.refCount, 	0);
	t.equal(renderCount, 			2 + 1 + 1 + 1 + 1 + 1);
	t.equal(renderNodeCount, 	5 + 2 + 4 + 5 + 1 + 0);
	t.deepEqual(state.renderedNodes.length, 0);

	t.end();
});

test('transform tree (dynamic tags - peek / rebuild)', function(t) {
	var intersection = TransformUtils.intersection;
	var pluckFn = TransformUtils.pluckFn;
	var identity = TransformUtils.identity;
	var testSet = TransformUtils.testSet();
	var state = testSet.state;
	var stats = testSet.stats;
	var TreeNode = testSet.TreeNode;
	var DisplayNode = testSet.DisplayNode;

	var nodeCreateCount = 0;
	var renderCount = 0;
	var renderNodeCount = 0;

	var transformNode = m.createTransformer(function(node) {
		nodeCreateCount++;
		return new DisplayNode(node);
	}, function cleanup(displayNode, node) { displayNode.destroy(); });

	// transform nodes to renderedNodes
	m.autorun(function() {
		var renderedNodes = state.root ? state.root.transform(transformNode) : [];
		state.renderedNodes.replace(renderedNodes);
	});

	// render
	m.autorun(function() {
		renderCount++;
		renderNodeCount += state.renderedNodes.length;
	});

	// no tags
	state.tags = m.observable(m.asStructure([]));

	// custom transform
	TreeNode.prototype.transform = function(iteratee, results) {
		results = results || [];
		if (!state.tags.length || intersection(state.tags, this.tags).length) results.push(iteratee(this));
		this.children.forEach(function(child) { child.transform(iteratee, results); });
		return results;
	}

	// setup
	var node = new TreeNode('root', {tags: m.observable(m.asStructure([1]))});
	node.addChild(new TreeNode('root-child-1', {tags: m.observable(m.asStructure([2]))}));
	node.children[0].addChild(new TreeNode('root-child-1-child-1', {tags: m.observable(m.asStructure([3]))}));
	node.addChild(new TreeNode('root-child-2', {tags: m.observable(m.asStructure([2]))}));
	node.children[1].addChild(new TreeNode('root-child-2-child-1', {tags: m.observable(m.asStructure([3]))}));
	state.root = node;
	t.equal(nodeCreateCount,	5);
	t.equal(stats.refCount, 	5);
	t.equal(renderCount, 			2);
	t.equal(renderNodeCount, 	5);
	t.deepEqual(state.renderedNodes.length, 5);
	t.deepEqual(state.renderedNodes.map(pluckFn('node')), state.root.map(identity));
	t.deepEqual(state.renderedNodes.map(pluckFn('node.name')), ['root', 'root-child-1', 'root-child-1-child-1', 'root-child-2', 'root-child-2-child-1']);

	////////////////////////////////////
	// Tags
	////////////////////////////////////

	// add search tag
	state.tags.push(2);
	t.equal(nodeCreateCount,	5 + 0);
	t.equal(stats.refCount, 	5 - 3);
	t.equal(renderCount, 			2 + 1);
	t.equal(renderNodeCount, 	5 + 2);
	t.deepEqual(state.renderedNodes.length, 2);
	t.notDeepEqual(state.renderedNodes.map(pluckFn('node')), state.root.map(identity));
	t.deepEqual(state.renderedNodes.map(pluckFn('node.name')), ['root-child-1', 'root-child-2']);

	// modify search tag
	state.root.tags.push(2);
	t.equal(nodeCreateCount,	5 + 0 + 1);
	t.equal(stats.refCount, 	5 - 3 + 1);
	t.equal(renderCount, 			2 + 1 + 1);
	t.equal(renderNodeCount, 	5 + 2 + 3);
	t.deepEqual(state.renderedNodes.length, 3);
	t.notDeepEqual(state.renderedNodes.map(pluckFn('node')), state.root.map(identity));
	t.deepEqual(state.renderedNodes.map(pluckFn('node.name')), ['root', 'root-child-1', 'root-child-2']);

	// perform multiple search tag operations
	m.transaction(function() {
		state.root.tags.shift(); // no-op
		state.root.find(function(node) { return node.name === 'root-child-1'; }).tags.splice(0);
		state.root.find(function(node) { return node.name === 'root-child-1-child-1'; }).tags.push(2);
		state.root.find(function(node) { return node.name === 'root-child-2-child-1'; }).tags.push(2);
	});
	t.equal(nodeCreateCount,	5 + 0 + 1 + 2);
	t.equal(stats.refCount, 	5 - 3 + 1 + 1);
	t.equal(renderCount, 			2 + 1 + 1 + 1);
	t.equal(renderNodeCount, 	5 + 2 + 3 + 4);
	t.deepEqual(state.renderedNodes.length, 4);
	t.notDeepEqual(state.renderedNodes.map(pluckFn('node')), state.root.map(identity));
	t.deepEqual(state.renderedNodes.map(pluckFn('node.name')), ['root', 'root-child-1-child-1', 'root-child-2', 'root-child-2-child-1']);

	// teardown
	state.root = null;
	t.equal(nodeCreateCount,	5 + 0 + 1 + 2 + 0);
	t.equal(stats.refCount, 	0);
	t.equal(renderCount, 			2 + 1 + 1 + 1 + 1);
	t.equal(renderNodeCount, 	5 + 2 + 3 + 4 + 0);
	t.deepEqual(state.renderedNodes.length, 0);

	t.end();
});