var mobservable = require('mobservable');

var makeReactive = mobservable.makeReactive;
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
        test.equal(e.message === exception || e.cause === exception, true);
    }
    test.equal(mobservable._.stackDepth(), 0);
}

exports.testException1  = function(test) {
    var a = makeReactive(function() {
        throw "hoi";
    });
    testException(test, a, "hoi");
    test.equal(mobservable._.stackDepth(), 0);
    test.done();
};

exports.testException2 = function(test) {
    var cbuffer = buffer();
    var z = makeReactive(true);
    var a = makeReactive(function() {
        if (z())
        return 1;
        throw "Some error!";
    });
    var b = makeReactive(function() {
        return a();
    });
    var c = makeReactive(function() {
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
    test.equal(mobservable._.stackDepth(), 0);

    test.done();
};

exports.cycle1 = function(test) {
    try {
        var p = makeReactive(function() { return p() * 2; }); // thats a cycle!
        p.observe(voidObserver, true);
        test.fail("expected exception");
    }
    catch(e) {
        test.ok(("" + e).indexOf("Cycle detected") !== -1);
        test.equal(mobservable._.stackDepth(), 0);
    }

    var a = makeReactive(function() { return b() * 2; });
    var b = makeReactive(function() { return a() * 2; });
    testException(test, b, "Cycle detected");
    test.done();
};

exports.cycle2 = function(test) {
    var p = makeReactive(function() { return p() * 2; });
    testException(test, p, "Cycle detected");
    test.done();
};

exports.cycle3 = function(test) {
    var z = makeReactive(true);
    var a = makeReactive(function() { return z() ? 1 : b() * 2; });
    var b = makeReactive(function() { return a() * 2; });

    b.observe(voidObserver);
    test.equals(1, a());

    z(false); // introduces a cycle!
    testException(test, b, "Cycle detected");
    testException(test, a, "Cycle detected");

    z(true); // cycle is gone, restore stable state
    test.equals(1, a());
    test.equals(2, b());

    test.equal(mobservable._.stackDepth(), 0);
    test.done();
};
