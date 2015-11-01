var test = require('tape');
var mobservable = require('..');
var m = mobservable;

var observable = mobservable.observable;
var voidObserver = function(){};

function buffer() {
    var b = [];
    var res = function(newValue) {
        b.push(newValue);
    };
    res.toArray = function() {
        return b;
    };
    return res;
}

function testException(t, observable, exception) {
    try {
        var value = observable();
        t.fail("Expected exception: " + exception + ", got: " + value);
    }
    catch (e) {
        var message = "" + e;
        t.equal(message === exception || e.cause === exception || message.indexOf(exception) !== -1, true, "Expected exception '" + exception + "', got: " + e);
    }
    t.equal(mobservable._.isComputingView(), false);
}

test('exception1', function(t) {
    var a = observable(function() {
        throw "hoi";
    });
    testException(t, a, "hoi");
    t.equal(mobservable._.isComputingView(), false);
    t.end();
})

test('exception2', function(t) {
    var cbuffer = buffer();
    var z = observable(true);
    var x = observable(1);
    var a = observable(function() {
        if (z())
            return x();
        throw "Some error!";
    });
    var b = observable(function() {
        return a();
    });
    var c = observable(function() {
        return a();
    });
    c.observe(cbuffer, true);

    t.equal(a(), 1);
    t.throws(function() {
        z(false);
    });

    t.equal(z(), false);
    t.equal(a(), 1);
    t.equal(b(), 1);

    x(2);
    z(true);
    t.equal(a(), 2);
    t.equal(b(), 2);
    t.equal(cbuffer.toArray().length, 2);
    t.deepEqual(cbuffer.toArray(), [1,2]);
    t.equal(mobservable._.isComputingView(), false);

    t.end();
})

test('deny state changes in views', function(t) {
    try {
        var x = observable(3);
        var z = observable(5);
        var y = observable(function() {
            z(6);
            return x() * x();
        });

        try {
            t.equal(9, y());
            t.fail("no exception");
        } catch(e) {
            t.ok(("" + e).indexOf('It is not allowed to change the state during the computation of a reactive view') > 0, "Invalid exception: " + e);
        }
    
        // y is broken now...
        t.equal(y(), undefined); 

        t.equal(mobservable._.isComputingView(), false);
        t.end();
    }
    catch(e) {
        console.log(e.stack);
    }
})

test('allow state changes in non strict views', function(t) {
    var x = observable(3);
    var z = observable(5);
    var y = observable(function() {
        m.extras.withStrict(false, function() { 
            z(6);
        });
        return x() * x();
    });

    t.equal(9, y());
    t.equal(z(), 6);

    t.equal(mobservable._.isComputingView(), false);
    t.end();
})

test('allow state changes in autorun', function(t) {
    var x = observable(3);
    var z = observable(3);
    
    m.autorun(function() {
        if (x() !== 3)
            z(x());
    });
    
    t.equal(x(), 3);
    t.equal(z(), 3);

    x(5); // autorunneres are allowed to change state

    t.equal(x(), 5);
    t.equal(z(), 5);

    t.equal(mobservable._.isComputingView(), false);
    t.end();
})

test('deny state changes in autorun if strict', function(t) {
    var x = observable(3);
    var z = observable(3);
    
    m.autorun(function() {
        m.extras.withStrict(true, function() {
            if (x() !== 3)
                z(x());
        });
    });
    
    t.equal(x(), 3);
    t.equal(z(), 3);

    try {
        x(5);
        t.fail("no exception");
    } catch(e) {
        t.ok(("" + e).indexOf('It is not allowed to change the state during the computation of a reactive view') > 0, "Invalid exception: " + e);
    }

    t.equal(x(), 5);
    t.equal(z(), 3);

    t.equal(mobservable._.isComputingView(), false);
    t.end();
})

test('deny array change in view', function(t) {
    try {
        var x = observable(3);
        var z = observable([]);
        var y = observable(function() {
            z.push(3);
            return x() * x();
        });

        try {
            t.equal(9, y());
            t.fail("no exception");
        } catch(e) {
            t.ok(("" + e).indexOf('It is not allowed to change the state during the computation of a reactive view') > 0, "Invalid exception: " + e);
        }
        
        t.deepEqual(z.slice(), []);
        t.equal(mobservable._.isComputingView(), false);

        t.end();
    }
    catch(e) {
        console.log(e.stack);
    }
})

test('allow array change in autorun', function(t) {
    var x = observable(3);
    var z = observable([]);
    var y = m.autorun(function() {
        if (x() > 4)
            z.push(x());
    });
    
    x(5);
    x(6);
    t.deepEqual(z.slice(), [5, 6])
    x(2);
    t.deepEqual(z.slice(), [5, 6])

    t.equal(mobservable._.isComputingView(), false);

    t.end();
})

test('throw error if modification loop', function(t) {
    var x = observable(3);
    try {
        var dis = m.autorun(function() {
            x(x() + 1);
        });
        x(5);
        t.equal(false, true, "expected exception");
    } catch(e) {
        t.ok((""+e).indexOf("Cycle detected") !== -1, "[mobservable] loop detected while updating a value");
    }
    t.end();
})

test('cycle1', function(t) {
    try {
        var p = observable(function() { return p() * 2; }); // thats a cycle!
        p.observe(voidObserver, true);
        t.fail("expected exception");
    }
    catch(e) {
        t.ok(("" + e).indexOf("Cycle detected") !== -1);
        t.equal(mobservable._.isComputingView(), false);
    }

    var a = observable(function() { return b() * 2; });
    var b = observable(function() { return a() * 2; });
    testException(t, b, "Cycle detected");
    t.end();
})

test('cycle2', function(t) {
    var p = observable(function() { return p() * 2; });
    testException(t, p, "Cycle detected");
    t.end();
})

test('cycle3', function(t) {
    var z = observable(true);
    var a = observable(function() { return z() ? 1 : b() * 2; });
    var b = observable(function() { return a() * 2; });

    b.observe(voidObserver);
    t.equal(1, a());

    try {
        z(false); // introduces a cycle!
        t.fail("expected exception");
    } catch(e) {
        t.ok(("" + e).indexOf("Cycle detected") > -1);
    }
    t.equal(b(), 2);
    testException(t, a, "Cycle detected");

    z(true); // cycle is gone, restore stable state
    t.equal(1, a());
    t.equal(2, b());

    t.equal(mobservable._.isComputingView(), false);
    t.end();
})
