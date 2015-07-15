# MOBservable

[![Build Status](https://travis-ci.org/mweststrate/MOBservable.svg?branch=master)](https://travis-ci.org/mweststrate/MOBservable)
[![Coverage Status](https://coveralls.io/repos/mweststrate/MOBservable/badge.svg?branch=master)](https://coveralls.io/r/mweststrate/MOBservable)

Installation: `npm install mobservable --save`

MOBservable is light-weight standalone transparent reactive programming library to create Reactive primitives, functions, arrays and objects.

Its goal is to make developers happy and productive by removing boilerplate work such as invalidating derived data or managing event listeners. 
It makes sure data changes are automatically, atomically and synchronously propagated through your app without being obtrusive.
MOBservable runs in any ES5 environment but features also some React add-ons.
It is highly efficient and shines when managing large amounts of complex, cyclic, nested or computed data.

Some links that may be interesting:

* [Slack group](https://mobservable.slack.com)
* [Blog post: combining React with MOBservable to create high performing and easily maintainable apps](https://www.mendix.com/tech-blog/making-react-reactive-pursuit-high-performing-easily-maintainable-react-apps/) 
* [Examples](#examples)
* [Design principles](#design-principles)
* [API documentation](#api-documentation)
* [Advanced Tips & Tricks](#advanced-tips--tricks)


# Examples

* [TodoMVC in Mobservable + React](https://rawgit.com/mweststrate/todomvc/immutable-to-observable/examples/react-mobservable/index.html#/), ... and the [diff](https://github.com/mweststrate/todomvc/commit/2e30caeb8c690c914f92081ac01d12097a068a1e) of using observables with react instead of immutables.
* [Fiddle demo: MOBservable + React: simple timer](https://jsfiddle.net/mweststrate/wgbe4guu/)
* [Fiddle demo: MOBservable + React: shop](https://jsfiddle.net/mweststrate/46vL0phw)
* [Fiddle demo: MOBservable + JQuery: shop](http://jsfiddle.net/mweststrate/vxn7qgdw)

The source of all demos can also be found in the [example](/example) folder.

## Example: Observable values and functions

The core of `MOBservable` consists of observable values, i.e. functions that automatically recompute when an observed value changes, 
and the possibility to listen to changing values and updated computations.

```javascript
var nrOfCatz = mobservable(3);
var nrOfDogs = mobservable(8);

// Create a function that automatically observes values:
var nrOfAnimals = mobservable(function() {
    // calling an mobservable without arguments acts as getter
    return nrOfCatz() * nrOfDogs();
});

// Print a message whenever the observable changes:
nrOfAnimals.observe(function(amount) {
    console.log("Total: " + amount);
}, true);
// -> Prints: "Total: 11"

// Calling an mobservable with a value acts as setter, 
// ...and automatically updates all computations in which it was used
nrOfCatz(34);
// -> Prints: "Total: 42"
```

## Example: Observable objects & properties

By using `.props`, it is possible to create observable values and functions that can be assigned or read as normal properties. 

```javascript
var Person = function(firstName, lastName) {
    // Define the observable properties firstName, lastName and fullName on 'this':
    mobservable.props(this, {
        firstName: firstName,
        lastName: lastName,
        fullName: function() {
            return this.firsName + " " + this.lastName;
        }
    });
}

var jane = new Person("Jane","Dôh");

// (Computed) Properties can be accessed like any other property:
console.log(jane.fullName);
// prints: "Jan Dôh"

// Properties can be observed as well:
mobsevable.observeProperty(jane, "fullName", console.log);

// values can be assigned directly to observable properties
jane.lastName = "Do";
// prints: "Jane Do"
```

## Example: Observable arrays

`mobservable` provides an observable array implementation (as ES7 polyfill) which is fully ES5 compliant but which will notify dependent computations upon each change.

```javascript
// Create an array, that works by all means as a normal array, except that it is observable!
var someNumbers = mobservable.value([1,2,3]);

// A naive function that sums all the values:
var sum = mobservable.value(function() {
    for(var s = 0, i = 0; i < someNumbers.length; i++)
        s += someNumbers[i];
    return s;
});
sum.observe(console.log);

someNumbers.push(4);
// Prints: 10
someNumbers[2] = 0;
// Prints: 7
someNumbers[someNumbers.length] = 5;
// Prints: 12
```

## Example: TypeScript classes and annotations

For TypeScript users, `mobservable` ships with module typings and an `@observable` annotation with which class members can be marked as observable.

```typescript
/// <reference path="./node_modules/mobservable/mobservable.d.ts"/>
import {observable, sideEffect} from "mobservable";

class Order {
    @observable orderLines: OrderLine[] = [];
    @observable get total() {
        return this.orderLines.reduce((sum, orderLine) => sum + orderLine.total, 0)
    }
}

class OrderLine {
    @observable price:number = 0;
    @observable amount:number = 1;

    constructor(price) {
        this.price = price;
    }

    @observable get total() {
        return "Total: " + this.price * this.amount;
    }
}

var order1 = new Order();
sideEffect(() => console.log("Total: " + order1.total));

order1.orderLines.push(new OrderLine(7));
// Prints: Total: 7
order1.orderLines.push(new OrderLine(12));
// Prints: Total: 12
order1.orderLines[0].amount = 3;
// Prints: Total: 33
```

## Example: ObservingComponent for React components

MOBservable ships with a mixin and class decorator that can be used to subscribe React components to observables automatically.
The full JSX example can be found in this [fjsiddle](https://jsfiddle.net/mweststrate/wgbe4guu/)

```javascript
        var store = {};
        // Add observable properties to the store:
        mobservable.props(store, {
            timer: 0 // this could be an array, object, function as well..
        });
        
        // of course, this could be put flux-style in dispatchable actions, but this is just to demo Model -> View
        function resetTimer() {
            store.timer = 0;
        }
        
        setInterval(function() {
            store.timer += 1;
        }, 1000);
                
        // This component is actually an observer of all store properties that are accessed during the last rendering
        // so there is no need to declare any data use, nor is there (seemingly) any state in this component
        // the combination of mobservable.props and ObservingComponent does all the magic for us.
        // UI updates are nowhere forced, but all views (un)subscribe to their data automatically
        var TimerView = mobservable.ObservingComponent(React.createClass({
            render: function() {
                return (<span>Seconds passed: {this.props.store.timer}</span>);
            }
        }));
        
        var TimerApp = React.createClass({
            render: function() {
                var now = new Date(); // just to demonstrate that TimerView updates independently of TimerApp
                return (<div>
                    <div>Started rendering at: {now.toString()}</div>
                    <TimerView {...this.props} />
                    <br/><button onClick={resetTimer}>Reset timer</button>
                </div>);
            }
        });
        
        // pass in the store to the component tree (you could also access it directly through global vars, whatever suits your style)
        React.render(<TimerApp store={store} />, document.body);
```


# Design principles


## Principles

MOBservable is designed with the following principles in mind.

- The Model, View (and Controller) of an app should be separated.
Views should be loosely coupled to the UI, so that UI refactorings do not require changes of the data model.
It should be possible to describe views on the data model as naturally as possible, as if data does not change over time, or in other words: as a pure function of state.
- Derived data should be re-calculated automatically and efficiently.
It is the responsibility of MOBservable to prevent that views ever become stale.
- MOBservable is unobtrusive and doesnt place any constraints on how you build or work with data structures.
Inheritance, classes, cyclic data structures, or instance methods...? The library does not pose any restrictions on your data.
- Data should be mutable as this is close to the natural mental model of most kinds of data.
<small>Despite some nice properties of immutable data, mutable data is easier to inspect, read, grok and especially more natural to program _explicitly_ against.
`markRead(email) { email.isRead = true; }` is more convenient to write than `markRead(email) { return { ...email, isRead : true }; }` or `markRead(email) { model.set('email', 'isRead', true); }`.
Especially when email is somewhere deep in your model tree.</small>
- Subscriptions should be a breeze to manage, and managed automatically wherever possible.
- MOBservable is only about the model data, not about querying, back-end communication etc. (although observers are really useful there as well).

## Behavior

Observable values, arrays and functions created by `mobservable` possess the following characteristics:

* _synchronous_ - Updates are processed synchronously, that is, the pseudo expressions `a = 3; b -> a * 2; a = 4; print(b); ` will always print `8`; `b` will never yield a stale value.
* _atomic_ - Computed values will postpone updates until all inputs are settled, to make sure no intermediate values are visible. That is, the expression `a = 3; b -> a * 2; c -> a * b; a = 4; print(c)` will always print `32` and no intermediate values like `24`.
* _real time dependency detection_ - Computed values only depend on values actually used in the last computation, for example, given: `a -> b > 5 ? c : b` the variable `c` will only cause a re-evaluation of `a` if `b > 5`. 
* _lazy_ - Computed values will only be evaluated if they are actually being observed. So make sure computed functions are pure and side effect-free; the library might not evaluate expressions as often as you thought it would.
* _cycle detection_ - Cycles in computations, like in `a -> 2 * b; b -> 2 * a;` will be detected.  
* _error handling_ - Exceptions that are raised during computations are propagated to consumers.


# API Documentation

The [Typescript typings](https://github.com/mweststrate/MOBservable/blob/master/mobservable.d.ts) serve as offline API documentation.

## Creating observables

### mobservable

Shorthand for `mobservable.value`.

### mobservable.value

`mobservable.value<T>(value? : T[], scope? : Object) : IObservableArray<T>`

`mobservable.value<T>(value? : T|()=>T, scope? : Object) : IObservableValue<T>`

Creates an observable given a `value`.
Depending on the type of the function, this function invokes `mobservable.array`, `mobservable.computed` or `mobservable.primitive`.
See the examples above for usage patterns.
The `scope` is only meaningful if a function is passed into this method.

### mobservable.primitive

`mobservable.primitive<T>(value? : T) : IObservableValue<T>`

Creates a new observable, initialized with the given `value` that can change over time.
The returned observable is a function that without arguments acts as getter, and with arguments as setter.
Furthermore, its value can be observed using the `.observe` method, see `IObservableValue.observe`.  

Example:
```
var vat = mobservable.primitive(3);
console.log(vat()); // prints '3'
vat.observe(console.log); // register an observer
vat(4); // updates value, also notifies all observers, thus prints '4'
```

### mobservable.reference

`mobservable.reference<T>(value? : T) : IObservableValue<T>`
Synonym for `mobservable.primitive`, since the equality of primitives is determined in the same way as references, namely by strict equality.
(From version 0.6, see `mobservable.struct` if values need to be compared structurally by using deep equality.)

### mobservable.computed

`mobservable.computed<T>(expr : () => T, scope?) : IObservableValue<T>`

Turns a function into an observable value.
The provided `expr` should not have any arguments, but instead rely on other observables that are in scope to determine its value.
The latest value returned by `expr` determines the value of the observable.
When one of the observables used in `expr` changes, `computed` will make sure that the function gets re-evaluated, and all updates are propagated to the children.

```javascript
    var amount = mobservable(3);
    var price = mobservable(2);
    var total = mobservable.computed(function() {
        return amount() * price();
    });
    console.log(total()); // gets the current value, prints '6'
    total.observe(console.log); // attach listener
    amount(4); // update amount, total gets re-evaluated automatically and will print '8'
    amount(4); // update amount, but total will not be re-evaluated since the value didn't change
```

The optional `scope` parameter defines `this` context during the evaluation of `expr`. 

`computed` will try to reduce the amount of re-evaluates of `expr` as much as possible.
For that reason the function *should* be pure, that is:

* The result of `expr` should only be defined in terms of other observables, and not depend on any other state.
* Your code shouldn't rely on any side-effects, triggered by `expr`; `expr` should be side-effect free.
* The result of `expr` should always be the same if none of the observed observables did change.

It is not allowed for `expr` to have an (implicit) dependency on its own value.

It is allowed to throw exceptions in an observed function.
The thrown exceptions might only be detected late.
The exception will be re-thrown if somebody inspects the current value, and will be passed as first callback argument
to all the listeners.

### mobservable.expr

`mobservable.expr<T>(expr : ()=>T, scope?) : T`

This function is simply sugar for `mobservable.computed(expr, scope)();`. 
`expr` can be used to split up and improve the performance of expensive computations,
as described in this [section](#use-nested-observables-in-expensive-computations).

### mobservable.sideEffect
`mobservable.sideEffect(func:() => void, scope?): ()=>void`

Use this function if you have a function which should produce side effects, even if it is not observed itself.
This is useful for logging, storage backend interaction etc.
Use it whenever you need to transfer observable data to things that don't know how to observe. 
`sideEffect` returns a function that can be used to prevent the sideEffect from being triggered in the future.

```javascript
var x = mobservable(3);
var x2 = mobservable(function() {
    return x() * 2;
});

mobservable.sideEffect(function() {
    storeInDatabase(x2());
    console.log(x2());
});
x(7);
// prints 14
```

### mobservable.array

`mobservable.array<T>(values? : T[]) : IObservableArray<T>`

**Note: ES5 environments only**

Constructs an array like, observable structure.
An observable array is a thin abstraction over native arrays and adds observable properties.
The most notable difference between built-in arrays is that these arrays cannot be sparse, i.e. values assigned to an index larger than `length` are considered out-of-bounds and not observed (nor any other property that is assigned to a non-numeric pr negative index).

Furthermore, `Array.isArray(observableArray)` and `typeof observableArray === "array"` will yield `false` for observable arrays, but `observableArray instanceof Array` will return `true`.

```javascript
var numbers = mobservable.array([1,2,3]);
var sum = mobservable.value(function() {
    return numbers.reduce(function(a, b) { return a + b }, 0);
});
sum.observe(function(s) { console.log(s); });

numbers[3] = 4;
// prints 10
numbers.push(5,6);
// prints 21
numbers.unshift(10);
// prints 31
```

Observable arrays implement all the ES5 array methods. Besides those, the following methods are available as well:

* `observe(listener:(changeData:IArrayChange<T>|IArraySplice<T>)=>void, fireImmediately?:boolean):Lambda` Listen to changes in this array. The callback will receive arguments that express an array splice or array change, conforming to [ES7 proposal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe)
* `clear(): T[]` Remove all current entries from the array.
* `replace(newItems:T[])` Replaces all existing entries in the array with new ones.
* `values(): T[]` Returns a shallow, non-observable clone of the array, similar to `.slice`.
* `clone(): IObservableArray<T>` Create a new observable array containing the same values.
* `find(predicate:(item:T,index:number,array:IObservableArray<T>)=>boolean,thisArg?,fromIndex?:number):T` Find implementation, basically the same as the ES7 Array.find proposal, but with added `fromIndex` parameter.
* `remove(value:T):boolean` Remove a single item by value from the array. Returns true if the item was found and removed.

### mobservable.props

```typescript
props(target:Object, name:string, initialValue: any):Object;
props(target:Object, props:Object):Object;
props(target:Object):Object;
``` 
**Note: ES5 environments only**

Creates observable properties on the given `target` object.
This function uses `mobservable.value` internally to create observables.
Creating properties has as advantage that they are more convenient to use; see also [value versus props](#value-versus-props).
The original `target`, with the added properties, is returned by this function.
Functions used to created computed observables will automatically be bound to the correct `this`.

```javascript
var order = {};
mobservable.props(order, {
    amount: 3,
    price: 5,
    total: function() {
        return this.amount * this.price; // note that no setters are needed
    }
});
order.amount = 4;
console.log(order.total); // Prints '20'
```

Note that observables created by `mobservable.props` do not expose an `.observe` method; to observe properties, see [`mobservable.observeProperty`](#mobservableobserveproperty).

Other forms in which this function can be used:
```javascript
mobservable.props(order, "price", 3); // equivalent to mobservable.props(order, { price: 3 });
var order = mobservable.props({ price: 3}); // uses the original object as target, that is, all values in it are replaced by their observable counterparts
```

### mobservable.observable annotation

**Note: ES5, TypeScript 1.5+ environments only**

Typescript 1.5 introduces annotations.
The `mobservable.observable` annotation can be used to mark class properties and functions as observable.
This annotations basically wraps `mobservable.props`. Example:

```typescript
/// <reference path='./node_modules/mobservable/mobservable.d.ts'/>
import {observable} from 'mobservable';

class Order {
    @observable price:number = 3;
    @observable amount:number = 2;
    @observable orders = [];

    @observable get total() {
        return this.amount * this.price * (1 + orders.length);
    }
}
```

Please note that adding the `@observable` annotations to a function does not result in an observable property (as would be the case when using `props`) but in an observable function,
to make sure the compile time type matches the runtime type of the function.
In most cases you probably want to annotate a getter instead.

## Observing changes

### mobservable.observeProperty
`mobservable.observeProperty(object : Object, key : string, listener : Function, invokeImmediately : boolean = false) : Function`

Observes the observable property `key` of `object`.
This is useful if you want to observe properties created using the `observable` annotation or the `props` method,  since for those properties their own `observe` method is not publicly available.

```javascript
function OrderLine(price) {
    mobservable.props(this, {
        price: price,
        amount: 2,
        total: function() {
            return this.price * this.amount;
        }
    });
}

var orderLine = new OrderLine(5);
mobservable.observeProperty(order, 'total', console.log, true); // Prints: '10'
```

### mobservable.watch
`mobservable.watch<T>(func: () => T, onInvalidate : Function) : [T, Function];`

`watch` is quite similar to `mobservable.computed`, but instead of re-evaluating `func` when one of its dependencies has changed, the `onInvalidate` function is triggered. 
So `func` will be evaluated only once, and as soon as its value has become stale, the `onInvalidate` callback is triggered. 
`watch` returns a tuple consisting of the initial return value of `func` and an `unsubscriber` to be able to abort the watch.
The `onInvalidate` function will be called only once, after that, the watch has finished.

`watch` is useful in functions where you want to have a function that responds to change, but where the function is actually invoked as side effect or as part of a bigger change flow or where unnecessary recalculations of `func` or either pointless or expensive, e.g. in the `render` method of a React component.

### mobservable.batch

`mobservable.batch<T>(workerFunction : ()=>T):T` 

Batch postpones the updates of computed properties until the (synchronous) `workerFunction` has completed. 
This is useful if you want to apply a bunch of different updates throughout your model before needing the updated computed values, e.g. while refreshing a data from the database.
In practice, you wil probably never need `.batch`, since observables typically update wickedly fast.

```javascript
var amount = mobservable(3);
var price = mobservable(2.5);
var total = mobservable(function() {
    return amount() * price(); 
});
total.observe(console.log);

// without batch:
amount(2); // Prints 5
price(3); // Prints 6

// with batch:
mobservable.batch(function() {
    amount(3);
    price(4);
});
// Prints 12, after completing the batch
``` 

## Utilities

### mobservable.toPlainValue
`mobservable.toPlainValue<T>(any:T):T;` 

Converts a (possibly) observable value into a non-observablue value.
For non-primitive values, this function will always return a shallow copy.

### mobservable.ObserverMixin

The observer mixin can be used in [React](https://facebook.github.io/react/index.html) components.
This mixin basically turns the `.render` function of the component into an observable function, and makes sure that the component itself becomes an observer of that function,  that the component is re-rendered each time an observable has changed.
This mixin also prevents re-renderings when the *props* of the component have only shallowly changed.
(This is similar to [React PureRender mixin](https://facebook.github.io/react/docs/pure-render-mixin.html), except that *state* changes are still always processed). 
This allows for React apps that perform well in apps with large amount of complex data, while avoiding the need to manage a lot of subscriptions.

See the [above example](#example_observingcomponent_for_react_components) or the [JSFiddle demo: MOBservable + React](https://jsfiddle.net/mweststrate/46vL0phw)

For an extensive explanation, read [combing React with MOBservable](https://www.mendix.com/tech-blog/making-react-reactive-pursuit-high-performing-easily-maintainable-react-apps/)

### mobservable.ObservingComponent
`mobservable.ObservingComponent(clazz:ReactComponentClass):ReactComponentClass`

If you want to create a React component based on ES6 where mixins are not supported, you can use the `ObservingComponent` function to wrap around your React `createClass` call (instead of using the mixin `ObserverMixin`):

```javascript
// TODO: change to class
var myComponent = mobservable.ObservingComponent(React.createClass({
    // widget specification without mixins
});
```

### mobservable.debugLevel

Numeric property, setting this to value to '1' or higher will cause additional debug information to be printed.

### mobservable.SimpleEventEmitter
Utility class for managing an event. Its instance methods are:

* `new mobservable.SimpleEventEmitter()` Creates a new `SimpleEventEmitter`.
* `emit(...data : any[])` Invokes all registered listeners with the given arguments.
* `on(listener:(...data : any[]) => void) : () => void` Registers a new callback that will be invoked on each `emit`. Returns a method that can be used to unsubscribe the listener.
* `once(listener:(...data : any[]) => void) : () => void` Similar to `.on`, but automatically removes the listener after one invocation.


# Advanced Tips & Tricks

## How to create lazy values?

All computed values are lazy and only evaluated upon first observation (or when their value is explicitly `get`-ted).

## Use local variables in computations

Each time an observable value is read, there is a small performance overhead to keep the dependency tree of computations up-to-date.
Although this might not be noticeable in practice, if you want to squeeze the last bit of performance out of the library: 
use local variables as much as possible to reduce the amount of observable reads. 
This also holds for array entries and object properties created using `mobservable.props`.

```javascript
var firstName = mobservable('John');
var lastName = mobservable('Do');

// Ok:
var fullName = mobservable(function() {
    if (firstName())
        return lastName() + ", " + firstName(); // another read of firstName..
    return lastName();
}

// Faster:
var fullName = mobservable(function() {
    var first = firstName(), last = lastName();
    if (first)
        return last+ ", " + first;
    return last;
}
```

## Use nested observables in expensive computations

It is perfectly fine to create computed observables inside computed observables.
This is a useful pattern if you have an expensive computation that depends on a condition check that is fired often, but not changed often.
For example when your computation contains a cheap threshold check, or when your UI rendering depends on the some selection of the user.
For example:

```javascript
var person; // ...
var total = mobservable(function() {
    if (person.age === 42)
        doSomeExpensiveComputation();
    else
        doSomeOtherExpensiveComputation();
});
```

In the example above, every single time the person's `age` changes, `total` is computed by invoking some expensive computations.
However, if the expression `page.age === 42` was put in a separate observable, computing the `total` itself could be avoided in many cases because a re-computation would only occur if the value of the complete expression changes.
Yet, you might not want to create separate stand-alone observables for these expressions,  because you don't have a nice place to put them or because it would make the readability of the code worse.
In such cases you can also create an inline observable.   
In the following example, the total is only recalculated if the age changes to, or from, 42.
This means that for most other ages, recomputing the expensive computations can be avoided.

```javascript
var person; // ...
var total = mobservable(function() {
    var ageEquals42 = mobservable(function() { return person.age === 42 })(); // create observable and invoke getter
    if (ageEquals42)
        doSomeExpensiveComputation();
    else
        doSomeOtherExpensiveComputation();
});
```

Note that the dangling `()` (or "dog balls" according to Douglas Crockford) after the expression are meant to invoke the getter of the just created observable to obtain its value.
For convenience the same statement can also be rewritten using the [expr](#mobservableexpr) function:


```javascript
// ...
var ageEquals42 = mobservable.expr(function() { return person.age === 42 });
// ...
```        

## Use native array methods

For performance, use built-in array methods as much as possible; 
a classic array for loop is registered as multiple reads, while a function call is registered as a single read. 
Alternatively, slicing the array before using it will also result in a single read.

```javascript
var numbers = mobservable([1,2,3]);

// Ok:
var sum1 = mobservable(function() {
    var s = 0; 
    for(var i = 0; i < numbers.length; i++) // observable read
        s += numbers[i]; // observable reads
    return s;    
});

// Faster:
var sum2 = mobservable(function() {
    var s = 0, localNumbers = numbers.slice(); // observable read
    for(var i = 0; i < localNumbers.length; i++)
        s += localNumbers[i];
    return s;    
});

// Faster:
var sum2 = mobservable(function() {
    return numbers.reduce(function(a, b) { // single observable read
        return a + b;
    }, 0);
});
``` 
## `.value` versus `.props`

The difference between `obj.amount = mobservable.value(3)` and `mobservable.props(obj, { value: 3 })` to create observable values inside an object might seem to be a matter of taste.
Here is a small comparison list between the two approaches.

**.value**

* ES3 compliant
* explicit getter/setter functions: `obj.amount(2)`
* easy to make mistakes in assignments; e.g. `obj.amount = 3` instead of `obj.amount(3)`, or `7 * obj.amount` instead of `7 * obj.amount()` 
* easy to manually observe: `obj.amount.observe(listener)`

**.props**

* requires ES5
* object properties with implicit getter/setter: `obj.amount = 2`
* more natural to write / read values, syntactically you won't notice they are observable
* harder to manually observe: `mobservable.observeProperty(obj,'amount',listener)`

## `.reference` versus `.array`

Do *not* confuse `mobservable.reference([])` / `mobservable.primitive([])` with `mobservable([])` / `mobservable.array([])`:

* The first two create a observable reference to an array, but do not observe its contents. 
* The later two observe the content of the array you passed into it, which is probably what you intended.

