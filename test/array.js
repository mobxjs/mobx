var mobservable = require('../mobservable.js')

var property = mobservable.property;
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
    debugger;
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

    var sum = property(function() {
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

  debugger;
  t([1,4,6,7,8], [1,2,3,4,5,6], [7,8], [2,3,5]);
  t([1,2,3,4], [4,3,2,1], [1,2,3], [3,2,1]); // suboptimal, but correct

  test.done();
}