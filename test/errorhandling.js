var testBase = require('tape');
var mobservable = require('..');
var m = mobservable;

var observable = mobservable.observable;
var voidObserver = function(){};

function test(name, func) {
    testBase(name, function(t) {
        try {
            func(t);    
        } finally {
            mobservable._.resetGlobalState();
        }
    });
}

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

test('exception1', function(t) {
    var a = observable(function() {
        throw "hoi";
    });
    t.throws(() => a(), "hoi");
    t.end();
})

test('deny state changes in views', function(t) {
    var x = observable(3);
    var z = observable(5);
    var y = observable(function() {
        z(6);
        return x() * x();
    });

    
    t.throws(() => {
        y()
    }, 'It is not allowed to change the state during the computation of a reactive view');

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

    t.equal(mobservable.extras.isComputingDerivation(), false);
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
        t.equal(mobservable.extras.isComputingDerivation(), false);

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

    t.equal(mobservable.extras.isComputingDerivation(), false);
    t.end();
})

test('throw error if modification loop', function(t) {
    var x = observable(3);
    var dis = m.autorun(function() {
        x(x() + 1); // is allowed to throw, but doesn't as the observables aren't bound yet during first execution
    });
    t.throws(() => {
        x(5);
    }, "Reaction doesn't converge to a stable state")
    t.end();
})

test('cycle1', function(t) {
    t.throws(() => {
        var p = observable(function() { return p() * 2; }); // thats a cycle!
        p.observe(voidObserver, true);
    }, "Found cyclic dependency");
    t.end();
})

test('cycle2', function(t) {
    var a = observable(function() { return b() * 2; });
    var b = observable(function() { return a() * 2; });
    t.throws(() => {
        b()
    }, "Found cyclic dependency");
    t.end();
})

test('cycle3', function(t) {
    var p = observable(function() { return p() * 2; });
    t.throws(() => {
        p();
    }, "Found cyclic dependency");
    t.end();
})

test('cycle3', function(t) {
    var z = observable(true);
    var a = observable(function() { return z() ? 1 : b() * 2; });
    var b = observable(function() { return a() * 2; });

    b.observe(voidObserver);
    t.equal(1, a());

    t.throws(() => {
        z(false); // introduces a cycle!
    }, "Found cyclic dependency");
    t.end();
});

test('issue 86, converging cycles', function(t) {
    function findIndex(arr, predicate) {
        for (var i = 0, l = arr.length; i < l; i++)
            if (predicate(arr[i]) === true)
                return i;
        return -1;
    }
    
    const deleteThisId = mobservable.observable(1);
    const state = mobservable.observable({ someArray: [] });
    var calcs = 0;

    state.someArray.push({ id: 1, text: 'I am 1' });
    state.someArray.push({ id: 2, text: 'I am 2' });
    
    // should delete item 1 in first run, which works fine
    mobservable.autorun(() => {
        calcs++;
        const i = findIndex(state.someArray, item => item.id === deleteThisId());
        state.someArray.remove(state.someArray[i]);
    });
    
    t.equal(state.someArray.length, 1); // should be 1, which prints fine
    t.equal(calcs, 1);
    deleteThisId(2); // should delete item 2, but it errors on cycle
    
    t.equal(console.log(state.someArray.length, 0)); // should be 0, which never prints
    t.equal(calcs, 3);
    
    t.end(); 
});

test('slow converging cycle', function(t) {
    var x = mobservable.observable(1);
    var res = -1;
    mobservable.autorun(() => {
        if (x() === 100)
            res = x();
        else
            x(x() + 1);
    });
    
    // ideally the outcome should be 100 / 100.
    // autorun is only an observer of x *after* the first run, hence the initial outcome is not as expected..
    // is there a practical use case where such a pattern would be expected?
    // maybe we need to immediately register observers on the observable? but that would be slow....
    // or detect cycles and re-run the autorun in that case once?
    t.equal(x(), 2)
    t.equal(res, -1);
    
    x(7);
    t.equal(x(), 100)
    t.equal(res, 100);
    
    t.end();
});