var test = require('tape');
var mobx = require('..');
var m = mobx;

test('treeD', function(t) {
    m._.resetGlobalState();
    global.__mobxGlobal.mobxGuid = 0;
    var a = m.observable(3);
    var aName = 'ObservableValue@1';

    var dtree = m.extras.getDependencyTree;
    t.deepEqual(dtree(a), {
       name: aName
    });


    var b = m.observable(() => a.get() * a.get());
    var bName = 'ComputedValue@2';
    t.deepEqual(dtree(b), {
        name: bName
        // no dependencies yet, since it isn't observed yet
    });

    var c = m.autorun(() => b.get());
    var cName = 'Autorun@3';
    t.deepEqual(dtree(c.$mobx), {
        name: cName,
        dependencies: [{
            name: bName,
            dependencies: [{
                name: aName,
            }]
        }]
    });

    t.ok(aName !== bName);
    t.ok(bName !== cName);

    t.deepEqual(m.extras.getObserverTree(a), {
        name: aName,
        observers: [{
            name: bName,
            observers: [{
                name: cName,
            }]
        }]
    });

    var x = mobx.map({ temperature: 0 });
    var d = mobx.autorun(function() {
        x.keys();
        if (x.has('temperature'))
            x.get('temperature');
        x.has('absent');
    });

    t.deepEqual(m.extras.getDependencyTree(d.$mobx), {
        name: 'Autorun@5',
        dependencies: [{
            name: 'ObservableMap@4.keys()'
        }, {
            name: 'ObservableMap@4.temperature?'
        }, {
            name: 'ObservableMap@4.temperature'
        }, {
            name: 'ObservableMap@4.absent?'
        }]
    });

    t.end();
})

test('names', function(t) {
    m._.resetGlobalState();
    global.__mobxGlobal.mobxGuid = 0;

    var struct = {
        x: 'ObservableValue@1',
        y: {
            z: 7
        },
        ar : [
            4,
            {
                w: 5
            }
        ]
    };

    var rstruct = m.observable(struct);
    m.extendObservable(rstruct.y, { a:  { b : 2}});
    rstruct.ar.push({ b : 2});
    rstruct.ar.push([]);
    t.equal(rstruct.$mobx.values.x.name, "ObservableObject@1.x");
    t.equal(rstruct.$mobx.values.y.name, "ObservableObject@1.y");
    t.equal(rstruct.y.$mobx.values.z.name, "ObservableObject@1.y.z");
    t.equal(rstruct.$mobx.values.ar.name, "ObservableObject@1.ar");
    t.equal(rstruct.ar.$mobx.atom.name, "ObservableObject@1.ar");
    t.equal(rstruct.ar[1].$mobx.values.w.name, "ObservableObject@1.ar[..].w");
    t.equal(rstruct.y.a.$mobx.values.b.name, "ObservableObject@1.y.a.b");
    t.equal(rstruct.ar[2].$mobx.values.b.name, "ObservableObject@1.ar[..].b");

    var d = m.autorun(function() {
    });
    t.ok(d.$mobx.name);

    t.equal(m.autorun(function namedFunction() {
    }).$mobx.name, "namedFunction");

    t.ok(m.observable(function() {}));

    t.equal(m.observable(function namedFunction() {}).name, "namedFunction");

	function Task() {
		m.extendObservable(this, {
			title: "test"
		});
	}
	
	var task = new Task();
	t.equal(task.$mobx.name, "Task@4");
	t.equal(task.$mobx.values.title.name, "Task@4.title");

    t.end();
})

function stripTrackerOutput(output) {
    return output.map(function (i) {
        if (Array.isArray(i))
            return stripTrackerOutput(i);
        delete i.object;
		delete i.time;
		delete i.fn;
        return i;
    });
}


test('transition tracker 1', function(t) {
    m._.resetGlobalState();
    var lines = [];

    var a = m.observable(3);
    var b = m.observable(function() { return a.get() * 2 });
    var c = m.autorun(function() { b.get(); });
    var stop = m.extras.trackTransitions(false, function(line) {
        lines.push(line);
    });

    a.set(4);
    stop();
    a.set(5);
    t.deepEqual(stripTrackerOutput(lines), [ 
		{ newValue: 4, oldValue: 3, spyReportStart: true, type: 'update' },
		{ target: undefined, type: 'compute' },
		{ spyReportStart: true, type: 'reaction' },
		{ spyReportEnd: true },
		{ spyReportEnd: true } 
	]);

    t.end();
})

test('transition tracker 2', function(t) {
    m._.resetGlobalState();
    var lines = [];

    var a = m.observable(3);
    var b = m.observable(function() { return a.get() * 2 });
    var c = m.autorun(function() { b.get(); });
    var stop = m.spy(function(line) {
        lines.push(line);
    });

    a.set(4);
    stop();
    a.set(5);
    t.deepEqual(stripTrackerOutput(lines), [
		{ newValue: 4, oldValue: 3, spyReportStart: true, type: 'update' },
		{ target: undefined, type: 'compute' },
		{ spyReportStart: true, type: 'reaction' },
		{ spyReportEnd: true },
		{ spyReportEnd: true }
	]);

    t.end();
})

test('strict mode checks', function(t) {
    var x = mobx.observable(3);

    mobx.extras.allowStateChanges(false, function() {
        x.get();
    });

    mobx.extras.allowStateChanges(true, function() {
        x.set(7);
    });

    t.throws(function() {
        mobx.extras.allowStateChanges(false, function() {
            x.set(4);
        });
    });

	mobx.extras.resetGlobalState();
    t.end();
});

test('get atom', function(t) {
	mobx.extras.resetGlobalState();
	global.__mobxGlobal.mobxGuid = 0; // hmm dangerous reset?

	function Clazz () {
		mobx.extendObservable(this, {
			a: 17
		});
	}

	var a = mobx.observable(3);
	var b = mobx.observable({ a: 3 });
	var c = mobx.map({ a: 3});
	var d = mobx.observable([1, 2]);
	var e = mobx.computed(() => 3);
	var f = mobx.autorun(() => c.has('b'));
	var g = new Clazz();
	
	function atom(thing, prop) {
		return mobx.extras.getAtom(thing, prop).constructor.name;
	}

	var ovClassName = mobx.observable(3).constructor.name;
	var atomClassName = mobx.Atom.name;
	var reactionClassName = mobx.Reaction.name;

	t.equal(atom(a), ovClassName);
	
	t.equal(atom(b, "a"), ovClassName);
	t.throws(() => atom(b), /please specify a property/, "expected throw");
	t.throws(() => atom(b, "b"), /no observable property 'b' found on the observable object 'ObservableObject@2'/, "expected throw");
	
	t.equal(atom(c), atomClassName); // returns ke, "bla".constructor, === "Atomys
	t.equal(atom(c, "a"), ovClassName); // returns ent, "bla".constructor, === "Atomry
	t.equal(atom(c, "b"), ovClassName); // returns has entry (see autoru, "bla", "Atomn)
	t.throws(() => atom(c, "c"), /the entry 'c' does not exist in the observable map 'ObservableMap@3'/, "expected throw");

	t.equal(atom(d), atomClassName);
	t.throws(() => atom(d, 0), /It is not possible to get index atoms from arrays/, "expected throw");

	t.equal(atom(e), mobx.computed(() => {}).constructor.name);
	t.equal(atom(f), mobx.Reaction.name);

	t.throws(() => atom(g), /please specify a property/);
	t.equal(atom(g, "a"), ovClassName);
	
	f();
	t.end();
});

test('get debug name', function(t) {
	mobx.extras.resetGlobalState();
	global.__mobxGlobal.mobxGuid = 0; // hmm dangerous reset?

	function Clazz () {
		mobx.extendObservable(this, {
			a: 17
		});
	}

	var a = mobx.observable(3);
	var b = mobx.observable({ a: 3 });
	var c = mobx.map({ a: 3});
	var d = mobx.observable([1, 2]);
	var e = mobx.computed(() => 3);
	var f = mobx.autorun(() => c.has('b'));
	var g = new Clazz();
	
	function name(thing, prop) {
		return mobx.extras.getDebugName(thing, prop);
	}

	t.equal(name(a), "ObservableValue@1");
	
	t.equal(name(b, "a"), "ObservableObject@2.a"); // TODO: remove @3..! (also in the other tests)
	t.throws(() => name(b, "b"), /no observable property 'b' found on the observable object 'ObservableObject@2'/, "expected throw");
	
	t.equal(name(c), "ObservableMap@3"); // returns ke, "bla"ys
	t.equal(name(c, "a"), "ObservableMap@3.a"); // returns ent, "bla"ry
	t.equal(name(c, "b"), "ObservableMap@3.b?"); // returns has entry (see autoru, "bla"n)
	t.throws(() => name(c, "c"), /the entry 'c' does not exist in the observable map 'ObservableMap@3'/, "expected throw");

	t.equal(name(d), "ObservableArray@4");
	t.throws(() => name(d, 0), /It is not possible to get index atoms from arrays/, "expected throw");

	t.equal(name(e), "ComputedValue@5");
	t.equal(name(f), "Autorun@6");

	t.equal(name(g), "Clazz@7");
	t.equal(name(g, "a"), "Clazz@7.a");
	
	f();
	t.end();
});

test('get administration', function(t) {
	mobx.extras.resetGlobalState();
	global.__mobxGlobal.mobxGuid = 0; // hmm dangerous reset?

	function Clazz () {
		mobx.extendObservable(this, {
			a: 17
		});
	}

	var a = mobx.observable(3);
	var b = mobx.observable({ a: 3 });
	var c = mobx.map({ a: 3});
	var d = mobx.observable([1, 2]);
	var e = mobx.computed(() => 3);
	var f = mobx.autorun(() => c.has('b'));
	var g = new Clazz();
	
	function adm(thing, prop) {
		return mobx._.getAdministration(thing, prop).constructor.name;
	}

	var ovClassName = mobx.observable(3).constructor.name;

	t.equal(adm(a), ovClassName);
	
	t.equal(adm(b, "a"), ovClassName);
	t.equal(adm(b), b.$mobx.constructor.name);
	t.throws(() => adm(b, "b"), /no observable property 'b' found on the observable object 'ObservableObject@2'/, "expected throw");
	
	t.equal(adm(c), mobx.ObservableMap.name);
	t.equal(adm(c, "a"), ovClassName);
	t.equal(adm(c, "b"), ovClassName);
	t.throws(() => adm(c, "c"), /the entry 'c' does not exist in the observable map 'ObservableMap@3'/, "expected throw");

	t.equal(adm(d), d.$mobx.constructor.name);
	t.throws(() => adm(d, 0), /It is not possible to get index atoms from arrays/, "expected throw");

	t.equal(adm(e), mobx.computed(() => {}).constructor.name);
	t.equal(adm(f), mobx.Reaction.name);

	t.equal(adm(g), b.$mobx.constructor.name);
	t.equal(adm(g, "a"), ovClassName);
	
	f();
	t.end();
});