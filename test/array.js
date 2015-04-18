var mobservable = require('../mobservable.js')

var value = mobservable.value;
var array = mobservable.array;


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

exports.test1 = function(test) {
  try {
    var a
    var a = array();
    test.equals(a.length, 0);
    test.deepEqual(Object.keys(a), []);
    test.deepEqual(a.values(), []);

    a.push(1);
    test.equals(a.length, 1);
    test.deepEqual(Object.keys(a), ["0"]);
    test.deepEqual(a.values(), [1]);

    a[1] = 2;
    test.equals(a.length, 2);
    test.deepEqual(Object.keys(a), ["0", "1"]);
    test.deepEqual(a.values(), [1,2]);

    var sum = value(function() {
      return a.reduce(function(a,b) {
        return a + b;
      }, 0);
    });

    test.equals(sum(), 3);

    a[1] = 3;
    test.equals(a.length, 2);
    test.deepEqual(Object.keys(a), ["0", "1"]);
    test.deepEqual(a.values(), [1,3]);
    test.equals(sum(), 4);

    a.splice(1,1,4,5);
    test.equals(a.length, 3);
    test.deepEqual(Object.keys(a), ["0", "1", "2"]);
    test.deepEqual(a.values(), [1,4,5]);
    test.equals(sum(), 10);

    a.replace([2,4]);
    test.equals(sum(), 6);

    a.splice(1,1);
    test.equals(sum(), 2);
    test.deepEqual(a.values(), [2])

    a.spliceWithArray(0,0,[4,3]);
    test.equals(sum(), 9);
    test.deepEqual(a.values(), [4,3,2])

    a.clear();
    test.equals(sum(), 0);
    test.deepEqual(a.values(), []);

    a.length = 4;
    test.equals(isNaN(sum()), true);
    test.deepEqual(a.length, 4);

    test.deepEqual(a.values(), [undefined, undefined, undefined, undefined]);

    a.replace([1,2, 2,4]);
    test.equals(sum(), 9);
    a.length = 4;
    test.equals(sum(), 9);


    a.length = 2;
    test.equals(sum(), 3);
    test.deepEqual(a.values(), [1,2]);

    test.done();
  }
  catch(e) {
    console.error(e);
    throw e;
  }
};

exports.testQuickDiff = function(test) {
  function t(current, base, added, removed) {
    var res = mobservable.quickDiff(current, base);
    test.deepEqual(res[0], added);
    test.deepEqual(res[1], removed);
  }

  t([],[],[],[]);
  t([1],[],[1],[]);
  t([],[1],[],[1]);
  t([1],[2],[1],[2]);

  t([1,2,3],[1,3],[2],[]);
  t([1,2,3],[1,2],[3],[]);

  t([1,2],[0,1,2],[],[0]);

  t([1,4,6,7,8], [1,2,3,4,5,6], [7,8], [2,3,5]);
  t([1,2,3,4], [4,3,2,1], [1,2,3], [3,2,1]); // suboptimal, but correct

  test.done();
};

exports.testObserve = function(test) {
    var ar = mobservable.array([1,4]);
    var buf = [];
    var disposer = ar.observe(function(changes) {
        buf.push(changes);
    }, true);

    ar[1] = 3; // 1,3
    ar[2] = 0; // 1, 3, 0
    ar.shift(); // 3, 0
    ar.push(1,2); // 3, 0, 1, 2
    ar.splice(1,2,3,4); // 3, 3, 4, 2
    test.deepEqual(ar.values(), [3,3,4,2]);
    ar.replace(['a']);
    ar.pop();
    ar.pop(); // does not fire anything

    // check the object param
    buf.forEach(function(change) {
        test.equal(change.object, ar);
        delete change.object;
    });

    var result = [
        { type: "splice", index: 0, addedCount: 2, removed: [] },
        { type: "update", index: 1, oldValue: 4 },
        { type: "splice", index: 2, addedCount: 1, removed: [] },
        { type: "splice", index: 0, addedCount: 0, removed: [1] },
        { type: "splice", index: 2, addedCount: 2, removed: [] },
        { type: "splice", index: 1, addedCount: 2, removed: [0,1] },
        { type: "splice", index: 0, addedCount: 1, removed: [3,3,4,2] },
        { type: "splice", index: 0, addedCount: 0, removed: ['a'] },
    ]

    test.deepEqual(buf, result);

    disposer();
    ar[0] = 5;
    test.deepEqual(buf, result);

    test.done();
};
