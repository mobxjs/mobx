var mobservable = require('mobservable');
var m = mobservable;

var value = mobservable.value;
var voidObserver = function(){};

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


exports.testIsReactive = function(test) {
    function Order(price) {

    }

    function ReactiveOrder(price) {
        m.extendReactive(this, {
            price: price
        });
    }
    test.equal(m.isReactive(null), false);
    test.equal(m.isReactive(null), false);

    test.equal(m.isReactive(m([])), true);
    test.equal(m.isReactive(m({})), true);
    test.equal(m.isReactive(m(function() {})), true);

    test.equal(m.isReactive([]), false);
    test.equal(m.isReactive({}), false);
    test.equal(m.isReactive(function() {}), false);

    test.equal(m.isReactive(new Order()), false);
    test.equal(m.isReactive(m(new Order())), true);

    test.equal(m.isReactive(new ReactiveOrder), true);
    test.equal(m.isReactive(m(3)), true);

    var obj = {};
    test.equal(m.isReactive(obj), false);

    test.equal(m.isReactive(m(function(){})), true);
    test.equal(m.isReactive(m.sideEffect(function(){})), true);

    test.done();

}

exports.testIsComponentReactive = function(test) {
    var component = mobservable.reactiveComponent({ render: function() {}});
    test.equal(m.isReactive(component), false); // dependencies not known yet
    component.componentWillMount();
    component.render();
    test.ok(m.isReactive(component), true);

    test.done();
}

exports.makeReactive1 = function(test) {
    test.throws(function() {
        m(function(a,b) {});
    });

    // recursive structure
    var x = m({
        a: {
            b: {
                c: 3
            }
        }
    });
    var b = buffer();
    m.sideEffect(function() {
        b(x.a.b.c)
    });
    x.a = { b : { c : 4 }};
    x.a.b.c = 5; // new structure was reactive as well
    test.deepEqual(b.toArray(), [3, 4, 5]);

    // recursive structure, but asReference passed in
    test.equal(m.isReactive(x.a.b), true);
    var x2 = m({
        a: m.asReference({
            b: {
                c: 3
            }
        })
    });

    test.equal(m.isReactive(x2), true);
    test.equal(m.isReactive(x2.a), false);
    test.equal(m.isReactive(x2.a.b), false);

    var b2 = buffer();
    m.sideEffect(function() {
        b2(x2.a.b.c)
    });
    x2.a = { b : { c : 4 }};
    x2.a.b.c = 5; // not picked up, not reactive, since passed as reference
    test.deepEqual(b2.toArray(), [3, 4]);

    // non recursive structure
    var x3 = m({
        a: {
            b: {
                c: 3
            }
        }
    }, { recurse: false });
    var b3 = buffer();
    m.sideEffect(function() {
        b3(x3.a.b.c)
    });
    x3.a = { b : { c : 4 }};
    x3.a.b.c = 5; // sub structure not reactive
    test.deepEqual(b3.toArray(), [3, 4]);

    test.done();
}

exports.makeReactive3 = function(test) {
    function Order(price) {
        this.price = price;
    }

    var x = m({
        orders: [new Order(1), new Order(2)]
    });

    var b = buffer();
    m.sideEffect(function() {
        b(x.orders.length);
    });

    test.equal(m.isReactive(x.orders), true);
    test.equal(m.isReactive(x.orders[0]), false);
    x.orders[2] = new Order(3);
    x.orders = [];
    test.equal(m.isReactive(x.orders), true);
    x.orders[0] = new Order(2);
    test.deepEqual(b.toArray(), [2, 3, 0, 1]);

    test.done();
}

exports.makeReactive4 = function(test) {
    var x = m([
        { x : 1 },
        { x : 2 }
    ]);

    var b = buffer();
    m(function() {
        return x.map(function(d) { return d.x });
    }).observe(b, true);

    x[0].x = 3;
    x.shift();
    x.push({ x : 5 });
    test.deepEqual(b.toArray(), [[1,2], [3,2], [2], [2, 5]]);

    // non recursive
    var x2 = m([
        { x : 1 },
        { x : 2 }
    ], { recurse: false });

    var b2 = buffer();
    m(function() {
        return x2.map(function(d) { return d.x });
    }).observe(b2, true);

    x2[0].x = 3;
    x2.shift();
    x2.push({ x : 5 });
    test.deepEqual(b2.toArray(), [[1,2], [2], [2, 5]]);

    test.done();
}


exports.makeReactive5 = function(test) {


    var x = m(function() { });
    test.throws(function() {
        x(7); // set not allowed
    });

    var f = function() {};
    var x2 = m(f, { as: 'reference' });
    test.equal(x2(), f);
    x2(null); // allowed

    var x3 = m(m.asReference(f));
    test.equal(x3(), f);
    x3(null); // allowed

    var f = function() { return this.price };

    var x = m({
        price : 17,
        reactive: f,
        nonReactive: m.asReference(f)
    });

    var b = buffer();
    m.sideEffect(function() {
        b([x.reactive, x.nonReactive, x.nonReactive()]);
    });

    x.price = 18;
    test.deepEqual(b.toArray(), [[17, f, 17], [18, f, 18]]);

    test.done();
};