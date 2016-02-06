var test = require('tape');
var mobservable = require('..');
var m = mobservable;

test('getDNode', function(t) {
    var getD = mobservable.extras.getDNode;

    t.throws(function() {
        getD({});
    });
    t.throws(function() {
        getD([]);
    });
    t.throws(function() {
        getD(null);
    });
    t.throws(function() {
        getD({ x: 3}, "x");
    });
    t.throws(function() {
        getD(m.observable({ x: 3}));
    });
    t.throws(function() {
        getD(function() {});
    });
    t.throws(function() {
        getD(Object.assign(m.observable({ x: 3}), { y:2}), "y");
    });
    t.throws(function() {
        getD(m.map());
    });
    t.throws(function() {
        getD(m.map({}), "a");
    });

    t.ok(getD(m.observable([])));
    t.ok(getD(m.observable({x:3}), "x"));
    t.ok(getD(m.observable(3)));
    t.ok(getD(m.observable({x:function() { return 3 }}), "x"));
    t.ok(getD(m.observable(function() {})));
    t.ok(getD(mobservable.autorun(function() {})));
    t.ok(getD(m.map({a: 1}), "a"));

    var a;
    a = m.observable({x:{}});
    t.ok(getD(a,"x"));
    a = m.observable({x:[]});
    t.ok(getD(a,"x"));
    t.ok(getD(a.x));
    a = m.observable({x:[[]]});
    t.ok(getD(a,"x"));
    t.ok(getD(a.x));
    t.ok(getD(a.x[0]));

    t.end();
})

test('treeD', function(t) {
    var a = m.observable(3);
    var aName = a.atom.name;

    var dtree = m.extras.getDependencyTree;
    t.deepEqual(dtree(a), {
       name: aName,
       id: a.atom.id
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
    t.deepEqual(dtree(c), {
        name: cName,
        id: c.$mobservable.id,
        dependencies: [{
            name: bName,
            id: b.id,
            dependencies: [{
                name: aName,
                id: a.atom.id
            }]
        }]
    });

    t.ok(aName !== bName);
    t.ok(bName !== cName);

    t.deepEqual(m.extras.getObserverTree(a), {
        name: aName,
        id: a.atom.id,
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
    function name(thing, prop) {
        return m.extras.getDNode(thing, prop).name;
    }

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
    t.equal(name(rstruct,"x"), ".x");
    t.equal(name(rstruct, "y"), ".y");
    t.equal(name(rstruct.y,"z"), ".y.z");
    t.equal(name(rstruct, "ar"), ".ar");
    t.equal(name(rstruct.ar), ".ar");
    t.equal(name(rstruct.ar[1],"w"), ".ar[x].w");
    t.equal(name(rstruct.y.a,"b"), ".y.a.b");
    t.equal(name(rstruct.ar[2], "b"), ".ar[x].b");
    t.equal(name(rstruct.ar[3]), ".ar[x]");

    var d = m.autorun(function() {
    });
    t.ok(name(d));

    t.equal(name(m.autorun(function namedFunction() {
    })), "namedFunction");

    t.ok(name(m.observable(function() {
    })));

    t.equal(name(m.observable(function namedFunction() {
    })), "namedFunction");

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
    { id: a.atom.id,
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
    return [ { id: a.atom.id,
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
  { id: a.atom.id,
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
            id: d.atom.id,
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