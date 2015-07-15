/// <reference path="./node_modules/mobservable/mobservable.d.ts"/>
import mobservable = require('mobservable');
import {observable} from "mobservable";

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

    @observable get total2() {
        return this.amount * this.price * (1 + this.orders.length);
    }
}

export function testObservable(test) {
    var a = mobservable(3);
    var b = mobservable(() => a() * 2);
    test.equal(b(), 6);
    test.done();
}

export function testAnnotations(test) {
    var order1totals = [];
    var order1 = new Order();
    var order2 = new Order();

    var disposer = mobservable.observeProperty(order1, 'total', value => order1totals.push(value), true);

    order2.price = 4;
    order1.amount = 1;

    test.equal(order1.price, 3);
    test.equal(order1.total(), 3);
    test.equal(order1.total2, 3);
    test.equal(order2.total(), 8);
    order2.orders.push('bla');
    test.equal(order2.total(), 16);

    order1.orders.splice(0,0,'boe', 'hoi');
    test.deepEqual(order1totals, [6,3,9]);

    disposer();
    order1.orders.pop();
    test.equal(order1.total(), 6);
    test.equal(order1.total2, 6);
    test.deepEqual(order1totals, [6,3,9]);
    test.done();
};

export function testTyping(test) {
    var ar:Mobservable.IObservableArray<number> = mobservable.array([1,2]);
    ar.observe((d:Mobservable.IArrayChange<number>|Mobservable.IArraySplice<number>) => {
        console.log(d.type);
    });
    
    var ar2:Mobservable.IObservableArray<number> = mobservable([1,2]);
    ar2.observe((d:Mobservable.IArrayChange<number>|Mobservable.IArraySplice<number>) => {
        console.log(d.type);
    });
    
    var x:Mobservable.IObservableValue<number> = mobservable(3);
    
    test.done();
}