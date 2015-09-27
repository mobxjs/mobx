/// <reference path="./node_modules/mobservable/dist/mobservable.d.ts"/>
import mobservable = require('mobservable');
import {observable, asStructure} from "mobservable";

var v = mobservable(3);
v.observe(() => {});

var a = mobservable([1,2,3]);

var testFunction = function(a) {};

class Order {
    @observable price:number = 3;
    @observable amount:number = 2;
    @observable orders = [];
    @observable aFunction = testFunction;
    @observable someStruct = asStructure({ x: 1, y: 2});

    @observable get total() {
        return this.amount * this.price * (1 + this.orders.length);
    }
    
    // Typescript classes cannot be defined inside functions,
    // but if the next line is enabled it should throw...
    // @observable hoepie() { return 3; }
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

    var disposer = mobservable.observe(() => {
        order1totals.push(order1.total)
    });

    order2.price = 4;
    order1.amount = 1;

    test.equal(order1.price, 3);
    test.equal(order1.total, 3);
    test.equal(order2.total, 8);
    order2.orders.push('bla');
    test.equal(order2.total, 16);

    order1.orders.splice(0,0,'boe', 'hoi');
    test.deepEqual(order1totals, [6,3,9]);

    disposer();
    order1.orders.pop();
    test.equal(order1.total, 6);
    test.deepEqual(order1totals, [6,3,9]);
    
    test.equal(order1.aFunction, testFunction);
    var x = function() { return 3; };
    order1.aFunction = x;
    test.equal(order1.aFunction, x);
    
    var coords = null;
    var coordsCalcs = 0;
    var disposer2 = mobservable.observe(() => {
        coordsCalcs++;
        coords = { x : order1.someStruct.x, y: order1.someStruct.y };
    });
    test.equal(coordsCalcs, 1);
    test.deepEqual(coords, { x: 1, y: 2});
    
    order1.someStruct.x = 1;
    order1.someStruct = { x: 1, y: 2};
    test.equal(coordsCalcs, 1);
    test.deepEqual(coords, { x: 1, y: 2});

    order1.someStruct.x = 2;
    test.deepEqual(coords, { x: 2, y: 2 });
    test.equal(coordsCalcs, 2);
    
    order1.someStruct = { x: 3, y: 3 };
    test.equal(coordsCalcs, 3);
    test.deepEqual(coords, { x: 3, y: 3 });
    
    test.done();
};

export function testTyping(test) {
    var ar:Mobservable.IObservableArray<number> = mobservable.makeReactive([1,2]);
    ar.observe((d:Mobservable.IArrayChange<number>|Mobservable.IArraySplice<number>) => {
        console.log(d.type);
    });

    var ar2:Mobservable.IObservableArray<number> = mobservable([1,2]);
    ar2.observe((d:Mobservable.IArrayChange<number>|Mobservable.IArraySplice<number>) => {
        console.log(d.type);
    });

    var x:Mobservable.IObservableValue<number> = mobservable(3);

    var d1 = mobservable.observeAsync(() => 3, (num:number) => {
        // noop
    });
    
    var d2 = mobservable.observeAsync(function() {
        
    }, function() {
        // noop
    });

    test.done();
}

const state:any = mobservable.makeReactive({
    authToken: null
});

class LoginStoreTest {
    loggedIn2;
    constructor() {
        mobservable.extendReactive(this, {
            loggedIn2: () => !!state.authToken
        });
    }

    @observable get loggedIn() {
        return !!state.authToken;
    }
}

export function testIssue8(test){
    var fired = 0;

    const store = new LoginStoreTest();
    
    mobservable.observe(() => {
        fired++;
        store.loggedIn;
    });
    
    test.equal(fired, 1);
    state.authToken = 'a';
    state.authToken = 'b';
    
    test.equal(fired, 2);
    test.done();
}