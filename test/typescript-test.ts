/// <reference path="../mobservable.d.ts"/>
import mobservable = require('../mobservable');

var observable = mobservable.observable;

var v = mobservable(3);
v.observe(() => {});

var a = mobservable.array([1,2,3]);

class Order {
	@observable price:number = 3;
	@observable amount:number = 2;
	@observable orders = [];

	@observable total() {
		return this.amount * this.price * (1 + this.orders.length);
	}
}

export function testAnnotations(test) {
	var order1totals = [];
	var order1 = new Order();
	var order2 = new Order();

	mobservable
		.value(() => order1.total)
		.observe(value => order1totals.push(value), true);

	order2.price = 4;
	order1.amount = 1;

	test.equal(order1.price, 3);
	test.equal(order1.total, 3);
	test.equal(order2.total, 8);
	order2.orders.push('bla');
	test.equal(order2.total, 16);

	order1.orders.splice(0,0,'boe', 'hoi');
	test.deepEqual(order1totals, [6,3,9]);
	test.done();
};
