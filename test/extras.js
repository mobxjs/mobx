var mobservable = require('mobservable');
var m = mobservable;

exports.testGetDNode = function(test) {
    var getD = mobservable._.getDNode;

    test.throws(function() {
        getD({});
    });
    test.throws(function() {
        getD([]);
    });
    test.throws(function() {
        getD(null);
    });
    test.throws(function() {
        getD({ x: 3}, "x");
    });
    test.throws(function() {
        getD(m.makeReactive({ x: 3}));
    });
    test.throws(function() {
        getD(function() {});
    });
    test.throws(function() {
        getD(Object.assign(m.makeReactive({ x: 3}), { y:2}), "y");
    });

    test.ok(getD(m.makeReactive([])));
    test.ok(getD(m.makeReactive({x:3}), "x"));
    test.ok(getD(m.makeReactive(3)));
    test.ok(getD(m.makeReactive({x:function() { return 3 }}), "x"));
    test.ok(getD(m.makeReactive(function() {})));
    test.ok(getD(mobservable.sideEffect(function() {})));

    var a;
    a = m({x:{}});
    test.ok(getD(a,"x"));
    a = m({x:[]});
    test.ok(getD(a,"x"));
    test.ok(getD(a.x));
    a = m({x:[[]]});
    test.ok(getD(a,"x"));
    test.ok(getD(a.x));
    test.ok(getD(a.x[0]));

    var c = mobservable.reactiveComponent({ render: function() {}});
    c.componentWillMount();
    c.render();
    test.ok(getD(c));

    test.done();
}

exports.testTreeD = function(test) {
    var a = m(3);
    var aName = a.$mobservable.context.name;

    var dtree = m.extras.getDependencyTree;
    test.deepEqual(dtree(a), {
       context:null,
       name: aName,
       id: a.$mobservable.id
    });


    var b = m(function () {
        return a() * a();
    });
    var bName = b.$mobservable.context.name
    test.deepEqual(dtree(b), {
        context:null,
        name: bName,
        id: b.$mobservable.id,
        // no dependencies yet, since it isn't observed yet
    });

    var c = m.sideEffect(function() {
        return b();
    });
    var cName = c.$mobservable.context.name;
    test.deepEqual(dtree(c), {
        context: null,
        name: cName,
        id: c.$mobservable.id,
        dependencies: [{
            context: null,
            name: bName,
            id: b.$mobservable.id,
            dependencies: [{
                context: null,
                name: aName,
                id: a.$mobservable.id
            }]
        }]
    });

    test.ok(aName !== bName);
    test.ok(bName !== cName);

    test.deepEqual(m.extras.getObserverTree(a), {
        context: null,
        name: aName,
        id: a.$mobservable.id,
        observers: [{
            context: null,
            name: bName,
            id: b.$mobservable.id,
            observers: [{
                context: null,
                name: cName,
                id: c.$mobservable.id,
                listeners: 1
            }]
        }]
    });

    test.done();
}

exports.testNames = function(test) {
    function name(thing, prop) {
        return m._.getDNode(thing, prop).context.name;
    }

    function contextObj(thing, prop) {
        return m._.getDNode(thing, prop).context.object;
    }

    test.equal(name(m(3, { name: 'hoi' })), "hoi");

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

    var rstruct = m(struct);
    m.extendReactive(rstruct.y, { a:  { b : 2}});
    rstruct.ar.push({ b : 2});
    rstruct.ar.push([]);
    test.equal(name(rstruct,"x"), ".x");
    test.equal(name(rstruct, "y"), ".y");
    test.equal(name(rstruct.y,"z"), ".y.z");
    test.equal(name(rstruct, "ar"), ".ar");
    test.equal(name(rstruct.ar), ".ar");
    test.equal(name(rstruct.ar[1],"w"), ".ar[x].w");
    test.equal(name(rstruct.y.a,"b"), ".y.a.b");
    test.equal(name(rstruct.ar[2], "b"), ".ar[x].b");
    test.equal(name(rstruct.ar[3]), ".ar[x]");

    test.equal(contextObj(rstruct,"x"), rstruct);
    test.equal(contextObj(rstruct, "y"), rstruct);
    test.equal(contextObj(rstruct.y,"z"), rstruct);
    test.equal(contextObj(rstruct, "ar"), rstruct);
    test.equal(contextObj(rstruct.ar), rstruct);
    test.equal(contextObj(rstruct.ar), rstruct);
    test.equal(contextObj(rstruct.ar[1],"w"), rstruct);
    test.equal(contextObj(rstruct.y.a,"b"), rstruct);
    test.equal(contextObj(rstruct.ar[2], "b"), rstruct);
    test.equal(contextObj(rstruct.ar[3]), rstruct);

    var STUB = {};
    var rstruct2 = m(struct, { name: 'hoi', context: STUB });
    m.extendReactive(rstruct2.y, { a:  { b : 2}});
    rstruct2.ar.push({ b : 2});
    rstruct2.ar.push([]);

    test.equal(name(rstruct2,"x"), "hoi.x");
    test.equal(name(rstruct2, "y"), "hoi.y");
    test.equal(name(rstruct2.y,"z"), "hoi.y.z");
    test.equal(name(rstruct2, "ar"), "hoi.ar");
    test.equal(name(rstruct2.ar), "hoi.ar");
    test.equal(name(rstruct2.ar[1],"w"), "hoi.ar[x].w");
    test.equal(name(rstruct2.y.a,"b"), "hoi.y.a.b");
    test.equal(name(rstruct2.ar[2], "b"), "hoi.ar[x].b");
    test.equal(name(rstruct2.ar[3]), "hoi.ar[x]");

    test.equal(contextObj(rstruct2,"x"), STUB);
    test.equal(contextObj(rstruct2, "y"), STUB);
    test.equal(contextObj(rstruct2.y,"z"), STUB);
    test.equal(contextObj(rstruct2, "ar"), STUB);
    test.equal(contextObj(rstruct2.ar), STUB);
    test.equal(contextObj(rstruct2.ar), STUB);
    test.equal(contextObj(rstruct2.ar[1],"w"), STUB);
    test.equal(contextObj(rstruct2.y.a,"b"), STUB);
    test.equal(contextObj(rstruct2.ar[2], "b"), STUB);
    test.equal(contextObj(rstruct2.ar[3]), STUB);

    var d = m.sideEffect(function() {
    });
    test.ok(name(d));

    test.equal(name(m.sideEffect(function namedFunction() {
    })), "namedFunction");

    test.equal(name(m.sideEffect(function namedFunction() {
    },  { name : "overridenName" })), "overridenName");

    test.ok(name(m(function() {
    })));

    test.equal(name(m(function namedFunction() {
    })), "namedFunction");

    test.equal(name(m(function namedFunction() {
    },  { name : "overridenName" })), "overridenName");

    test.done();
}

var trackerOutput1 = function(a, b,c) {
    return [
    { id: a.$mobservable.id,
        name: a.$mobservable.context.name,
        context: undefined,
        changed: true,
        state: 'READY',
        newValue: 4 },
    { id: b.$mobservable.id,
        name: b.$mobservable.context.name,
        context: undefined,
        changed: true,
        state: 'READY',
        newValue: 8 },
    { id: c.$mobservable.id,
        name: c.$mobservable.context.name,
        context: undefined,
        changed: true,
        state: 'READY',
        newValue: null } ];
}

var trackerOutput2 = function(a, b, c) {
    return [ { id: a.$mobservable.id,
    name: a.$mobservable.context.name,
    context: undefined,
    state: 'STALE',
    changed: false,
    newValue: null },
  { id: b.$mobservable.id,
    name: b.$mobservable.context.name,
    context: undefined,
    state: 'STALE',
    changed: false,
    newValue: null },
  { id: c.$mobservable.id,
    name: c.$mobservable.context.name,
    context: undefined,
    state: 'STALE',
    changed: false,
    newValue: null },
  { id: a.$mobservable.id,
    name: a.$mobservable.context.name,
    context: undefined,
    state: 'READY',
    changed: true,
    newValue: 4 },
  { id: b.$mobservable.id,
    name: b.$mobservable.context.name,
    context: undefined,
    state: 'PENDING',
    changed: false,
    newValue: null },
  { id: b.$mobservable.id,
    name: b.$mobservable.context.name,
    context: undefined,
    state: 'READY',
    changed: true,
    newValue: 8 },
  { id: c.$mobservable.id,
    name: c.$mobservable.context.name,
    context: undefined,
    state: 'PENDING',
    changed: false,
    newValue: null },
  { id: c.$mobservable.id,
    name: c.$mobservable.context.name,
    context: undefined,
    state: 'READY',
    changed: true,
    newValue: null }
  ];
}

exports.testTransitionTracker1 = function(test) {
    var lines = [];

    var a = m(3);
    var b = m(function() { return a() * 2 });
    var c = m.sideEffect(function() { b(); });
    var stop = m.extras.trackTransitions(false, function(line) {
        lines.push(line);
    });

    a(4);
    stop();
    a(5);
    test.deepEqual(lines, trackerOutput1(a,b,c));

    test.done();
}

exports.testTransitionTracker2 = function(test) {
    var lines = [];

    var a = m(3);
    var b = m(function() { return a() * 2 });
    var c = m.sideEffect(function() { b(); });
    var stop = m.extras.trackTransitions(true, function(line) {
        lines.push(line);
    });

    a(4);
    stop();
    a(5);
    test.deepEqual(lines, trackerOutput2(a,b,c));

    test.done();
}

exports.testTransitionTracker3 = function(test) {
    var base = console.table;
    var lines = [];
    console.table = function(d) {
        debugger;
        lines.push(d);
    }

    var a = m(3);
    var b = m(function() { return a() * 2 });
    var c = m.sideEffect(function() { b(); });
    var d = m(4);

    var stop = m.extras.trackTransitions(false)


    a(4);
    d(6);
    stop();
    a(5);

    setTimeout(function() {

        test.deepEqual(lines, [trackerOutput1(a,b,c).concat([{
            id: d.$mobservable.id,
            name: d.$mobservable.context.name,
            context: d.$mobservable.context.object,
            state: "READY",
            newValue: 6,
            changed: true
        }])]);

        console.table = base;
        test.done();
    }, 100);
}

exports.testTransitionTracker4 = function(test) {
    var base = console.dir;
    var lines = [];
    console.dir = function(d) {
        lines.push(d);
    }

    var a = m(3);
    var b = m(function() { return a() * 2 });
    var c = m.sideEffect(function() { b(); });
    var stop = m.extras.trackTransitions(true);

    a(4);
    stop();
    a(5);
    setTimeout(function() {
        test.deepEqual(lines, [trackerOutput2(a,b,c)]);

        console.dir = base;
        test.done();
    }, 100);
}