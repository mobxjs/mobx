var testBase = require('tape');
var mobx = require('..');
var m = mobx;

var observable = mobx.observable;
var computed = mobx.computed;

var voidObserver = function(){};

function test(name, func) {
    testBase(name, function(t) {
        try {
            func(t);
        } finally {
            mobx._.resetGlobalState();
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
    var a = computed(function() {
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
        if (x.get() !== 3)
            z.set(x.get());
    });

    t.equal(x.get(), 3);
    t.equal(z.get(), 3);

    x.set(5); // autorunneres are allowed to change state

    t.equal(x.get(), 5);
    t.equal(z.get(), 5);

    t.equal(mobx.extras.isComputingDerivation(), false);
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

        t.throws(function() {
            t.equal(9, y());
        }, 'It is not allowed to change the state during the computation of a reactive derivation');

        t.deepEqual(z.slice(), []);
        t.equal(mobx.extras.isComputingDerivation(), false);

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
        if (x.get() > 4)
            z.push(x.get());
    });

    x.set(5);
    x.set(6);
    t.deepEqual(z.slice(), [5, 6])
    x.set(2);
    t.deepEqual(z.slice(), [5, 6])

    t.equal(mobx.extras.isComputingDerivation(), false);
    t.end();
})

test('throw error if modification loop', function(t) {
    var x = observable(3);
    var dis = m.autorun(function() {
        x.set(x.get() + 1); // is allowed to throw, but doesn't as the observables aren't bound yet during first execution
    });
    t.throws(() => {
        x.set(5);
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
    var a = observable(function() { return b.get() * 2; });
    var b = observable(function() { return a.get() * 2; });
    t.throws(() => {
        b.get()
    }, "Found cyclic dependency");
    t.end();
})

test('cycle3', function(t) {
    var p = observable(function() { return p.get() * 2; });
    t.throws(() => {
        p.get();
    }, "Found cyclic dependency");
    t.end();
})

test('cycle3', function(t) {
    var z = observable(true);
    var a = observable(function() { return z.get() ? 1 : b.get() * 2; });
    var b = observable(function() { return a.get() * 2; });

    m.observe(b, voidObserver);
    t.equal(1, a.get());

    t.throws(() => {
        z.set(false); // introduces a cycle!
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

    const deleteThisId = mobx.observable(1);
    const state = mobx.observable({ someArray: [] });
    var calcs = 0;

    state.someArray.push({ id: 1, text: 'I am 1' });
    state.someArray.push({ id: 2, text: 'I am 2' });

    // should delete item 1 in first run, which works fine
    mobx.autorun(() => {
        calcs++;
        const i = findIndex(state.someArray, item => item.id === deleteThisId.get());
        state.someArray.remove(state.someArray[i]);
    });

    t.equal(state.someArray.length, 1); // should be 1, which prints fine
    t.equal(calcs, 1);
    deleteThisId.set(2); // should delete item 2, but it errors on cycle

    t.equal(console.log(state.someArray.length, 0)); // should be 0, which never prints
    t.equal(calcs, 3);

    t.end();
});

test('slow converging cycle', function(t) {
    var x = mobx.observable(1);
    var res = -1;
    mobx.autorun(() => {
        if (x.get() === 100)
            res = x.get();
        else
            x.set(x.get() + 1);
    });

    // ideally the outcome should be 100 / 100.
    // autorun is only an observer of x *after* the first run, hence the initial outcome is not as expected..
    // is there a practical use case where such a pattern would be expected?
    // maybe we need to immediately register observers on the observable? but that would be slow....
    // or detect cycles and re-run the autorun in that case once?
    t.equal(x.get(), 2)
    t.equal(res, -1);

    x.set(7);
    t.equal(x.get(), 100)
    t.equal(res, 100);

    t.end();
});

test('error handling assistence ', function(t) {
    var base = console.error;
    var errors = []; // logged errors
    var values = []; // produced errors
    var thrown = []; // list of actually thrown exceptons

    console.error = function(msg) {
        base.apply(console, arguments);
        errors.push(msg);
    }

    var a = observable(3);
    var b = computed(function() {
        if (a.get() === 42)
            throw 'should not be 42';
        return a.get() * 2;
    });

    var c = m.autorun(function() {
        values.push(b.get());
    });

    a.set(2);
    try{
        a.set(42);
    } catch (e) {
        thrown.push(e);
    }
    a.set(7);

    // Test recovery
    setTimeout(function() {
        a.set(4);
        try {
            a.set(42);
        } catch (e) {
            thrown.push(e);
        }

        t.deepEqual(values, [6, 4, 14, 8]);
        t.equal(errors.length, 2);
        t.equal(thrown.length, 2);

        console.error = base;
        t.end();
    }, 10);
})
