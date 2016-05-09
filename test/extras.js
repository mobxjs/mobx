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
       name: aName,
       id: a.id
    });


    var bFunc =function () {
        return a.get() * a.get();
    };
    var b = m.observable(bFunc);
    var bName = 'ComputedValue@2';
    t.deepEqual(dtree(b), {
        name: bName,
        id: b.id,
        // no dependencies yet, since it isn't observed yet
    });

    var cFunc =function() {
        return b.get();
    };
    var c = m.autorun(cFunc);
    var cName = 'Autorun@3';
    t.deepEqual(dtree(c.$mobx), {
        name: cName,
        id: c.$mobx.id,
        dependencies: [{
            name: bName,
            id: b.id,
            dependencies: [{
                name: aName,
                id: a.id
            }]
        }]
    });

    t.ok(aName !== bName);
    t.ok(bName !== cName);

    t.deepEqual(m.extras.getObserverTree(a), {
        name: aName,
        id: a.id,
        observers: [{
            name: bName,
            id: b.id,
            observers: [{
                name: cName,
                id: c.$mobx.id
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
        id: 8,
        name: 'Autorun@8',
        dependencies: [{
            id: 5,
            name: 'ObservableMap@4.keys()@5'
        }, {
            id: 7,
            name: 'ObservableMap@4.temperature?@7'
        }, {
            id: 6,
            name: 'ObservableMap@4.temperature@6'
        }, {
            id: 9,
            name: 'ObservableMap@4.absent?@9'
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
    t.equal(rstruct.y.$mobx.values.z.name, "ObservableObject@1.y@4.z");
    t.equal(rstruct.$mobx.values.ar.name, "ObservableObject@1.ar");
    t.equal(rstruct.ar.$mobx.atom.name, "ObservableObject@1.ar");
    t.equal(rstruct.ar[1].$mobx.values.w.name, "ObservableObject@1.ar@7[..]@8.w");
    t.equal(rstruct.y.a.$mobx.values.b.name, "ObservableObject@1.y@4.a@11.b");
    t.equal(rstruct.ar[2].$mobx.values.b.name, "ObservableObject@1.ar@7[..]@13.b");

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
	t.equal(task.$mobx.name, "Task");
	t.equal(task.$mobx.values.title.name, "Task@20.title");

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