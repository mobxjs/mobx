require('typescript-require')
var mobservable = require('../mobservable.ts')

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