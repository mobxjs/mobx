var mobservable = require('../mobservable.js')

var value = mobservable.value;

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
    var x = mobservable(3);
    var b = buffer();
    x.observe(b);
    test.equal(3, x());

    x(5);
    test.equal(5, x());
    test.deepEqual([5], b.toArray());
    test.done();
}

exports.basic2 = function(test) {
    var x = value(3);
    var z = value(function () { return x() * 2});
    var y = value(function () { return x() * 3});

    test.equal(z(), 6);
    test.equal(y(), 9);

    x(5);
    test.equal(z(), 10);
    test.equal(y(), 15);

    test.done();
}

exports.dynamic = function(test) {
  //  debugger;
  try {
    var x = value(3);
    var y = value(function() {
      return x();
    });
    var b = buffer();
    y.observe(b, true);

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

exports.dynamic2 = function(test) {
  try {
    var x = value(3);
    var y = value(function() {
      return x() * x();
    });

    test.equal(9, y());
    var b = buffer();
    y.observe(b);

    x(5);
    test.equal(25, y());

    //no intermediate value 15!
    test.deepEqual([25], b.toArray())
    test.done();
  }
  catch(e) {
    console.log(e.stack);
  }
}

exports.readme1 = function(test) {
  try {
    var b = buffer();

    var vat = value(0.20);
    var order = {};
    order.price = value(10);
      // Prints: New price: 24
      //in TS, just: value(() => this.price() * (1+vat()))
    order.priceWithVat = value(function() {
      return order.price() * (1+vat());
    });

    order.priceWithVat(); // TODO: should not be needed!
    order.priceWithVat.observe(b);

    order.price(20);
    order.price(10);
    test.deepEqual([24,12],b.toArray());
    test.done();
  } catch (e) {
    console.log(e.stack); throw e;
  }
}

exports.cycle1 = function(test) {
  try {
    var p = value(function() { return p() * 2 }); // thats a cycle!
    debugger;
    p();
    test.fail(true);
  }
  catch(e) {
    test.ok(("" + e).indexOf("Cycle detected") !== -1);
  }
  try {
    var a = value(function() { return b() * 2 });
    var b = value(function() { return a() * 2 });
    b();
    test.fail(true);
  }
  catch(e) {
    //  console.log(e);
    test.ok(("" + e).indexOf("Cycle detected") !== -1);
    test.done();
  }
}

exports.cycle2 = function(test) {
  var z = value(true);
  var a = value(function() { return z() ? 1 : b() * 2 });
  var b = value(function() { return a() * 2 });

  test.equals(1, a());

  test.equals(2, b());
  try {
    debugger;
    z(false); // introduces a cycle!
    z(true);
    test.fail(true, "No exception thrown, found: " + b());
    test.done();
  }
  catch(e) {
//    console.log(e);
    test.ok(("" + e).indexOf("Cycle detected") !== -1);
    test.done();
  }
}

exports.testBatchAndReady = function(test) {
    var a = value(2);
    var b = value(3);
    var c = value(function() { return a() * b() });
    var d = value(function() { return c() * b() });
    var buf = buffer();
    d.observe(buf);

    a(4);
    b(5);
    // Note, 60 should not happen! (that is d beign computed before c after update of b)
    test.deepEqual([36, 100], buf.toArray());

    mobservable.onceReady(function() {
        //this is called async, and only after everything has finished, so d should be 54
        test.deepEqual(54, d()); // only one new value for d

        test.done();
    });
    mobservable.batch(function() {
        a(2);
        b(3);
        a(6);
        test.deepEqual(100, d()); // still hunderd
    });

    test.deepEqual([36, 100, 54], buf.toArray());// only one new value for d
}

exports.testScope = function(test) {
  var vat = value(0.2);
  var Order = function() {
    this.price = value(20, this);
    this.amount = value(2, this);
    this.total = value(function() {
      return (1+vat()) * this.price() * this.amount();
    }, this);
  };

  var order = new Order();
  order.price(10).amount(3);
  test.equals(36, order.total());
  test.done();
}

exports.testDefineProperty = function(test) {
  var vat = value(0.2);
  var Order = function() {
    mobservable.defineProperty(this, 'price', 20);
    mobservable.defineProperty(this, 'amount', 2);
    mobservable.defineProperty(this, 'total', function() {
      return (1+vat()) * this.price * this.amount; // price and amount are now properties!
    });
  };

  var order = new Order();
  order.price = 10;
  order.amount = 3;
  test.equals(36, order.total);
  test.done();
}

exports.testWatch = function(test) {
  var a = value(3);
  var b = value(2);
  var changed = 0;
  var calcs = 0;
  var res = mobservable.watch(function() {
    calcs += 1;
    return a() * b();
  }, function() {
    changed += 1;
  });

  test.equals(2, res.length);
  test.equals(6, res[0]);
  test.equals(changed, 0);
  test.equals(calcs, 1);

  b(4);
  test.equals(changed, 1);
  test.equals(calcs, 1); // no more calcs!
  test.done();
}

exports.testWatchDisposed = function(test) {
  var a = value(3);
  var b = value(2);
  var changed = 0;
  var calcs = 0;
  var res = mobservable.watch(function() {
    calcs += 1;
    return a() * b();
  }, function() {
    changed += 1;
  });

  test.equals(2, res.length);
  test.equals(6, res[0]);
  test.equals(changed, 0);
  test.equals(calcs, 1);

  res[1](); //cleanup
  b(4);
  test.equals(changed, 0);
  test.equals(calcs, 1);
  test.done();
}

exports.testChangeCountOptimization = function(test) {
    var bCalcs = 0;
    var cCalcs = 0;
    var a = value(3);
    var b = value(function() {
        bCalcs += 1;
        return 4 + a() - a();
    });
    var c = value(function() {
        cCalcs += 1;
        return b();
    });

    test.equals(b(), 4);
    test.equals(c(), 4);
    test.equals(bCalcs, 1);
    test.equals(cCalcs, 1);

    a(5);

    test.equals(b(), 4);
    test.equals(c(), 4);
    test.equals(bCalcs, 2);
    test.equals(cCalcs, 1);

    test.done();
}

exports.testObservablesRemoved = function(test) {
    var calcs = 0;
    var a = value(1);
    var b = value(2);
    var c = value(function() {
      calcs ++;
      if (a() === 1)
        return b() * a() * b();
      return 3;
    });

    test.equals(calcs, 0);
    test.equals(c(), 4);
    test.equals(calcs, 1);
    a(2);
    test.equals(c(), 3);
    test.equals(calcs, 2);

    b(3); // should not retrigger calc
    test.equals(c(), 3);
    test.equals(calcs, 2);

    a(1);
    test.equals(c(), 9);
    test.equals(calcs, 3);

    test.done();
}