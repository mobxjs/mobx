var mobservable = require('mobservable');
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

function testException(test, observable, exception) {
    try {
        var value = observable();
        test.fail("Expected exception: " + exception + ", got: " + value);
    }
    catch (e) {
        test.equal(e.message === exception || e.cause === exception || e.message.indexOf(exception) !== -1, true, "Expected exception '" + exception + "', got: " + e);
    }
    test.equal(mobservable._.isComputingView(), false);
}

exports.testException1  = function(test) {
    var a = observable(function() {
        throw "hoi";
    });
    testException(test, a, "hoi");
    test.equal(mobservable._.isComputingView(), false);
    test.done();
};

exports.testException2 = function(test) {
    var cbuffer = buffer();
    var z = observable(true);
    var a = observable(function() {
        if (z())
        return 1;
        throw "Some error!";
    });
    var b = observable(function() {
        return a();
    });
    var c = observable(function() {
        return a();
    });
    c.observe(cbuffer);

    test.equal(a(), 1);
    z(false);

    testException(test, b, "Some error!");
    testException(test, a, "Some error!");

    z(true);
    test.equal(a(), 1);
    test.equal(b(), 1);
    test.equal(cbuffer.toArray().length, 2);
    test.equal(cbuffer.toArray()[0].cause, "Some error!");
    test.equal(cbuffer.toArray()[1], 1);
    test.equal(mobservable._.isComputingView(), false);

    test.done();
};

exports.deny_state_changes = function(test) {
    try {
        var x = observable(3);
        var z = observable(5);
        var y = observable(function() {
            z(6);
            return x() * x();
        });

        test.throws(function() {
            test.equal(9, y());
        }, null, mobservable._.NON_PURE_VIEW_ERROR);
    
        var b = buffer();
        y.observe(b, false);
    
        test.throws(function() {
            y.observe(b, true);
        }, null, mobservable._.NON_PURE_VIEW_ERROR);
        
        test.deepEqual([], b.toArray());
        test.equal(mobservable._.isComputingView(), false);

        // these should not throw:
        var z = observable({ 
            a: null,
            b: function() {
                throw "oeps";
                return this.a + "hio";
            } 
        });
        
        mobservable.observe(function() {
            console.log("test");
             if (z.a > 42 || z.b === 17) // nonsense
                 console.log('hi');  
        });
        
        z.a = 2;
        
        setImmediate(function() {
            z.a = 3;
            if (typeof process !== "undefined") {
                process.nextTick(function() {
                    z.a = 4;
                    test.done(); 
                });
            } else { 
                test.done();
            }
        });
    }
    catch(e) {
        console.log(e.stack);
    }
}

exports.deny_array_change = function(test) {
    try {
        var x = observable(3);
        var z = observable([]);
        var y = observable(function() {
            z.push(3);
            return x() * x();
        });

        test.throws(function() {
            test.equal(9, y());
        }, null, "alters state");
    
        var b = buffer();
        y.observe(b, false);
    
        test.throws(function() {
            y.observe(b, true);
        }, null, "alters state");
        
        test.deepEqual([], b.toArray());
        test.equal(mobservable._.isComputingView(), false);

        test.done();
    }
    catch(e) {
        console.log(e.stack);
    }
};

exports.enable_change_state_if_non_strict_mode = function(test) {
    try {
        m.strict = false;
        var x = observable(3);
        var y = observable(1);
        var dis = m.observe(function() {
            y();
            x(4);
        });
        test.equal(x(), 4);
        dis();
        test.done();
    } finally {
        m.strict = true;
    }
};

/*
// currently, this test logs the cycle error but doesn't actually throw,
// which will change as soon as esceptions are thrown instead of stored
// TODO: 
exports.throw_error_if_modification_loop = function(test) {
    try {
        m.strict = false;
        var x = observable(3);
        try {
            var dis = m.observe(function() {
                x(x() + 1);
            });
            x(5);
            test.equal(false, true, "expected exception");
        } catch(e) {
            test.ok((""+e).indexOf("Cycle detected") !== -1, "[mobservable] loop detected while updating a value");
        }
        test.done();
    } finally {
        m.strict = true;
    }
};
*/

exports.cycle1 = function(test) {
    try {
        var p = observable(function() { return p() * 2; }); // thats a cycle!
        p.observe(voidObserver, true);
        test.fail("expected exception");
    }
    catch(e) {
        test.ok(("" + e).indexOf("Cycle detected") !== -1);
        test.equal(mobservable._.isComputingView(), false);
    }

    var a = observable(function() { return b() * 2; });
    var b = observable(function() { return a() * 2; });
    testException(test, b, "Cycle detected");
    test.done();
};

exports.cycle2 = function(test) {
    var p = observable(function() { return p() * 2; });
    testException(test, p, "Cycle detected");
    test.done();
};

exports.cycle3 = function(test) {
    var z = observable(true);
    var a = observable(function() { return z() ? 1 : b() * 2; });
    var b = observable(function() { return a() * 2; });

    b.observe(voidObserver);
    test.equals(1, a());

    z(false); // introduces a cycle!
    testException(test, b, "Cycle detected");
    testException(test, a, "Cycle detected");

    z(true); // cycle is gone, restore stable state
    test.equals(1, a());
    test.equals(2, b());

    test.equal(mobservable._.isComputingView(), false);
    test.done();
};
