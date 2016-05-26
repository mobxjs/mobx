import {
    observable, computed, transaction, asStructure, autorun, extendObservable, action,
	isObservableObject, observe, isObservable, spy,
    default as mobx
} from "../";

class Box {
    @observable uninitialized;
    @observable height = 20;
    @observable sizes = [2];
    @observable someFunc = function () { return 2; };
    @computed get width() {
        return this.height * this.sizes.length * this.someFunc() * (this.uninitialized ? 2 : 1);
    }
}

var box = new Box();

var ar = []

autorun(() => {
    ar.push(box.width);
});

var test = require('tape')

test('babel', function (t) {
  var s = ar.slice()
  t.deepEqual(s, [40])
  box.height = 10
  s = ar.slice()
  t.deepEqual(s, [40, 20])
  box.sizes.push(3, 4)
  s = ar.slice()
  t.deepEqual(s, [40, 20, 60])
  box.someFunc = () => 7
  s = ar.slice()
  t.deepEqual(s, [40, 20, 60, 210])
  box.uninitialized = true
  s = ar.slice()
  t.deepEqual(s, [40, 20, 60, 210, 420])
  t.end()
})

test('babel: parameterized computed decorator', (t) => {
	class TestClass {
		@observable x = 3;
		@observable y = 3;
		@computed({ asStructure: true }) get boxedSum() {
			return { sum: Math.round(this.x) + Math.round(this.y) };
		}
	}
	
	const t1 = new TestClass();
	const changes: { sum: number}[] = [];
	const d = autorun(() => changes.push(t1.boxedSum));
	
	t1.y = 4; // change
	t.equal(changes.length, 2);
	t1.y = 4.2; // no change
	t.equal(changes.length, 2);
	transaction(() => {
		t1.y = 3;
		t1.x = 4;
	}); // no change
	t.equal(changes.length, 2);
	t1.x = 6; // change
	t.equal(changes.length, 3);
	d();
	
	t.deepEqual(changes, [{ sum: 6 }, { sum: 7 }, { sum: 9 }]);
	
	t.end();
});

class Order {
    @observable price = 3;
    @observable amount = 2;
    @observable orders = [];
    @observable aFunction = function(a) { };
    @observable someStruct = asStructure({ x: 1, y: 2});

    @computed get total() {
        return this.amount * this.price * (1 + this.orders.length);
    }
}

test('decorators', function(t) {
	var o = new Order();
	t.equal(o.total, 6); // hmm this is required to initialize the props which are made reactive lazily..
	t.equal(isObservableObject(o), true);
	t.equal(isObservable(o, 'amount'), true);
	t.equal(isObservable(o, 'total'), true);
	
	var events = [];
	var d1 = observe(o, (ev) => events.push(ev.name, ev.oldValue));
	var d2 = observe(o, 'price', (newValue, oldValue) => events.push(newValue, oldValue));
	var d3 = observe(o, 'total', (newValue, oldValue) => events.push(newValue, oldValue));
	
	o.price = 4;
	
	d1();
	d2();
	d3();
	
	o.price = 5;
	
	t.deepEqual(events, [
		8, // new total
		6, // old total
		4, // new price
		3, // old price
		"price", // event name
		3, // event oldValue
	]);
	
	t.end();
})

test('issue 191 - shared initializers (babel)', function(t) {
	class Test {
		@observable obj = { a: 1 };
		@observable array = [2];
	}
	
	var t1 = new Test();
	t1.obj.a = 2;
	t1.array.push(3);
	
	var t2 = new Test();
	t2.obj.a = 3;
	t2.array.push(4);
	
	t.notEqual(t1.obj, t2.obj);
	t.notEqual(t1.array, t2.array);
	t.equal(t1.obj.a, 2);
	t.equal(t2.obj.a, 3);
	
	t.deepEqual(t1.array.slice(), [2,3]);
	t.deepEqual(t2.array.slice(), [2,4]);
	
	t.end();
})

function normalizeSpyEvents(events) {
	events.forEach(ev => {
		delete ev.fn;
		delete ev.time;
	});
	return events;
}

test("action decorator (babel)", function(t) {
	class Store {
		constructor(multiplier) {
			this.multiplier = multiplier;
		}
		
		@action
		add(a, b) {
			return (a + b) * this.multiplier;
		}
	}

	const store1 =  new Store(2);
	const store2 =  new Store(3);
	const events: any[] = [];
	const d = spy(events.push.bind(events));
	t.equal(store1.add(3, 4), 14);
	t.equal(store2.add(3, 4), 21);
	t.equal(store1.add(1, 1), 4);

	t.deepEqual(normalizeSpyEvents(events),	[
		{ arguments: [ 3, 4 ], name: "add", spyReportStart: true, target: store1, type: "action" },
		{ spyReportEnd: true },
		{ arguments: [ 3, 4 ], name: "add", spyReportStart: true, target: store2, type: "action" },
		{ spyReportEnd: true },
		{ arguments: [ 1, 1 ], name: "add", spyReportStart: true, target: store1, type: "action" },
		{ spyReportEnd: true }
	]);

	d();
	t.end();
});

test("custom action decorator (babel)", function(t) {
	class Store {
		constructor(multiplier) {
			this.multiplier = multiplier;
		}

		@action("zoem zoem")
		add(a, b) {
			return (a + b) * this.multiplier;
		}
	}

	const store1 =  new Store(2);
	const store2 =  new Store(3);
	const events: any[] = [];
	const d = spy(events.push.bind(events));
	t.equal(store1.add(3, 4), 14);
	t.equal(store2.add(3, 4), 21);
	t.equal(store1.add(1, 1), 4);

	t.deepEqual(normalizeSpyEvents(events),	[
		{ arguments: [ 3, 4 ], name: "zoem zoem", spyReportStart: true, target: store1, type: "action" },
		{ spyReportEnd: true },
		{ arguments: [ 3, 4 ], name: "zoem zoem", spyReportStart: true, target: store2, type: "action" },
		{ spyReportEnd: true },
		{ arguments: [ 1, 1 ], name: "zoem zoem", spyReportStart: true, target: store1, type: "action" },
		{ spyReportEnd: true },
	]);

	d();
	t.end();
});


test("action decorator on field (babel)", function(t) {
	class Store {
		constructor(multiplier) {
			this.multiplier = multiplier;
		}


		@action
		add = (a, b) => {
			return (a + b) * this.multiplier;
		};
	}

	const store1 =  new Store(2);
	const store2 =  new Store(7);
	
	const events: any[] = [];
	const d = spy(events.push.bind(events));
	t.equal(store1.add(3, 4), 14);
	t.equal(store2.add(5, 4), 63);
	t.equal(store1.add(2, 2), 8);

	t.deepEqual(normalizeSpyEvents(events),	[
		{ arguments: [ 3, 4 ], name: "add", spyReportStart: true, target: store1, type: "action" },
		{ spyReportEnd: true },
		{ arguments: [ 5, 4 ], name: "add", spyReportStart: true, target: store2, type: "action" },
		{ spyReportEnd: true },
		{ arguments: [ 2, 2 ], name: "add", spyReportStart: true, target: store1, type: "action" },
		{ spyReportEnd: true }
	]);

	d();
	t.end();
});

test("custom action decorator on field (babel)", function(t) {
	class Store {
		constructor(multiplier) {
			this.multiplier = multiplier;
		}


		@action("zoem zoem")
		add = (a, b) => {
			return (a + b) * this.multiplier;
		};
	}

	const store1 =  new Store(2);
	const store2 =  new Store(7);
	
	const events: any[] = [];
	const d = spy(events.push.bind(events));
	t.equal(store1.add(3, 4), 14);
	t.equal(store2.add(5, 4), 63);
	t.equal(store1.add(2, 2), 8);

	t.deepEqual(normalizeSpyEvents(events),	[
		{ arguments: [ 3, 4 ], name: "zoem zoem", spyReportStart: true, target: store1, type: "action" },
		{ spyReportEnd: true },
		{ arguments: [ 5, 4 ], name: "zoem zoem", spyReportStart: true, target: store2, type: "action" },
		{ spyReportEnd: true },
		{ arguments: [ 2, 2 ], name: "zoem zoem", spyReportStart: true, target: store1, type: "action" },
		{ spyReportEnd: true }
	]);

	d();
	t.end();
});