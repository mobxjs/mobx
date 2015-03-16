require('typescript-require')
var model = require('../tsmodel.ts')

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

exports.basic = function(test) {
    var x = model.property(3);
    var b = buffer();
    x.onChange(b);
    test.equal(3, x());

    x(5);
    test.equal(5, x());
    test.deepEqual([5], b.toArray());
    test.done();
}

exports.dynamic = function(test) {
  //  debugger;
  try {
    var x = model.property(3);
    var y = model.property(function() {
      return x();
    });
    var b = buffer();
    y.onChange(b);

    test.equal(3, y()); // First evaluation here..

    x(5);
    test.equal(5, y());

    test.deepEqual([3, 5], b.toArray())
    test.done();
  }
  catch(e) {
    console.log(e.stack);
  }
}
