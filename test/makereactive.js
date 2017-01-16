var test = require('tape');
var mobx = require('..');
var m = mobx;
var o = mobx.observable;

var value = mobx.value;
var voidObserver = function(){};

function buffer() {
    var b = [];
    var res = function(x) {
        b.push(x);
    };
    res.toArray = function() {
        return b;
    }
    return res;
}


test('isObservable', function(t) {
    function Order(price) {

    }

    function ReactiveOrder(price) {
        m.extendObservable(this, {
            price: price
        });
    }
    t.equal(m.isObservable(null), false);
    t.equal(m.isObservable(null), false);

    t.equal(m.isObservable(m.observable([])), true);
    t.equal(m.isObservable(m.observable({})), true);
    t.equal(m.isObservable(m.observable(function() {})), true);
    t.equal(m.isObservable(m.computed(function() {})), true);

    t.equal(m.isObservable([]), false);
    t.equal(m.isObservable({}), false);
    t.equal(m.isObservable(function() {}), false);

    t.equal(m.isObservable(new Order()), false);
    t.equal(m.isObservable(m.observable(new Order())), true);

    t.equal(m.isObservable(new ReactiveOrder), true);
    t.equal(m.isObservable(m.observable(3)), true);

    var obj = {};
    t.equal(m.isObservable(obj), false);

    t.equal(m.isObservable(m.observable(function(){})), true);
    t.equal(m.isObservable(m.autorun(function(){})), true);

    t.equal(m.isObservable(m.observable({ a: 1}), "a"), true);
    t.equal(m.isObservable(m.observable({ a: 1}), "b"), false);

    t.equal(m.isObservable(m.map()), true);

	const base = { a: 3 };
	const obs = m.observable(base);
	t.equal(m.isObservable(base), false);
	t.equal(m.isObservable(base, "a"), false);
	t.equal(m.isObservable(obs), true);
	t.equal(m.isObservable(obs, "a"), true);

    t.end();
})

test('observable1', function(t) {
    m.extras.resetGlobalState();

    // recursive structure
    var x = m.observable({
        a: {
            b: {
                c: 3
            }
        }
    });
    var b = buffer();
    m.autorun(function() {
        b(x.a.b.c)
    });
    x.a = { b : { c : 4 }};
    x.a.b.c = 5; // new structure was reactive as well
    t.deepEqual(b.toArray(), [3, 4, 5]);

    // recursive structure, but asReference passed in
    t.equal(m.isObservable(x.a.b), true);
    var x2 = m.observable({
        a: m.observable.ref({
            b: {
                c: 3
            }
        })
    });

    t.equal(m.isObservable(x2), true);
    t.equal(m.isObservable(x2.a), false);
    t.equal(m.isObservable(x2.a.b), false);

    var b2 = buffer();
    m.autorun(function() {
        b2(x2.a.b.c)
    });
    x2.a = { b : { c : 4 }};
    x2.a.b.c = 5; // not picked up, not reactive, since passed as reference
    t.deepEqual(b2.toArray(), [3, 4]);

    // non recursive structure
    var x3 = o.shallowObject({
        a: {
            b: {
                c: 3
            }
        }
    });
    var b3 = buffer();
    m.autorun(function() {
        b3(x3.a.b.c)
    });
    x3.a = { b : { c : 4 }};
    x3.a.b.c = 5; // sub structure not reactive
    t.deepEqual(b3.toArray(), [3, 4]);

    t.end();
})

test('observable3', function(t) {
    function Order(price) {
        this.price = price;
    }

    var x = m.observable({
        orders: [new Order(1), new Order(2)]
    });

    var b = buffer();
    m.autorun(function() {
        b(x.orders.length);
    });

    t.equal(m.isObservable(x.orders), true);
    t.equal(m.isObservable(x.orders[0]), false);
    x.orders[2] = new Order(3);
    x.orders = [];
    t.equal(m.isObservable(x.orders), true);
    x.orders[0] = new Order(2);
    t.deepEqual(b.toArray(), [2, 3, 0, 1]);

    t.end();
})

test('observable4', function(t) {
    var x = m.observable([
        { x : 1 },
        { x : 2 }
    ]);

    var b = buffer();
    m.observe(m.computed(function() {
        return x.map(function(d) { return d.x });
	}), x => b(x.newValue), true);

    x[0].x = 3;
    x.shift();
    x.push({ x : 5 });
    t.deepEqual(b.toArray(), [[1,2], [3,2], [2], [2, 5]]);

    // non recursive
    var x2 = o.shallowArray([
        { x : 1 },
        { x : 2 }
    ]);

    var b2 = buffer();
    m.observe(m.computed(function() {
        return x2.map(function(d) { return d.x });
    }), x => b2(x.newValue), true);

    x2[0].x = 3;
    x2.shift();
    x2.push({ x : 5 });
    t.deepEqual(b2.toArray(), [[1,2], [2], [2, 5]]);

    t.end();
})

test('observable5', function(t) {

    var x = m.computed(function() { });
    t.throws(function() {
        x.set(7); // set not allowed
    });

    var f = function() {};
    var x2 = m.observable(f);
    t.equal(x2.get(), f);
    x2.set(null); // allowed

    f = function() { return this.price };

    var x = m.observable({
        price : 17,
        reactive: m.computed(f),
        nonReactive: f
    });

    var b = buffer();
    m.autorun(function() {
        b([x.reactive, x.nonReactive, x.nonReactive()]);
    });

    x.price = 18;
    var three = function() { return 3; }
    x.nonReactive = three;
    t.deepEqual(b.toArray(), [[17, f, 17], [18, f, 18], [18, three, 3]]);

    t.end();
})

test('flat array', function(t) {
    var x = m.observable({
        x: m.observable.shallow([{
            a: 1
        }])
    });

    var result;
    var updates = 0;
    var dis = m.autorun(function() {
        updates++;
        result = JSON.stringify(mobx.toJS(x));
    });

    t.deepEqual(result, JSON.stringify({ x: [{ a: 1 }]}));
    t.equal(updates, 1);

    x.x[0].a = 2; // not picked up; object is not made reactive
    t.deepEqual(result, JSON.stringify({ x: [{ a: 1 }]}));
    t.equal(updates, 1);

    x.x.push({ a: 3 }); // picked up, array is reactive
    t.deepEqual(result, JSON.stringify({ x: [{ a: 2}, { a: 3 }]}));
    t.equal(updates, 2);

    x.x[0] = { a: 4 }; // picked up, array is reactive
    t.deepEqual(result, JSON.stringify({ x: [{ a: 4 }, { a: 3 }]}));
    t.equal(updates, 3);

    x.x[1].a = 6; // not picked up
    t.deepEqual(result, JSON.stringify({ x: [{ a: 4 }, { a: 3 }]}));
    t.equal(updates, 3);

    t.end();
})

test('flat object', function(t) {
    var y = m.observable.shallowObject({
        x : { z: 3 }
    });

    var result;
    var updates = 0;
    var dis = m.autorun(function() {
        updates++;
        result = JSON.stringify(mobx.toJS(y));
    });

    t.deepEqual(result, JSON.stringify({ x: { z: 3 }}));
    t.equal(updates, 1);

    y.x.z = 4; // not picked up
    t.deepEqual(result, JSON.stringify({ x: { z: 3 }}));
    t.equal(updates, 1);

    y.x = { z: 5 };
    t.deepEqual(result, JSON.stringify({ x: { z: 5 }}));
    t.equal(updates, 2);

    y.x.z = 6; // not picked up
    t.deepEqual(result, JSON.stringify({ x: { z: 5 }}));
    t.equal(updates, 2);

    t.end();
})

test('as structure', function(t) {

    var x = m.observable({
        x: m.observable.structurallyCompare(null)
    });

    var changed = 0;
    var dis = m.autorun(function() {
        changed++;
        JSON.stringify(x);
    });

    function c() {
        t.equal(changed, 1, "expected a change");
        if (changed !== 1)
            console.trace();
        changed = 0;
    }

    function nc() {
        t.equal(changed, 0, "expected no change");
        if (changed !== 0)
            console.trace();
        changed = 0;
    }

    // nc = no change, c = changed.
    c();
    x.x = null;
    nc();
    x.x = undefined;
    c();
    x.x = 3;
    c();
    x.x = 1* x.x;
    nc();
    x.x = "3";
    c();

    x.x = {
        y: 3
    };
    c();
    x.x.y = 3;
    nc();
    x.x = {
        y: 3
    };
    nc();
    x.x = {
        y: 4
    };
    c();
    x.x = {
        y: 3
    };
    c();
    x.x = {
        y: {
            y: 3
        }
    };
    c();
    x.x.y.y = 3;
	console.log("test")
    nc();
    x.x.y = { y: 3 };
    nc();
    x.x = { y: { y: 3 }};
    nc();
    x.x = { y: { y: 4 }};
    c();
    x.x = {};
    c();
    x.x = {};
    nc();

    x.x = [];
    c();
    x.x = [];
    nc();
    x.x = [3,2,1];
    c();
    x.x.sort();
    nc();
    x.x.sort();
    nc();
    x.x[1] = 2;
    nc();
    x.x[0] = 0;
    c();
    x.x[1] = {
        a: [1,2]
    };
    c();
    x.x[1].a = [1,2];
    nc();
    x.x[1].a[1] = 3;
    c();
    x.x[1].a[2] = 3;
    c();
    x.x = {
        a : [ {
            b : 3
        }]
    };
    c();
    x.x = {
        a : [ {
            b : 3
        }]
    };
    nc();
    x.x.a = [{ b : 3 }]
    nc();
    x.x.a[0] = { b: 3 };
    nc();
    x.x.a[0].b = 3;
    nc();

    dis();
    t.end();
})

test('as structure view', function(t) {
    var x = m.observable({
        a: 1,
        aa: 1,
        get b() {
            this.a;
            return { a: this.aa };
        },
        c: m.computed((function() {
            this.b
            return { a : this.aa };
        }), { compareStructural: true })
    });

    var bc = 0;
    var bo = m.autorun(function() {
        x.b;
        bc++;
    });
    t.equal(bc, 1);

    var cc = 0;
    var co = m.autorun(function() {
        x.c;
        cc++;
    });
    t.equal(cc, 1);

    x.a = 2;
    x.a = 3;
    t.equal(bc, 3);
    t.equal(cc, 1);
    x.aa = 3;
    t.equal(bc, 4);
    t.equal(cc, 2);
    t.end();
})

test('ES5 non reactive props', function (t) {
  var te = {}
  Object.defineProperty(te, 'nonConfigurable', {
    enumerable: true,
    configurable: false,
    writable: true,
    value: 'static'
  })
  // should throw if trying to reconfigure an existing non-configurable prop
  t.throws(function() {
	 const a = m.extendObservable(te2, { notConfigurable: 1 });
  });
  // should skip non-configurable / writable props when using `observable`
  te = m.extendObservable(te, te);
  const d1 = Object.getOwnPropertyDescriptor(te, 'nonConfigurable')
  t.equal(d1.value, 'static')

  var te2 = {};
  Object.defineProperty(te2, 'notWritable', {
    enumerable: true,
    configurable: true,
    writable: false,
    value: 'static'
  })
  // should throw if trying to reconfigure an existing non-writable prop
  t.throws(function() {
	 const a = m.extendObservable(te2, { notWritable: 1 });
  });
  const d2 = Object.getOwnPropertyDescriptor(te2, 'notWritable')
  t.equal(d2.value, 'static')

  // should not throw for other props
  t.equal(m.extendObservable(te, { 'bla' : 3}).bla, 3);

  t.end();
})

test('exceptions', function(t) {
    t.throws(function() {
        m.asReference(m.asFlat(3));
    }, "nested");

    var x = m.observable({
        y: m.observable.ref(null),
		z: 2
    });

    t.throws(function() {
        x.y = m.asStructure(3)
    });

    t.throws(function() {
        x.z = m.asReference(3)
    });

    var ar = m.observable([2]);

    t.throws(function() {
        ar[0] = m.asReference(3)
    });

    t.throws(function() {
        ar[1] = m.asReference(3)
    });

    t.throws(function() {
        ar = m.observable([m.asStructure(3)]);
    });

    return t.end();
})

test("540 - extendobservable should not report cycles", function(t) {
	t.throws(
		() => m.extendObservable(Object.freeze({}), {}),
		/Cannot make the designated object observable/
	);

	var objWrapper = mobx.observable({
		value: null,
	});

	var obj = {
		name: "Hello",
	};

	objWrapper.value = obj;
	t.throws(
		() => mobx.extendObservable(objWrapper, objWrapper.value),
		/extending an object with another observable \(object\) is not supported/
	);

	mobx.autorun(() => {
		console.log(objWrapper.name);
	});
	t.end();
})

test('mobx 3', t => {
	const x = mobx.observable({ a: 1 })

	t.ok(x === mobx.observable(x));

	const y = mobx.observable.shallowBox(null);
	const obj = { a: 2 };
	y.set(obj);
	t.ok(y.get() === obj);
	t.equal(mobx.isObservable(y.get()), false);



	t.end()
})

test("computed value", t => {
	mobx.extras.getGlobalState().mobxGuid = 0;
	var c = mobx.computed(() => 3);

	t.equal(c.toJSON(), 3);
	t.equal(mobx.isComputed(c), true);
	t.equal(c.toString(), "ComputedValue@2[() => 3]");
	t.end();

})

test("boxed value json", t => {
	var a = mobx.observable.box({ x: 1 })
	t.deepEqual(a.get().x, 1);
	a.set(3);
	t.deepEqual(a.get(), 3);
	t.equal("" + a, 'ObservableValue@3[3]');
	t.equal(a.toJSON(), 3);
	t.end();
})

test("computed value scope", t => {
	var a = mobx.observable({
		x: 1,
		y: mobx.computed(function() {
			return this.x * 2
		}, function(v) {
			this.x = v;
		})
	})

	t.equal(a.y, 2);
	a.x = 2;
	t.equal(a.y, 4);
	a.y = 3;
	t.equal(a.y, 6);

	t.end();
});

test("shallow array", t => {
	var a = mobx.observable.shallowArray();
	a.push({ x: 1 }, [], 2, mobx.observable({ y: 3 }));

	t.equal(mobx.isObservable(a), true);
	t.equal(mobx.isObservable(a[0]), false);
	t.equal(mobx.isObservable(a[1]), false);
	t.equal(mobx.isObservable(a[2]), false);
	t.equal(mobx.isObservable(a[3]), true);

	t.end();
})