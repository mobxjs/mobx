var test = require('tape');
var mobx = require('..');
var observable = mobx.observable;

function buffer() {
    var b = [];
    var res = function(newValue) {
        b.push(newValue);
    };
    res.toArray = function() {
        return b;
    }
    return res;
}

test('test1', function(t) {
    var a = observable([]);
    t.equal(a.length, 0);
    t.deepEqual(Object.keys(a), []);
    t.deepEqual(a.slice(), []);

    a.push(1);
    t.equal(a.length, 1);
    t.deepEqual(a.slice(), [1]);

    a[1] = 2;
    t.equal(a.length, 2);
    t.deepEqual(a.slice(), [1,2]);

    var sum = observable(function() {
        return -1 + a.reduce(function(a,b) {
            return a + b;
        }, 1);
    });

    t.equal(sum.get(), 3);

    a[1] = 3;
    t.equal(a.length, 2);
    t.deepEqual(a.slice(), [1,3]);
    t.equal(sum.get(), 4);

    a.splice(1,1,4,5);
    t.equal(a.length, 3);
    t.deepEqual(a.slice(), [1,4,5]);
    t.equal(sum.get(), 10);

    a.replace([2,4]);
    t.equal(sum.get(), 6);

    a.splice(1,1);
    t.equal(sum.get(), 2);
    t.deepEqual(a.slice(), [2])

    a.splice(0,0,4,3);
    t.equal(sum.get(), 9);
    t.deepEqual(a.slice(), [4,3,2]);

    a.clear();
    t.equal(sum.get(), 0);
    t.deepEqual(a.slice(), []);

    a.length = 4;
    t.equal(isNaN(sum.get()), true);
    t.deepEqual(a.length, 4);

    t.deepEqual(a.slice(), [undefined, undefined, undefined, undefined]);

    a.replace([1,2, 2,4]);
    t.equal(sum.get(), 9);
    a.length = 4;
    t.equal(sum.get(), 9);


    a.length = 2;
    t.equal(sum.get(), 3);
    t.deepEqual(a.slice(), [1,2]);

    t.deepEqual(a.reverse(), [2,1]);
    t.deepEqual(a.slice(), [1,2]);

    a.unshift(3);
    t.deepEqual(a.sort(), [1,2,3]);
    t.deepEqual(a.slice(), [3,1,2]);

	t.equal(JSON.stringify(a), "[3,1,2]");

//	t.deepEqual(Object.keys(a), ['0', '1', '2']); // ideally....
	t.deepEqual(Object.keys(a), []);

    t.end();
})

test('find and remove', function(t) {
    var a = mobx.observable([10,20,20]);
    var idx = -1;
    function predicate(item, index) {
        if (item === 20) {
            idx = index;
            return true;
        }
        return false;
    }

    t.equal(a.find(predicate), 20);
    t.equal(idx, 1);
    t.equal(a.find(predicate, null, 1), 20);
    t.equal(idx, 1);
    t.equal(a.find(predicate, null, 2), 20);
    t.equal(idx, 2);
    idx = -1;
    t.equal(a.find(predicate, null, 3), undefined);
    t.equal(idx, -1);

    t.equal(a.remove(20), true);
    t.equal(a.find(predicate), 20);
    t.equal(idx, 1);
    idx = -1;
    t.equal(a.remove(20), true);
    t.equal(a.find(predicate), undefined);
    t.equal(idx, -1);

    t.equal(a.remove(20), false);

    t.end();
})

test('quickDiff', function(t) {
    function check(current, base, added, removed) {
        var res = mobx._.quickDiff(current, base);
        t.deepEqual(res[0], added);
        t.deepEqual(res[1], removed);
    }

    check([],[],[],[]);
    check([1],[],[1],[]);
    check([],[1],[],[1]);
    check([1],[2],[1],[2]);

    check([1,2,3],[1,3],[2],[]);
    check([1,2,3],[1,2],[3],[]);

    check([1,2],[0,1,2],[],[0]);

    check([1,4,6,7,8], [1,2,3,4,5,6], [7,8], [2,3,5]);
    check([1,2,3,4], [4,3,2,1], [1,2,3], [3,2,1]); // suboptimal, but correct

    t.end();
})

test('observe', function(t) {
    var ar = mobx.observable([1,4]);
    var buf = [];
    var disposer = ar.observe(function(changes) {
        buf.push(changes);
    }, true);

    ar[1] = 3; // 1,3
    ar[2] = 0; // 1, 3, 0
    ar.shift(); // 3, 0
    ar.push(1,2); // 3, 0, 1, 2
    ar.splice(1,2,3,4); // 3, 3, 4, 2
    t.deepEqual(ar.slice(), [3,3,4,2]);
    ar.splice(6);
    ar.splice(6,2);
    ar.replace(['a']);
    ar.pop();
    ar.pop(); // does not fire anything

    // check the object param
    buf.forEach(function(change) {
        t.equal(change.object, ar);
        delete change.object;
    });

    var result = [
        { type: "splice", index: 0, addedCount: 2, removed: [], added: [1, 4], removedCount: 0 },
        { type: "update", index: 1, oldValue: 4, newValue: 3 },
        { type: "splice", index: 2, addedCount: 1, removed: [], added: [0], removedCount: 0 },
        { type: "splice", index: 0, addedCount: 0, removed: [1], added: [], removedCount: 1 },
        { type: "splice", index: 2, addedCount: 2, removed: [], added: [1,2], removedCount: 0 },
        { type: "splice", index: 1, addedCount: 2, removed: [0,1], added: [3, 4], removedCount: 2 },
        { type: "splice", index: 0, addedCount: 1, removed: [3,3,4,2], added:['a'], removedCount: 4 },
        { type: "splice", index: 0, addedCount: 0, removed: ['a'], added: [], removedCount: 1 },
    ]

    t.deepEqual(buf, result);

    disposer();
    ar[0] = 5;
    t.deepEqual(buf, result);

    t.end();
})

test('array modification1', function(t) {
    var a = mobx.observable([1,2,3]);
    var r = a.splice(-10, 5, 4,5,6);
    t.deepEqual(a.slice(), [4,5,6]);
    t.deepEqual(r, [1,2,3]);
    t.end();
})

test('serialize', function(t) {
    var a = [1,2,3];
    var m = mobx.observable(a);

    t.deepEqual(JSON.stringify(m), JSON.stringify(a));
    t.deepEqual(a, m.peek());

    a = [4];
    m.replace(a);
    t.deepEqual(JSON.stringify(m), JSON.stringify(a));
    t.deepEqual(a, m.toJSON());

    t.end();
})

test('array modification functions', function(t) {
    var ars = [[], [1,2,3]];
    var funcs = ["push","pop","shift","unshift"];
    funcs.forEach(function(f) {
        ars.forEach(function (ar) {
            var a = ar.slice();
            var b = mobx.observable(a);
            var res1 = a[f](4);
            var res2 = b[f](4);
            t.deepEqual(res1, res2);
            t.deepEqual(a, b.slice());
        });
    });
    t.end();
})

test('array modifications', function(t) {

    var a2 = mobx.fastArray([]);
    var inputs = [undefined, -10, -4, -3, -1, 0, 1, 3, 4, 10];
    var arrays = [[], [1], [1,2,3,4], [1,2,3,4,5,6,7,8,9,10,11],[1,undefined],[undefined]]
    for (var i = 0; i < inputs.length; i++)
    for (var j = 0; j< inputs.length; j++)
    for (var k = 0; k < arrays.length; k++)
    for (var l = 0; l < arrays.length; l++) {
        var msg = ["array mod: [", arrays[k].toString(),"] i: ",inputs[i]," d: ", inputs[j]," [", arrays[l].toString(),"]"].join(' ');
        var a1 = arrays[k].slice();
        a2.replace(a1);
        var res1 = a1.splice.apply(a1, [inputs[i], inputs[j]].concat(arrays[l]));
        var res2 = a2.splice.apply(a2, [inputs[i], inputs[j]].concat(arrays[l]));
        t.deepEqual(a1.slice(), a2.slice(), "values wrong: " + msg);
        t.deepEqual(res1, res2, "results wrong: " + msg);
        t.equal(a1.length, a2.length, "length wrong: " + msg);
    }

    t.end();
})

test('new fast array values won\'t be observable', function(t) {
   // See: https://mobxjs.github.io/mobx/refguide/fast-array.html#comment-2486090381
    var booksA = mobx.fastArray([]);
    var rowling = { name: 'J.K.Rowling', birth: 1965 };
    booksA.push(rowling)
    t.equal(mobx.isObservable(booksA[0], "name"), false);
    var removed = booksA.splice(0, 1);
    t.equal(mobx.isObservable(removed[0], "name"), false);
    t.end();
});

test('is array', function(t) {
    var x = mobx.observable([]);
    t.equal(x instanceof Array, true);

    // would be cool if these two would return true...
    t.equal(typeof x === "array", false);
    t.equal(Array.isArray(x), false);
    t.end();
})

test('peek', function(t) {
    var x = mobx.observable([1, 2, 3]);
    t.deepEqual(x.peek(), [1, 2, 3]);
    t.equal(x.$mobx.values, x.peek());

    x.peek().push(4); //noooo!
    t.throws(function() {
        x.push(5); // detect alien change
    }, "modification exception");
    t.end();
})

test('react to sort changes', function(t) {
    var x = mobx.observable([4, 2, 3]);
    var sortedX = mobx.observable(function() {
        return x.sort();
    });
    var sorted;

    mobx.autorun(function() {
        sorted = sortedX.get();
    });

    t.deepEqual(x.slice(), [4,2,3]);
    t.deepEqual(sorted, [2,3,4]);
    x.push(1);
    t.deepEqual(x.slice(), [4,2,3,1]);
    t.deepEqual(sorted, [1,2,3,4]);
    x.shift();
    t.deepEqual(x.slice(), [2,3,1]);
    t.deepEqual(sorted, [1,2,3]);
    t.end();
})

test('autoextend buffer length', function(t) {
	var ar = observable(new Array(1000));
	var changesCount = 0;
	ar.observe(changes => ++changesCount);

	ar[ar.length] = 0;
	ar.push(0);

	t.equal(changesCount, 2);

	t.end();
})
