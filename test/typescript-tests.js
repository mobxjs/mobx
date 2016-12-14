"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
/// <reference path='require.d.ts' />
/// <reference path='tape.d.ts' />
var mobx_1 = require("../../lib/mobx");
var test = require('tape');
var mobx = require("../../lib/mobx");
var v = mobx_1.observable(3);
mobx_1.observe(v, function () { });
var a = mobx_1.observable([1, 2, 3]);
var testFunction = function (a) { };
var Order = (function () {
    function Order() {
        this.price = 3;
        this.amount = 2;
        this.orders = [];
        this.aFunction = testFunction;
    }
    Object.defineProperty(Order.prototype, "total", {
        get: function () {
            return this.amount * this.price * (1 + this.orders.length);
        },
        enumerable: true,
        configurable: true
    });
    __decorate([
        mobx_1.observable
    ], Order.prototype, "price", void 0);
    __decorate([
        mobx_1.observable
    ], Order.prototype, "amount", void 0);
    __decorate([
        mobx_1.observable
    ], Order.prototype, "orders", void 0);
    __decorate([
        mobx_1.observable
    ], Order.prototype, "aFunction", void 0);
    __decorate([
        mobx_1.computed
    ], Order.prototype, "total", null);
    return Order;
}());
test('decorators', function (t) {
    var o = new Order();
    t.equal(mobx_1.isObservableObject(o), true);
    t.equal(mobx_1.isObservable(o, 'amount'), true);
    t.equal(mobx_1.isObservable(o, 'total'), true);
    var events = [];
    var d1 = mobx_1.observe(o, function (ev) { return events.push(ev.name, ev.oldValue); });
    var d2 = mobx_1.observe(o, 'price', function (newValue, oldValue) { return events.push(newValue, oldValue); });
    var d3 = mobx_1.observe(o, 'total', function (newValue, oldValue) { return events.push(newValue, oldValue); });
    o.price = 4;
    d1();
    d2();
    d3();
    o.price = 5;
    t.deepEqual(events, [
        8,
        6,
        4,
        3,
        "price",
        3,
    ]);
    t.end();
});
test('observable', function (t) {
    var a = mobx_1.observable(3);
    var b = mobx_1.computed(function () { return a.get() * 2; });
    t.equal(b.get(), 6);
    t.end();
});
test('annotations', function (t) {
    var order1totals = [];
    var order1 = new Order();
    var order2 = new Order();
    var disposer = mobx_1.autorun(function () {
        order1totals.push(order1.total);
    });
    order2.price = 4;
    order1.amount = 1;
    t.equal(order1.price, 3);
    t.equal(order1.total, 3);
    t.equal(order2.total, 8);
    order2.orders.push('bla');
    t.equal(order2.total, 16);
    order1.orders.splice(0, 0, 'boe', 'hoi');
    t.deepEqual(order1totals, [6, 3, 9]);
    disposer();
    order1.orders.pop();
    t.equal(order1.total, 6);
    t.deepEqual(order1totals, [6, 3, 9]);
    t.equal(order1.aFunction, testFunction);
    var x = function () { return 3; };
    order1.aFunction = x;
    t.equal(order1.aFunction, x);
    t.end();
});
test('scope', function (t) {
    var x = mobx_1.observable({
        y: 3,
        // this wo't work here.
        z: mobx_1.computed(function () { return 2 * x.y; })
    });
    t.equal(x.z, 6);
    x.y = 4;
    t.equal(x.z, 8);
    var Thing = function () {
        var _this = this;
        mobx_1.extendObservable(this, {
            y: 3,
            // this will work here
            z: mobx_1.computed(function () { return 2 * _this.y; })
        });
    };
    var x3 = new Thing();
    t.equal(x3.z, 6);
    x3.y = 4;
    t.equal(x3.z, 8);
    t.end();
});
test('typing', function (t) {
    var ar = mobx_1.observable([1, 2]);
    ar.observe(function (d) {
        console.log(d.type);
    });
    var ar2 = mobx_1.observable([1, 2]);
    ar2.observe(function (d) {
        console.log(d.type);
    });
    var x = mobx_1.observable(3);
    var d2 = mobx_1.autorunAsync(function () {
    });
    t.end();
});
var state = mobx_1.observable({
    authToken: null
});
test('issue8', function (t) {
    t.throws(function () {
        var LoginStoreTest = (function () {
            function LoginStoreTest() {
                mobx_1.extendObservable(this, {
                    loggedIn2: function () { return !!state.authToken; }
                });
            }
            Object.defineProperty(LoginStoreTest.prototype, "loggedIn", {
                get: function () {
                    return !!state.authToken;
                },
                enumerable: true,
                configurable: true
            });
            __decorate([
                mobx_1.observable
            ], LoginStoreTest.prototype, "loggedIn", null);
            return LoginStoreTest;
        }());
        var store = new LoginStoreTest();
    }, /@computed/);
    t.end();
});
var Box = (function () {
    function Box() {
        this.height = 20;
        this.sizes = [2];
        this.someFunc = function () { return 2; };
    }
    Object.defineProperty(Box.prototype, "width", {
        get: function () {
            return this.height * this.sizes.length * this.someFunc() * (this.uninitialized ? 2 : 1);
        },
        enumerable: true,
        configurable: true
    });
    __decorate([
        mobx_1.observable
    ], Box.prototype, "uninitialized", void 0);
    __decorate([
        mobx_1.observable
    ], Box.prototype, "height", void 0);
    __decorate([
        mobx_1.observable
    ], Box.prototype, "sizes", void 0);
    __decorate([
        mobx_1.observable
    ], Box.prototype, "someFunc", void 0);
    __decorate([
        mobx_1.computed
    ], Box.prototype, "width", null);
    return Box;
}());
test('box', function (t) {
    var box = new Box();
    var ar = [];
    mobx_1.autorun(function () {
        ar.push(box.width);
    });
    t.deepEqual(ar.slice(), [40]);
    box.height = 10;
    t.deepEqual(ar.slice(), [40, 20]);
    box.sizes.push(3, 4);
    t.deepEqual(ar.slice(), [40, 20, 60]);
    box.someFunc = function () { return 7; };
    t.deepEqual(ar.slice(), [40, 20, 60, 210]);
    box.uninitialized = true;
    t.deepEqual(ar.slice(), [40, 20, 60, 210, 420]);
    t.end();
});
test('computed setter should succeed', function (t) {
    var Bla = (function () {
        function Bla() {
            this.a = 3;
        }
        Object.defineProperty(Bla.prototype, "propX", {
            get: function () {
                return this.a * 2;
            },
            set: function (v) {
                this.a = v;
            },
            enumerable: true,
            configurable: true
        });
        __decorate([
            mobx_1.observable
        ], Bla.prototype, "a", void 0);
        __decorate([
            mobx_1.computed
        ], Bla.prototype, "propX", null);
        return Bla;
    }());
    var b = new Bla();
    t.equal(b.propX, 6);
    b.propX = 4;
    t.equal(b.propX, 8);
    t.end();
});
test('atom clock example', function (t) {
    var ticks = 0;
    var time_factor = 500; // speed up / slow down tests
    var Clock = (function () {
        function Clock() {
            var _this = this;
            this.intervalHandler = null;
            console.log("create");
            // creates an atom to interact with the mobx core algorithm
            this.atom = new mobx_1.Atom(
            // first param a name for this atom, for debugging purposes
            "Clock", 
            // second (optional) parameter: callback for when this atom transitions from unobserved to observed.
            // second (optional) parameter: callback for when this atom transitions from unobserved to observed.
            function () { return _this.startTicking(); }, 
            // third (optional) parameter: callback for when this atom transitions from observed to unobserved
            // note that the same atom transition multiple times between these two states
            // third (optional) parameter: callback for when this atom transitions from observed to unobserved
            // note that the same atom transition multiple times between these two states
            function () { return _this.stopTicking(); });
        }
        Clock.prototype.getTime = function () {
            console.log("get time");
            // let mobx now this observable data source has been used
            this.atom.reportObserved(); // will trigger startTicking and thus tick
            return this.currentDateTime;
        };
        Clock.prototype.tick = function () {
            console.log("tick");
            ticks++;
            this.currentDateTime = new Date().toString();
            this.atom.reportChanged();
        };
        Clock.prototype.startTicking = function () {
            var _this = this;
            console.log("start ticking");
            this.tick();
            this.intervalHandler = setInterval(function () { return _this.tick(); }, 1 * time_factor);
        };
        Clock.prototype.stopTicking = function () {
            console.log("stop ticking");
            clearInterval(this.intervalHandler);
            this.intervalHandler = null;
        };
        return Clock;
    }());
    var clock = new Clock();
    var values = [];
    // ... prints the time each second
    var disposer = mobx_1.autorun(function () {
        values.push(clock.getTime());
        console.log(clock.getTime());
    });
    // printing stops. If nobody else uses the same `clock` the clock will stop ticking as well.
    setTimeout(disposer, 4.5 * time_factor);
    setTimeout(function () {
        t.equal(ticks, 5);
        t.equal(values.length, 5);
        t.equal(values.filter(function (x) { return x.length > 0; }).length, 5);
        t.end();
    }, 10 * time_factor);
});
test('typescript: parameterized computed decorator', function (t) {
    var TestClass = (function () {
        function TestClass() {
            this.x = 3;
            this.y = 3;
        }
        Object.defineProperty(TestClass.prototype, "boxedSum", {
            get: function () {
                return { sum: Math.round(this.x) + Math.round(this.y) };
            },
            enumerable: true,
            configurable: true
        });
        __decorate([
            mobx_1.observable
        ], TestClass.prototype, "x", void 0);
        __decorate([
            mobx_1.observable
        ], TestClass.prototype, "y", void 0);
        __decorate([
            mobx_1.computed.struct
        ], TestClass.prototype, "boxedSum", null);
        return TestClass;
    }());
    var t1 = new TestClass();
    var changes = [];
    var d = mobx_1.autorun(function () { return changes.push(t1.boxedSum); });
    t1.y = 4; // change
    t.equal(changes.length, 2);
    t1.y = 4.2; // no change
    t.equal(changes.length, 2);
    mobx_1.transaction(function () {
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
test('issue 165', function (t) {
    function report(msg, value) {
        console.log(msg, ':', value);
        return value;
    }
    var Card = (function () {
        function Card(game, id) {
            this.game = game;
            this.id = id;
        }
        Object.defineProperty(Card.prototype, "isWrong", {
            get: function () {
                return report('Computing isWrong for card ' + this.id, this.isSelected && this.game.isMatchWrong);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Card.prototype, "isSelected", {
            get: function () {
                return report('Computing isSelected for card' + this.id, this.game.firstCardSelected === this || this.game.secondCardSelected === this);
            },
            enumerable: true,
            configurable: true
        });
        __decorate([
            mobx_1.computed
        ], Card.prototype, "isWrong", null);
        __decorate([
            mobx_1.computed
        ], Card.prototype, "isSelected", null);
        return Card;
    }());
    var Game = (function () {
        function Game() {
            this.firstCardSelected = null;
            this.secondCardSelected = null;
        }
        Object.defineProperty(Game.prototype, "isMatchWrong", {
            get: function () {
                return report('Computing isMatchWrong', this.secondCardSelected !== null && this.firstCardSelected.id !== this.secondCardSelected.id);
            },
            enumerable: true,
            configurable: true
        });
        __decorate([
            mobx_1.observable
        ], Game.prototype, "firstCardSelected", void 0);
        __decorate([
            mobx_1.observable
        ], Game.prototype, "secondCardSelected", void 0);
        __decorate([
            mobx_1.computed
        ], Game.prototype, "isMatchWrong", null);
        return Game;
    }());
    var game = new Game();
    var card1 = new Card(game, 1), card2 = new Card(game, 2);
    mobx_1.autorun(function () {
        console.log('card1.isWrong =', card1.isWrong);
        console.log('card2.isWrong =', card2.isWrong);
        console.log('------------------------------');
    });
    console.log('Selecting first card');
    game.firstCardSelected = card1;
    console.log('Selecting second card');
    game.secondCardSelected = card2;
    t.equal(card1.isWrong, true);
    t.equal(card2.isWrong, true);
    t.end();
});
test('issue 191 - shared initializers (ts)', function (t) {
    var Test = (function () {
        function Test() {
            this.obj = { a: 1 };
            this.array = [2];
        }
        __decorate([
            mobx_1.observable
        ], Test.prototype, "obj", void 0);
        __decorate([
            mobx_1.observable
        ], Test.prototype, "array", void 0);
        return Test;
    }());
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
    t.deepEqual(t1.array.slice(), [2, 3]);
    t.deepEqual(t2.array.slice(), [2, 4]);
    t.end();
});
function normalizeSpyEvents(events) {
    events.forEach(function (ev) {
        delete ev.fn;
        delete ev.time;
    });
    return events;
}
test("action decorator (typescript)", function (t) {
    var Store = (function () {
        function Store(multiplier) {
            this.multiplier = multiplier;
        }
        Store.prototype.add = function (a, b) {
            return (a + b) * this.multiplier;
        };
        __decorate([
            mobx_1.action
        ], Store.prototype, "add", null);
        return Store;
    }());
    var store1 = new Store(2);
    var store2 = new Store(3);
    var events = [];
    var d = mobx_1.spy(events.push.bind(events));
    t.equal(store1.add(3, 4), 14);
    t.equal(store2.add(2, 2), 12);
    t.equal(store1.add(1, 1), 4);
    t.deepEqual(normalizeSpyEvents(events), [
        { arguments: [3, 4], name: "add", spyReportStart: true, target: store1, type: "action" },
        { spyReportEnd: true },
        { arguments: [2, 2], name: "add", spyReportStart: true, target: store2, type: "action" },
        { spyReportEnd: true },
        { arguments: [1, 1], name: "add", spyReportStart: true, target: store1, type: "action" },
        { spyReportEnd: true }
    ]);
    d();
    t.end();
});
test("custom action decorator (typescript)", function (t) {
    var Store = (function () {
        function Store(multiplier) {
            this.multiplier = multiplier;
        }
        Store.prototype.add = function (a, b) {
            return (a + b) * this.multiplier;
        };
        __decorate([
            mobx_1.action("zoem zoem")
        ], Store.prototype, "add", null);
        return Store;
    }());
    var store1 = new Store(2);
    var store2 = new Store(3);
    var events = [];
    var d = mobx_1.spy(events.push.bind(events));
    t.equal(store1.add(3, 4), 14);
    t.equal(store2.add(2, 2), 12);
    t.equal(store1.add(1, 1), 4);
    t.deepEqual(normalizeSpyEvents(events), [
        { arguments: [3, 4], name: "zoem zoem", spyReportStart: true, target: store1, type: "action" },
        { spyReportEnd: true },
        { arguments: [2, 2], name: "zoem zoem", spyReportStart: true, target: store2, type: "action" },
        { spyReportEnd: true },
        { arguments: [1, 1], name: "zoem zoem", spyReportStart: true, target: store1, type: "action" },
        { spyReportEnd: true }
    ]);
    d();
    t.end();
});
test("action decorator on field (typescript)", function (t) {
    var Store = (function () {
        function Store(multiplier) {
            var _this = this;
            this.multiplier = multiplier;
            this.add = function (a, b) {
                return (a + b) * _this.multiplier;
            };
        }
        __decorate([
            mobx_1.action
        ], Store.prototype, "add", void 0);
        return Store;
    }());
    var store1 = new Store(2);
    var store2 = new Store(7);
    var events = [];
    var d = mobx_1.spy(events.push.bind(events));
    t.equal(store1.add(3, 4), 14);
    t.equal(store2.add(4, 5), 63);
    t.equal(store1.add(2, 2), 8);
    t.deepEqual(normalizeSpyEvents(events), [
        { arguments: [3, 4], name: "add", spyReportStart: true, target: store1, type: "action" },
        { spyReportEnd: true },
        { arguments: [4, 5], name: "add", spyReportStart: true, target: store2, type: "action" },
        { spyReportEnd: true },
        { arguments: [2, 2], name: "add", spyReportStart: true, target: store1, type: "action" },
        { spyReportEnd: true }
    ]);
    d();
    t.end();
});
test("custom action decorator on field (typescript)", function (t) {
    var Store = (function () {
        function Store(multiplier) {
            var _this = this;
            this.multiplier = multiplier;
            this.add = function (a, b) {
                return (a + b) * _this.multiplier;
            };
        }
        __decorate([
            mobx_1.action("zoem zoem")
        ], Store.prototype, "add", void 0);
        return Store;
    }());
    var store1 = new Store(2);
    var store2 = new Store(7);
    var events = [];
    var d = mobx_1.spy(events.push.bind(events));
    t.equal(store1.add(3, 4), 14);
    t.equal(store2.add(4, 5), 63);
    t.equal(store1.add(2, 2), 8);
    t.deepEqual(normalizeSpyEvents(events), [
        { arguments: [3, 4], name: "zoem zoem", spyReportStart: true, target: store1, type: "action" },
        { spyReportEnd: true },
        { arguments: [4, 5], name: "zoem zoem", spyReportStart: true, target: store2, type: "action" },
        { spyReportEnd: true },
        { arguments: [2, 2], name: "zoem zoem", spyReportStart: true, target: store1, type: "action" },
        { spyReportEnd: true }
    ]);
    d();
    t.end();
});
test("267 (typescript) should be possible to declare properties observable outside strict mode", function (t) {
    mobx_1.useStrict(true);
    var Store = (function () {
        function Store() {
        }
        __decorate([
            mobx_1.observable
        ], Store.prototype, "timer", void 0);
        return Store;
    }());
    mobx_1.useStrict(false);
    t.end();
});
test("288 atom not detected for object property", function (t) {
    var Store = (function () {
        function Store() {
            this.foo = '';
        }
        __decorate([
            mobx_1.observable
        ], Store.prototype, "foo", void 0);
        return Store;
    }());
    var store = new Store();
    mobx.observe(store, 'foo', function () {
        console.log('Change observed');
    }, true);
    t.end();
});
test("observable performance", function (t) {
    var AMOUNT = 100000;
    var A = (function () {
        function A() {
            this.a = 1;
            this.b = 2;
            this.c = 3;
        }
        Object.defineProperty(A.prototype, "d", {
            get: function () {
                return this.a + this.b + this.c;
            },
            enumerable: true,
            configurable: true
        });
        __decorate([
            mobx_1.observable
        ], A.prototype, "a", void 0);
        __decorate([
            mobx_1.observable
        ], A.prototype, "b", void 0);
        __decorate([
            mobx_1.observable
        ], A.prototype, "c", void 0);
        __decorate([
            mobx_1.computed
        ], A.prototype, "d", null);
        return A;
    }());
    var objs = [];
    var start = Date.now();
    for (var i = 0; i < AMOUNT; i++)
        objs.push(new A());
    console.log("created in ", Date.now() - start);
    for (var j = 0; j < 4; j++) {
        for (var i = 0; i < AMOUNT; i++) {
            var obj = objs[i];
            obj.a += 3;
            obj.b *= 4;
            obj.c = obj.b - obj.a;
            obj.d;
        }
    }
    console.log("changed in ", Date.now() - start);
    t.end();
});
test("unbound methods", function (t) {
    var A = (function () {
        function A() {
            // per instance
            this.m2 = function () { };
        }
        // shared across all instances
        A.prototype.m1 = function () {
        };
        __decorate([
            mobx_1.action
        ], A.prototype, "m1", null);
        __decorate([
            mobx_1.action
        ], A.prototype, "m2", void 0);
        return A;
    }());
    var a1 = new A();
    var a2 = new A();
    t.equal(a1.m1, a2.m1);
    t.notEqual(a1.m2, a2.m2);
    t.equal(a1.hasOwnProperty("m1"), false);
    t.equal(a1.hasOwnProperty("m2"), true);
    t.equal(a2.hasOwnProperty("m1"), false);
    t.equal(a2.hasOwnProperty("m2"), true);
    t.end();
});
test("inheritance", function (t) {
    var A = (function () {
        function A() {
            this.a = 2;
        }
        __decorate([
            mobx_1.observable
        ], A.prototype, "a", void 0);
        return A;
    }());
    var B = (function (_super) {
        __extends(B, _super);
        function B() {
            _super.apply(this, arguments);
            this.b = 3;
        }
        Object.defineProperty(B.prototype, "c", {
            get: function () {
                return this.a + this.b;
            },
            enumerable: true,
            configurable: true
        });
        __decorate([
            mobx_1.observable
        ], B.prototype, "b", void 0);
        __decorate([
            mobx_1.computed
        ], B.prototype, "c", null);
        return B;
    }(A));
    var b1 = new B();
    var b2 = new B();
    var values = [];
    mobx.autorun(function () { return values.push(b1.c + b2.c); });
    b1.a = 3;
    b1.b = 4;
    b2.b = 5;
    b2.a = 6;
    t.deepEqual(values, [
        10,
        11,
        12,
        14,
        18
    ]);
    t.end();
});
test("inheritance overrides observable", function (t) {
    var A = (function () {
        function A() {
            this.a = 2;
        }
        __decorate([
            mobx_1.observable
        ], A.prototype, "a", void 0);
        return A;
    }());
    var B = (function () {
        function B() {
            this.a = 5;
            this.b = 3;
        }
        Object.defineProperty(B.prototype, "c", {
            get: function () {
                return this.a + this.b;
            },
            enumerable: true,
            configurable: true
        });
        __decorate([
            mobx_1.observable
        ], B.prototype, "a", void 0);
        __decorate([
            mobx_1.observable
        ], B.prototype, "b", void 0);
        __decorate([
            mobx_1.computed
        ], B.prototype, "c", null);
        return B;
    }());
    var b1 = new B();
    var b2 = new B();
    var values = [];
    mobx.autorun(function () { return values.push(b1.c + b2.c); });
    b1.a = 3;
    b1.b = 4;
    b2.b = 5;
    b2.a = 6;
    t.deepEqual(values, [
        16,
        14,
        15,
        17,
        18
    ]);
    t.end();
});
test("reusing initializers", function (t) {
    var A = (function () {
        function A() {
            this.a = 3;
            this.b = this.a + 2;
        }
        Object.defineProperty(A.prototype, "c", {
            get: function () {
                return this.a + this.b;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(A.prototype, "d", {
            get: function () {
                return this.c + 1;
            },
            enumerable: true,
            configurable: true
        });
        __decorate([
            mobx_1.observable
        ], A.prototype, "a", void 0);
        __decorate([
            mobx_1.observable
        ], A.prototype, "b", void 0);
        __decorate([
            mobx_1.computed
        ], A.prototype, "c", null);
        __decorate([
            mobx_1.computed
        ], A.prototype, "d", null);
        return A;
    }());
    var a = new A();
    var values = [];
    mobx.autorun(function () { return values.push(a.d); });
    a.a = 4;
    t.deepEqual(values, [
        9,
        10
    ]);
    t.end();
});
test("enumerability", function (t) {
    debugger;
    var A = (function () {
        function A() {
            this.a = 1; // enumerable, on proto
            this.m2 = function () { }; // non-enumerable, on self
        }
        Object.defineProperty(A.prototype, "b", {
            get: function () { return this.a; } // non-enumerable, on proto
            ,
            enumerable: true,
            configurable: true
        });
        A.prototype.m = function () { }; // non-enumerable, on proto
        __decorate([
            mobx_1.observable
        ], A.prototype, "a", void 0);
        __decorate([
            // enumerable, on proto
            mobx_1.computed
        ], A.prototype, "b", null);
        __decorate([
            // non-enumerable, on proto
            mobx_1.action
        ], A.prototype, "m", null);
        __decorate([
            // non-enumerable, on proto
            mobx_1.action
        ], A.prototype, "m2", void 0);
        return A;
    }());
    var a = new A();
    // not initialized yet
    var ownProps = Object.keys(a);
    var props = [];
    for (var key in a)
        props.push(key);
    t.deepEqual(ownProps, [
        "a" // yeej!
    ]);
    t.deepEqual(props, [
        "a"
    ]);
    t.equal("a" in a, true);
    t.equal(a.hasOwnProperty("a"), true);
    t.equal(a.hasOwnProperty("b"), false);
    t.equal(a.hasOwnProperty("m"), false);
    t.equal(a.hasOwnProperty("m2"), false); // false would be ok as well?
    t.equal(mobx.isAction(a.m), true);
    t.equal(mobx.isAction(a.m2), true);
    // after initialization
    a.a;
    a.b;
    a.m;
    a.m2;
    ownProps = Object.keys(a);
    props = [];
    for (var key in a)
        props.push(key);
    t.deepEqual(ownProps, [
        "a"
    ]);
    t.deepEqual(props, [
        "a"
    ]);
    t.equal("a" in a, true);
    t.equal(a.hasOwnProperty("a"), true);
    t.equal(a.hasOwnProperty("b"), false);
    t.equal(a.hasOwnProperty("m"), false);
    t.equal(a.hasOwnProperty("m2"), true);
    t.end();
});
test("issue 285 (babel)", function (t) {
    var observable = mobx.observable, toJS = mobx.toJS;
    var Todo = (function () {
        function Todo(title) {
            this.id = 1;
            this.finished = false;
            this.childThings = [1, 2, 3];
            this.title = title;
        }
        __decorate([
            observable
        ], Todo.prototype, "title", void 0);
        __decorate([
            observable
        ], Todo.prototype, "finished", void 0);
        __decorate([
            observable
        ], Todo.prototype, "childThings", void 0);
        return Todo;
    }());
    var todo = new Todo("Something to do");
    t.deepEqual(toJS(todo), {
        id: 1,
        title: "Something to do",
        finished: false,
        childThings: [1, 2, 3]
    });
    t.end();
});
test("verify object assign (typescript)", function (t) {
    var Todo = (function () {
        function Todo() {
            this.title = "test";
        }
        Object.defineProperty(Todo.prototype, "upperCase", {
            get: function () {
                return this.title.toUpperCase();
            },
            enumerable: true,
            configurable: true
        });
        __decorate([
            mobx_1.observable
        ], Todo.prototype, "title", void 0);
        __decorate([
            mobx_1.computed
        ], Todo.prototype, "upperCase", null);
        return Todo;
    }());
    t.deepEqual(Object.assign({}, new Todo()), {
        title: "test"
    });
    t.end();
});
test("379, inheritable actions (typescript)", function (t) {
    var A = (function () {
        function A() {
        }
        A.prototype.method = function () {
            return 42;
        };
        __decorate([
            mobx_1.action
        ], A.prototype, "method", null);
        return A;
    }());
    var B = (function (_super) {
        __extends(B, _super);
        function B() {
            _super.apply(this, arguments);
        }
        B.prototype.method = function () {
            return _super.prototype.method.call(this) * 2;
        };
        __decorate([
            mobx_1.action
        ], B.prototype, "method", null);
        return B;
    }(A));
    var C = (function (_super) {
        __extends(C, _super);
        function C() {
            _super.apply(this, arguments);
        }
        C.prototype.method = function () {
            return _super.prototype.method.call(this) + 3;
        };
        __decorate([
            mobx_1.action
        ], C.prototype, "method", null);
        return C;
    }(B));
    var b = new B();
    t.equal(b.method(), 84);
    t.equal(mobx_1.isAction(b.method), true);
    var a = new A();
    t.equal(a.method(), 42);
    t.equal(mobx_1.isAction(a.method), true);
    var c = new C();
    t.equal(c.method(), 87);
    t.equal(mobx_1.isAction(c.method), true);
    t.end();
});
test("379, inheritable actions - 2 (typescript)", function (t) {
    var A = (function () {
        function A() {
        }
        A.prototype.method = function () {
            return 42;
        };
        __decorate([
            mobx_1.action("a method")
        ], A.prototype, "method", null);
        return A;
    }());
    var B = (function (_super) {
        __extends(B, _super);
        function B() {
            _super.apply(this, arguments);
        }
        B.prototype.method = function () {
            return _super.prototype.method.call(this) * 2;
        };
        __decorate([
            mobx_1.action("b method")
        ], B.prototype, "method", null);
        return B;
    }(A));
    var C = (function (_super) {
        __extends(C, _super);
        function C() {
            _super.apply(this, arguments);
        }
        C.prototype.method = function () {
            return _super.prototype.method.call(this) + 3;
        };
        __decorate([
            mobx_1.action("c method")
        ], C.prototype, "method", null);
        return C;
    }(B));
    var b = new B();
    t.equal(b.method(), 84);
    t.equal(mobx_1.isAction(b.method), true);
    var a = new A();
    t.equal(a.method(), 42);
    t.equal(mobx_1.isAction(a.method), true);
    var c = new C();
    t.equal(c.method(), 87);
    t.equal(mobx_1.isAction(c.method), true);
    t.end();
});
test("373 - fix isObservable for unused computed", function (t) {
    var Bla = (function () {
        function Bla() {
            t.equal(mobx_1.isObservable(this, "computedVal"), true);
            this.computedVal;
            t.equal(mobx_1.isObservable(this, "computedVal"), true);
        }
        Object.defineProperty(Bla.prototype, "computedVal", {
            get: function () { return 3; },
            enumerable: true,
            configurable: true
        });
        __decorate([
            mobx_1.computed
        ], Bla.prototype, "computedVal", null);
        return Bla;
    }());
    new Bla();
    t.end();
});
test("505, don't throw when accessing subclass fields in super constructor (typescript)", function (t) {
    var values = {};
    var A = (function () {
        function A() {
            this.a = 1;
            values.b = this['b'];
            values.a = this.a;
        }
        __decorate([
            mobx_1.observable
        ], A.prototype, "a", void 0);
        return A;
    }());
    var B = (function (_super) {
        __extends(B, _super);
        function B() {
            _super.apply(this, arguments);
            this.b = 2;
        }
        __decorate([
            mobx_1.observable
        ], B.prototype, "b", void 0);
        return B;
    }(A));
    new B();
    t.deepEqual(values, { a: 1, b: undefined }); // undefined, as A constructor runs before B constructor
    t.end();
});
test('computed getter / setter for plan objects should succeed (typescript)', function (t) {
    var b = mobx_1.observable({
        a: 3,
        get propX() { return this.a * 2; },
        set propX(v) { this.a = v; }
    });
    var values = [];
    mobx.autorun(function () { return values.push(b.propX); });
    t.equal(b.propX, 6);
    b.propX = 4;
    t.equal(b.propX, 8);
    t.deepEqual(values, [6, 8]);
    t.end();
});
test("484 - observable objects are IObservableObject", function (t) {
    var needs_observable_object = function (o) { return null; };
    var o = mobx_1.observable({ stuff: "things" });
    needs_observable_object(o);
    t.pass();
    t.end();
});
test("484 - observable objects are still type T", function (t) {
    var o = mobx_1.observable({ stuff: "things" });
    o.stuff = "new things";
    t.pass();
    t.end();
});
test("484 - isObservableObject type guard includes type T", function (t) {
    var o = mobx_1.observable({ stuff: "things" });
    if (mobx_1.isObservableObject(o)) {
        o.stuff = "new things";
        t.pass();
    }
    else {
        t.fail("object should have been observable");
    }
    t.end();
});
test("484 - isObservableObject type guard includes type IObservableObject", function (t) {
    var requires_observable_object = function (o) { return null; };
    var o = mobx_1.observable({ stuff: "things" });
    if (mobx_1.isObservableObject(o)) {
        requires_observable_object(o);
        t.pass();
    }
    else {
        t.fail("object should have been IObservableObject");
    }
    t.end();
});
