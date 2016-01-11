var m = require('../../');
var test = require('tape');

function gc() {
    if (typeof global.gc === "function")
        global.gc();
}

/**
 * This file compares creating a project tree view using a reactive graph transformation 
 * against the same in a plain js implementation (the baseline).
 * Surely the plain version could be optimized further,
 * but even in this comparison the plain version is already significantly more complex than the reactive version,
 * yet twice as slow.
 */

function measure(title, func) {
	var start = Date.now();
	var res = func();
	console.log("[%sms] %s", Date.now() - start, title);
	return res;
}

function flatten() {
	var res = [];
	for(var i = 0, l = arguments.length; i < l; i++)
		for(var j = 0, l2 = arguments[i].length; j < l2; j++)
			res.push(arguments[i][j]);
	return res;
}

test('non-reactive folder tree', function(t) {
	gc();
	function Folder(parent, name) {
		this.parent = parent;
		this.name = "" + name;
		this.children = [];
	}
	
	function DisplayFolder(folder, state) {
		this.state = state;
		this.folder = folder;
		this.collapsed = false;
		this._children = folder.children.map(transformFolder);
	}
	
	Object.defineProperties(DisplayFolder.prototype, {
		name: { get: function() {
			return this.folder.name;
		} },
		isVisible: { get: function() {
			return !this.state.filter || this.name.indexOf(this.state.filter) !== -1 || this.children.some(child => child.isVisible);
		} },
		children: { get: function() {
			if (this.collapsed)
				return [];
			return this._children.filter(function(child) {
				return child.isVisible;
			});
		} },
		path: { get: function() {
			return this.folder.parent === null ? this.name : transformFolder(this.folder.parent).path + "/" + this.name;
		} }
	});
	
	var state = {
		root: new Folder(null, "root"),
		filter: null,
		displayRoot: null
	};
	
	var transformFolder = function (folder) {
		return new DisplayFolder(folder, state);
	};
	
	// returns list of strings per folder
	DisplayFolder.prototype.rebuild = function () {
		var path = this.path;
		this.asText = path + "\n" +
			this.children.filter(function(child) {
				return child.isVisible;
			}).map(child => child.asText).join('');
	};
	
	DisplayFolder.prototype.rebuildAll = function() {
		this.children.forEach(child => child.rebuildAll());
		this.rebuild();
	}
	
	function createFolders(parent, recursion) {
		if (recursion === 0)
			return;
		for (var i = 0; i < 10; i++) {
			var folder = new Folder(parent, i);
			parent.children.push(folder);
			createFolders(folder, recursion - 1);
		}
	}
	
	measure("reactive folder tree [total]\n", () => {
		measure("create folders", () => createFolders(state.root, 3)); // 10^3
		measure("create displayfolders", () => state.displayRoot = transformFolder(state.root));
		measure("create text", () => {
			state.displayRoot.rebuildAll();
			state.text = state.displayRoot.asText.split("\n");
			t.equal(state.text.length, 1112);
			t.equal(state.text[0], "root");
			t.equal(state.text[state.text.length - 2], "root/9/9/9");
		});
		
		measure("collapse folder", () => {
			state.displayRoot.children[9].collapsed = true;
			state.displayRoot.children[9].rebuild();
			state.displayRoot.rebuild();
			state.text = state.displayRoot.asText.split("\n");
			t.equal(state.text.length, 1002);
			t.equal(state.text[state.text.length - 3], "root/8/9/9");
			t.equal(state.text[state.text.length - 2], "root/9");
		});
		
		measure("uncollapse folder", () => {
			state.displayRoot.children[9].collapsed = false;
			state.displayRoot.children[9].rebuild();
			state.displayRoot.rebuild();
			state.text = state.displayRoot.asText.split("\n");
			t.equal(state.text.length, 1112);
			t.equal(state.text[state.text.length - 2], "root/9/9/9");
		});
		
		measure("change name of folder", () => {
			state.root.name = "wow";
			state.displayRoot.rebuildAll();
			state.text = state.displayRoot.asText.split("\n");
			t.equal(state.text.length, 1112);
			t.equal(state.text[state.text.length - 2], "wow/9/9/9");
		});
		
		measure("search", () => {
			state.filter = "8";
			state.displayRoot.rebuildAll();
			state.text = state.displayRoot.asText.split("\n");
			t.deepEqual(state.text.slice(0, 4), [ 'wow', 'wow/0', 'wow/0/0', 'wow/0/0/8' ]);
			t.deepEqual(state.text.slice(-5), [ 'wow/9/8', 'wow/9/8/8', 'wow/9/9', 'wow/9/9/8', '' ]);
			t.equal(state.text.length, 212);
		});
		
		measure("unsearch", () => {
			state.filter = null;
			state.displayRoot.rebuildAll();
			state.text = state.displayRoot.asText.split("\n");
			t.equal(state.text.length, 1112);
		});
	});
	
	t.end(); 
});

test('reactive folder tree', function(t) {
	gc();
	function Folder(parent, name) {
		this.parent = parent;
		m.extendObservable(this, {
			name: "" + name,
			children: m.fastArray(),
		});
	}
	
	function DisplayFolder(folder, state) {
		this.state = state;
		this.folder = folder;
		m.extendObservable(this, {
			collapsed: false,
			name: function() {
				return this.folder.name;
			},
			isVisible: function() {
				return !this.state.filter || this.name.indexOf(this.state.filter) !== -1 || this.children.some(child => child.isVisible);
			},
			children: function() {
				if (this.collapsed)
					return [];
				return this.folder.children.map(transformFolder).filter(function(child) {
					return child.isVisible;
				})
			},
			path: function() {
				return this.folder.parent === null ? this.name : transformFolder(this.folder.parent).path + "/" + this.name;
			}
		});
	}
	
	var state = m.observable({
		root: new Folder(null, "root"),
		filter: null,
		displayRoot: null
	});
	
	var transformFolder = m.createTransformer(function (folder) {
		return new DisplayFolder(folder, state);
	});
	
	// returns list of strings per folder
	var stringTransformer = m.createTransformer(function (displayFolder) {
		var path = displayFolder.path;
		return path + "\n" +
			displayFolder.children.filter(function(child) {
				return child.isVisible;
			}).map(stringTransformer).join('');
	});
	
	function createFolders(parent, recursion) {
		if (recursion === 0)
			return;
		for (var i = 0; i < 10; i++) {
			var folder = new Folder(parent, i);
			parent.children.push(folder);
			createFolders(folder, recursion - 1);
		}
	}
	
	measure("reactive folder tree [total]\n", () => {
		measure("create folders", () => createFolders(state.root, 3)); // 10^3
		measure("create displayfolders", () => state.displayRoot = transformFolder(state.root));
		measure("create text", () => {
			m.autorun(function() {
				state.text = stringTransformer(state.displayRoot).split("\n");
			});
			t.equal(state.text.length, 1112);
			t.equal(state.text[0], "root");
			t.equal(state.text[state.text.length - 2], "root/9/9/9");
		});
		
		measure("collapse folder", () => {
			state.displayRoot.children[9].collapsed = true;
			t.equal(state.text.length, 1002);
			t.equal(state.text[state.text.length - 3], "root/8/9/9");
			t.equal(state.text[state.text.length - 2], "root/9");
		});
		
		measure("uncollapse folder", () => {
			state.displayRoot.children[9].collapsed = false;
			t.equal(state.text.length, 1112);
			t.equal(state.text[state.text.length - 2], "root/9/9/9");
		});
		
		measure("change name of folder", () => {
			state.root.name = "wow";
			t.equal(state.text.length, 1112);
			t.equal(state.text[state.text.length - 2], "wow/9/9/9");
		});
		
		measure("search", () => {
			state.filter = "8";
			t.deepEqual(state.text.slice(0, 4), [ 'wow', 'wow/0', 'wow/0/0', 'wow/0/0/8' ]);
			t.deepEqual(state.text.slice(-5), [ 'wow/9/8', 'wow/9/8/8', 'wow/9/9', 'wow/9/9/8', '' ]);
			t.equal(state.text.length, 212);
		});
		
		measure("unsearch", () => {
			state.filter = null;
			t.equal(state.text.length, 1112);
		});
	});
	
	t.end(); 
});

var BOX_COUNT = 10000;
var BOX_MUTATIONS = 100;

test('non-reactive state serialization', function(t) {
	gc();
	serializationTester(t, x => x);
});

test('reactive state serialization', function(t) {
	gc();
	serializationTester(t, m.createTransformer);
});

function serializationTester(t, transformerFactory) {	
	function Box(x, y) {
		m.extendObservable(this, {
			x: x,
			y: y
		});
	}
	
	var boxes = m.fastArray();
	var states = [];
	
	var serializeBox = transformerFactory(box => {
		return { x: box.x, y: box.y };
	});
	
	var serializeBoxes = transformerFactory(boxes => {
		// NB. would be a lot faster if partitioning or liveMap would be applied..!
		return boxes.map(serializeBox);
	})
	
	measure("total", () => {
		measure("create boxes", () => {
			for(var i = 0; i < BOX_COUNT; i++)
				boxes.push(new Box(i, i));
		});
		
		m.autorun(() => {
			states.push(serializeBoxes(boxes));
		});
		
		measure("mutations", () => {
			for(var i = 0; i < BOX_MUTATIONS; i++)
				boxes[boxes.length -1 - BOX_MUTATIONS][i % 2 === 0 ? "x" : "y"] = i * 3;
		});
		
		t.equal(boxes.length, BOX_COUNT);
		t.equal(states.length, BOX_MUTATIONS + 1);
		t.equal(states[states.length -1].length, BOX_COUNT);	
	});	
	
	t.end();
}