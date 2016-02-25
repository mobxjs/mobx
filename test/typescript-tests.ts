/// <reference path='require.d.ts' />
/// <reference path='tape.d.ts' />
import {
    observe, computed, observable, asStructure, autorun, autorunAsync, extendObservable, 
    IObservableArray, IArrayChange, IArraySplice, IObservableValue,
    extras, Atom, transaction
} from "../lib/mobx";
import * as test from 'tape';

var v = observable(3);
observe(v, () => {});

var a = observable([1,2,3]);

var testFunction = function(a:any) {};

class Order {
    @observable price:number = 3;
    @observable amount:number = 2;
    @observable orders:string[] = [];
    @observable aFunction = testFunction;
    @observable someStruct = asStructure({ x: 1, y: 2});

    @computed get total() {
        return this.amount * this.price * (1 + this.orders.length);
    }
    
    // Typescript classes cannot be defined inside functions,
    // but if the next line is enabled it should throw...
    // @observable hoepie() { return 3; }
}

test('observable', function(t) {
    var a = observable(3);
    var b = observable(() => a.get() * 2);
    t.equal(b.get(), 6);
    t.end();
})

test('annotations', function(t) {
    var order1totals:number[] = [];
    var order1 = new Order();
    var order2 = new Order();

    var disposer = autorun(() => {
        order1totals.push(order1.total)
    });

    order2.price = 4;
    order1.amount = 1;

    t.equal(order1.price, 3);
    t.equal(order1.total, 3);
    t.equal(order2.total, 8);
    order2.orders.push('bla');
    t.equal(order2.total, 16);

    order1.orders.splice(0,0,'boe', 'hoi');
    t.deepEqual(order1totals, [6,3,9]);

    disposer();
    order1.orders.pop();
    t.equal(order1.total, 6);
    t.deepEqual(order1totals, [6,3,9]);
    
    t.equal(order1.aFunction, testFunction);
    var x = function() { return 3; };
    order1.aFunction = x;
    t.equal(order1.aFunction, x);
    
    var coords:{x:number, y:number} = null;
    var coordsCalcs = 0;
    var disposer2 = autorun(() => {
        coordsCalcs++;
        coords = { x : order1.someStruct.x, y: order1.someStruct.y };
    });
    t.equal(coordsCalcs, 1);
    t.deepEqual(coords, { x: 1, y: 2});
    
    order1.someStruct.x = 1;
    order1.someStruct = { x: 1, y: 2};
    t.equal(coordsCalcs, 1);
    t.deepEqual(coords, { x: 1, y: 2});

    order1.someStruct.x = 2;
    t.deepEqual(coords, { x: 2, y: 2 });
    t.equal(coordsCalcs, 2);
    
    order1.someStruct = { x: 3, y: 3 };
    t.equal(coordsCalcs, 3);
    t.deepEqual(coords, { x: 3, y: 3 });
    
    t.end();
})

test('scope', function(t) {
    var x = observable({
        y: 3,
        // this wo't work here.
        z: () => 2 * x.y
    });
    
    t.equal(x.z, 6);
    x.y = 4;
    t.equal(x.z, 8);
    
    interface IThing {
        z: number;
        y: number;
    }

    const Thing = function() {
        extendObservable(this, {
            y: 3,
            // this will work here
            z: () => 2 * this.y
        });
    }

    var x3: IThing = new (<any>Thing)();
    t.equal(x3.z, 6);
    x3.y = 4;
    t.equal(x3.z, 8);

    t.end();
})

test('typing', function(t) {
    var ar:IObservableArray<number> = observable([1,2]);
    ar.observe((d:IArrayChange<number>|IArraySplice<number>) => {
        console.log(d.type);
    });

    var ar2:IObservableArray<number> = observable([1,2]);
    ar2.observe((d:IArrayChange<number>|IArraySplice<number>) => {
        console.log(d.type);
    });

    var x:IObservableValue<number> = observable(3);

    var d2 = autorunAsync(function() {
        
    });

    t.end();
})

const state:any = observable({
    authToken: null
});

class LoginStoreTest {
    loggedIn2: boolean;
    constructor() {
        extendObservable(this, {
            loggedIn2: () => !!state.authToken
        });
    }

    @observable get loggedIn() {
        return !!state.authToken;
    }
}

test('issue8', function(t){
    var fired = 0;

    const store = new LoginStoreTest();
    
    autorun(() => {
        fired++;
        store.loggedIn;
    });
    
    t.equal(fired, 1);
    state.authToken = 'a';
    state.authToken = 'b';
    
    t.equal(fired, 2);
    t.end();
})

class Box {
    @observable uninitialized:any;
    @observable height = 20;
    @observable sizes = [2];
    @observable someFunc = function () { return 2; }
    @computed get width() {
        return this.height * this.sizes.length * this.someFunc() * (this.uninitialized ? 2 : 1);
    }
}

test('box', function(t) {
    var box = new Box();
    
    var ar:number[] = []
    
    autorun(() => {
        ar.push(box.width);
    });

    t.deepEqual(ar.slice(), [40]);
    box.height = 10;
    t.deepEqual(ar.slice(), [40, 20]);
    box.sizes.push(3, 4);
    t.deepEqual(ar.slice(), [40, 20, 60]);
    box.someFunc = () => 7;
    t.deepEqual(ar.slice(), [40, 20, 60, 210]);
    box.uninitialized = true;
    t.deepEqual(ar.slice(), [40, 20, 60, 210, 420]);

    t.end();
})

test('observable setter should fail', function(t) {
	t.throws(() => {
		class Bla {
			@computed get propX() {
				return 3;
			}
			set propX(v) {
				
			}
		}
	}, 'propX');
	t.end();
});

test('atom clock example', function(t) {
	let ticks = 0;
	const time_factor = 50; // speed up / slow down tests

	class Clock {
		atom: Atom;
		intervalHandler: number = null;
		currentDateTime: string;

		constructor() {
			console.log("create");
			// creates an atom to interact with the mobx core algorithm
			this.atom =	new Atom(
				// first param a name for this atom, for debugging purposes
				"Clock",
				// second (optional) parameter: callback for when this atom transitions from unobserved to observed.
				() => this.startTicking(),
				// third (optional) parameter: callback for when this atom transitions from observed to unobserved
				// note that the same atom transition multiple times between these two states
				() => this.stopTicking()
			);
		}

		getTime() {
			console.log("get time");
			// let mobx now this observable data source has been used
			this.atom.reportObserved();
			if (!this.intervalHandler)
				this.tick(); // get the initial data
			return this.currentDateTime;
		}

		tick() {
			console.log("tick");
			ticks++;
			this.currentDateTime = new Date().toString();
			this.atom.reportChanged();
		}

		startTicking() {
			console.log("start ticking");
			this.intervalHandler = setInterval(() => this.tick(), 1 * time_factor);
		}

		stopTicking() {
			console.log("stop ticking");
			clearInterval(this.intervalHandler);
			this.intervalHandler = null;
		}
	}

	const clock = new Clock();

	const values: string[] = [];

	// ... prints the time each second
	const disposer = autorun(() => {
		values.push(clock.getTime());
		console.log(clock.getTime());
	});

	// printing stops. If nobody else uses the same `clock` the clock will stop ticking as well.
	setTimeout(disposer, 4.5 * time_factor);

	setTimeout(() => {
		t.equal(ticks, 6);
		t.equal(values.length, 5);
		t.equal(values.filter(x => x.length > 0).length, 5);
		t.end();
	}, 10 * time_factor);

});

test('typescript: parameterized computed decorator', (t) => {
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