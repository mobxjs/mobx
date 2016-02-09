var test = require('tape');
var mobservable = require('..');
var m = mobservable;

test('treeD', function(t) {
    var a = m.observable(3);
    var aName = a.name;

    var dtree = m.extras.getDependencyTree;
    t.deepEqual(dtree(a), {
       name: aName,
       id: a.id
    });


    var bFunc =function () {
        return a.get() * a.get();
    };
    var b = m.observable(bFunc);
    var bName = b.name;
    t.deepEqual(dtree(b), {
        name: bName,
        id: b.id,
        // no dependencies yet, since it isn't observed yet
    });

    var cFunc =function() {
        return b.get();
    };
    var c = m.autorun(cFunc);
    var cName = c.$mobservable.name;
    t.deepEqual(dtree(c.$mobservable), {
        name: cName,
        id: c.$mobservable.id,
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
                id: c.$mobservable.id
            }]
        }]
    });

    t.end();
})

test('names', function(t) {
    var struct = {
        x: 3,
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
    t.equal(rstruct.$mobservable.values.x.name, ".x");
    t.equal(rstruct.$mobservable.values.y.name, ".y");
    t.equal(rstruct.y.$mobservable.values.z.name, ".y.z");
    t.equal(rstruct.$mobservable.values.ar.name, ".ar");
    t.equal(rstruct.ar.$mobservable.name, ".ar");
    t.equal(rstruct.ar[1].$mobservable.values.w.name, ".ar[x].w");
    t.equal(rstruct.y.a.$mobservable.values.b.name, ".y.a.b");
    t.equal(rstruct.ar[2].$mobservable.values.b.name, ".ar[x].b");

    var d = m.autorun(function() {
    });
    t.ok(d.$mobservable.name);

    t.equal(m.autorun(function namedFunction() {
    }).$mobservable.name, "namedFunction");

    t.ok(m.observable(function() {}));

    t.equal(m.observable(function namedFunction() {}).name, "namedFunction");

    t.end();
})

function stripTrackerOutput(output) {
    return output.map(function (i) {
        if (Array.isArray(i))
            return stripTrackerOutput(i);
        delete i.node;
        delete i.name;
        return i;
    });
}

var trackerOutput1 = function(a, b,c) {
    return [
    { id: a.id,
        changed: true,
        state: 'READY' },
    { id: b.id,
        changed: true,
        state: 'READY' },
    { id: c.$mobservable.id,
        changed: true,
        state: 'READY' } 
    ];
}

var trackerOutput2 = function(a, b, c) {
    return [ { id: a.id,
    state: 'STALE',
    changed: false,
    }, 
  { id: b.id,
    state: 'STALE',
    changed: false,
  }, 
  { id: c.$mobservable.id,
    state: 'STALE',
    changed: false,
  }, 
  { id: a.id,
    state: 'READY',
    changed: true,
  }, 
  { id: b.id,
    state: 'PENDING',
    changed: false,
  }, 
  { id: b.id,
    state: 'READY',
    changed: true,
  }, 
  { id: c.$mobservable.id,
    state: 'PENDING',
    changed: false,
  }, 
  { id: c.$mobservable.id,
    state: 'READY',
    changed: true,
  }];
}

test('transition tracker 1', function(t) {
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
    t.deepEqual(stripTrackerOutput(lines), trackerOutput1(a,b,c));

    t.end();
})

test('transition tracker 2', function(t) {
    var lines = [];

    var a = m.observable(3);
    var b = m.observable(function() { return a.get() * 2 });
    var c = m.autorun(function() { b.get(); });
    var stop = m.extras.trackTransitions(true, function(line) {
        lines.push(line);
    });

    a.set(4);
    stop();
    a.set(5);
    t.deepEqual(stripTrackerOutput(lines), trackerOutput2(a,b,c));

    t.end();
})

test('transition tracker 3', function(t) {
    var base = console.table;
    var lines = [];
    console.table = function(d) {
        lines.push(d);
    }

    var a = m.observable(3);
    var b = m.observable(function() { return a.get() * 2 });
    var c = m.autorun(function() { b.get(); });
    var d = m.observable(4);

    var stop = m.extras.trackTransitions(false)


    a.set(4);
    d.set(6);
    stop();
    a.set(5);

    setTimeout(function() {
        t.deepEqual(stripTrackerOutput(lines), [trackerOutput1(a,b,c).concat([{
            id: d.id,
            state: "READY",
            changed: true
        }])]);

        console.table = base;
        t.end();
    }, 100);
})

test('transition tracker 4', function(t) {
    var base = console.dir;
    var lines = [];
    var method = console.table ? "table" : "dir";
    console[method] = function(d) {
        lines.push(d);
    }

    var a = m.observable(3);
    var b = m.observable(function() { return a.get() * 2 });
    var c = m.autorun(function() { b.get(); });
    var stop = m.extras.trackTransitions(true);

    a.set(4);
    stop();
    a.set(5);
    setTimeout(function() {
        t.deepEqual(stripTrackerOutput(lines), [trackerOutput2(a,b,c)]);

        console[method] = base;
        t.end();
    }, 100);
})

test('strict mode checks', function(t) {
    var x = mobservable.observable(3);
    
    mobservable.extras.allowStateChanges(false, function() {
        x.get();        
    });

    mobservable.extras.allowStateChanges(true, function() {
        x.set(7);        
    });
        
    t.throws(function() {
        mobservable.extras.allowStateChanges(false, function() {
            x.set(4);        
        });
    });
    
    t.end();
});