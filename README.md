# MOBservable

[![Build Status](https://travis-ci.org/mweststrate/MOBservable.svg?branch=master)](https://travis-ci.org/mweststrate/MOBservable)
[![Coverage Status](https://coveralls.io/repos/mweststrate/MOBservable/badge.svg?branch=master)](https://coveralls.io/r/mweststrate/MOBservable)

[![NPM](https://nodei.co/npm/mobservable.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/mobservable/)

Installation: `npm install mobservable --save`

MOBservable is light-weight stand-alone observable implementation, that helps you to create reactive data structures, based on the ideas of observables in bigger frameworks like `knockout`, `ember`, but this time without 'strings attached'. 
MOBservables allows you to observe primitive values, references, functions and arrays and makes sure that all changes in your data are propagated automatically, atomically and synchronously.

# Examples

[Fiddle demo: MOBservable + JQuery](http://jsfiddle.net/mweststrate/vxn7qgdw)
TODO: reacth fiddle url
TODO: blog post url

## Example: Observable values and functions

The core of `MOBservable` consists of observable values, functions that automatically recompute when an observed value changes, 
and the possibility to listen to changing values and updated computations.

```javascript
var mobservable = require('mobservable');

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

// calling an mobservable with a value acts as setter, 
// ...and automatically updates all computations in which it was used
nrOfCatz(34);
// -> Prints: "Total: 42"
```

## Example: Observable objects & properties

By using `.props`, it is possible to create observable values and functions that can be assigned or read as normal properties. 

```javascript
var mobservable = require('mobservable');

var Person = function(firstName, lastName) {
    // define the observable properties firstName, lastName and fullName on 'this'.
    mobservable.props(this, {
        firstName: firstName,
        lastName: lastName,
        fullName: function() {
            return this.firsName + " " + this.lastName;
        }
    });
}

var jane = new Person("Jane","Dôh");

// (computed) properties can be accessed like any other property:
console.log(jan.fullName);
// prints: "Jan Dôh"

// properties can be observed as well:
mobsevable.observeProperty(jane, "fullName", console.log);

// values can be assigned directly to observable properties
jane.lastName = "Do";
// prints: "Jane Do"
```

## Example: Observable arrays

`mobservable` provides an observable array implementation, which is fully ES5 compliant, 
but which will notify dependent computations upon each change.

```javascript
import mobservable = require('mobservable');

// create an array, that works by all means as a normal array, except that it is observable!
var someNumbers = mobservable.value([1,2,3]);

// a naive function that sums all the values
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

For typescript users, `mobservable` ships with module typings and an `@observable` annotation with which class members can be marked as observable. 

```typescript
/// <reference path="./node_modules/mobservable/mobservable.d.ts"/>
import mobservable = require('mobservable');
var observable = mobservable.observable;

class Order {
    @observable orderLines: OrderLine[] = [];
    @observable total() {
        return this.orderLines.reduce((sum, orderLine) => sum + orderLine.total, 0)
    }
}

class OrderLine {
    @observable price:number = 0;
    @observable amount:number = 1;

    constructor(price) {
        this.price = price;
    }

    @observable total() {
        return "Total: " + this.price * this.amount;
    }
}

var order1 = new Order();
order1.total.observe(console.log);

order1.orderLines.push(new OrderLine(7));
// Prints: Total: 7
order1.orderLines.push(new OrderLine(12));
// Prints: Total: 12
order1.orderLines[0].amount = 3;
// Prints: Total: 33
```

## Example: ObserverMixin for react components

MOBservable ships with a mixin that can be used to subscribe React components to observables automatically, so that model changes are processed transparently. 
The full JSX example can be found in this [fjsiddle]()

```javascript
        function Article(name, price) {
            mobservable.props(this, {
                name: name,
                price: price
            });
        }

        var ArticleView = React.createClass({
            mixins: [mobservable.ObserverMixin],
            
            render: function() {
                return (<li>
                    <span>{this.props.article.name}</span>
                    <span className="price">{this.props.article.price}</span>
                </li>);
            }
        });
        
        var book = new Article("Orthodoxy, G.K. Chesterton", 19.95);
        React.render(<ArticleView article={book} />, document.body);
        
        book.price = 15.95; // Triggers automatically a re-render of the ArticleView
```

# Processing observables

Observable values, arrays and functions created by `mobservable` possess the following characteristics:

* _synchronous_. All updates are processed synchronously, that is, the pseudo expressions `a = 3; b -> a * 2; a = 4; print(b); ` will always print `4`; `b` will never yield a stale value (unless `batch` is used).
* _atomic_. All computed values will postpone updates until all inputs are settled, to make sure no intermediate values are visible. That is, the expression `a = 3; b -> a * 2; c -> a * b; a = 4; print(c)` will always print `36` and no intermediate values like `24`.
* _real time dependency detection_. Computed values only depend on values actually used in the last computation, for example in this `a -> b > 5 ? c : b` the variable `c` will only cause a re-evaluation of a if `b` > 5. 
* _lazy_. Computed values will only be evaluated if they are actually being observed. So make sure computed functions are pure and side effect free; the library might not evaluate the expression as often as you thought it would.   
* _cycle detection_. Cycles in computes, like in `a -> 2 * b; b -> 2 * a;` will be deteced automatically.  
* _error handling_. Exceptions that are raised during computations are propagated to consumers.

# API

[Typescript typings](https://github.com/mweststrate/MOBservable/blob/master/mobservable.d.ts)

## Creating observables

### mobservable

Shorthand for `mobservable.value`

### mobservable.value

`mobservable.value<T>(value? : T[], scope? : Object) : IObservableArray<T>`

`mobservable.value<T>(value? : T|()=>T, scope? : Object) : IObservableValue<T>`

Function that creates an observable given a `value`. 
Depending on the type of the function, this function invokes `mobservable.array`, `mobservable.computed` or `mobservable.primitive`.
See the examples above for usage patterns. The `scope` is only meaningful if a function is passed into this method.

### mobservable.primitive

`mobservable.primitive<T>(value? : T) : IObservableValue<T>`

Creates a new observable, initialzed with the given `value` that can change over time. 
The returned observable is a function, that without arguments acts as getter, and with arguments as setter.
Furthermore its value can be observed using the `.observe` method, see `IObservableValue.observe`.  

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
(from version 0.6, see `mobservable.struct` if values need to be compared structuraly by using deep equality).

### mobservable.computed

`mobservable.computed<T>(expr : () => T, scope?) : IObservableValue<T>`

`computed` turns a function into an observable value. 
The provided `expr` should not have any arguments, but instead really on other observables that are in scope to determine its value.
The latest value returned by `expr` determines the value of the observable. When one of the observables used in `expr` changes, `computed` will make sure that the function gets re-evaluated, and all updates are propogated to the children.

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

`computed` will try to reduce the amount of re-evaluates of `expr` as much as possible. For that reason the function *should* be pure, that is:
* The result of `expr` should only be defined in terms of other observables, and not depend on any other state.
* Your code shouldn't rely on any side-effects, triggered by `expr`; `expr` should be side-effect free.
* The result of `expr` should always be the same if none of the observed observables did change.

It is not allowed for `expr` to have an (implicit) dependency on its own value.

It is allowed to throw exceptions in an observed function. The thrown exceptions might only be detected late. 
The exception will be rethrown if somebody inspects the current value, and will be passed as first callback argument
to all the listeners. 

### mobservable.array

`mobservable.array<T>(values? : T[]) : IObservableArray<T>`
**Note: ES5 environments only**

Constructs an array like, observable structure. An observable array is a thin abstraction over native arrays that adds observable properties. 
The most notable difference between built-in arrays is that these arrays cannot be sparse, that is, values assigned to an index larger than `length` are considered out-of-bounds and not oberved (nor any other property that is assigned to a non-numeric index). 

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

* `observe(listener:(changeData:IArrayChange<T>|IArraySplice<T>)=>void, fireImmediately?:boolean):Lambda` Listen to changes in this array. The callback will receive arguments that express an array splice or array change, conform the [ES7 proposal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe)
* `clear(): T[]` Remove all current entries from the array 
* `replace(newItems:T[])` Replaces all existing entries in the array with new ones.
* `values(): T[]` Returns a shallow clone of the array, similar to `.slice`
* `clone(): IObservableArray<T>` Create a new observable array containing the same values
* `find(predicate:(item:T,index:number,array:IObservableArray<T>)=>boolean,thisArg?,fromIndex?:number):T` Find implementation, basically the same as the ES7 Array.find proposal, but with added `fromIndex` parameter. 
* `remove(value:T):boolean` Remove a single item by value from the array. Returns true if the item was found and removed. 

### mobservable.props

```typescript
props(target:Object, name:string, initialValue: any):Object;
props(target:Object, props:Object):Object;
props(target:Object):Object;
``` 
**Note: ES5 environments only**

Creates observable properties on the given `target` object. This function uses `mobservable.value` internally to create observables.
Creating properties has as advantage that they are more convenient to use. See also [props or variables](#value_versus_props).
The original `target`, with the added properties, is returned by this function. Functions used to created computed observables will automatically
be bound to the correct `this`.

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

Note that observables created by `mobservable.props` do not expose an `.observe` method, to observe properties, see [`mobservable.observeProperty`](#mobservable_observeproperty)

Other forms in which this function can be called:
```javascript
mobservable.props(order, "price", 3); // equivalent to mobservable.props(order, { price: 3 });
var order = mobservable.props({ price: 3}); // uses the original object as target, that is, all values in it are replaced by their observable counterparts
```

### mobservable.observable annotation

**Note: ES5, TypeScript 1.5+ environments only**

Typescript 1.5 introduces annotations. The `mobservable.observable` annotation can be used to mark class properties and functions as observable. 
This annotations basically wraps `mobservable.props`. Example: 

```typescript
/// <reference path='./node_modules/mobservable/mobservable.d.ts'/>
var observable = require('mobservable').observable;

class Order {
    @observable price:number = 3;
    @observable amount:number = 2;
    @observable orders = [];

    @observable total() {
        return this.amount * this.price * (1 + orders.length);
    }
}
```
## Observing changes

### mobservable.observeProperty
`mobservable.observeProperty(object : Object, key : string, listener : Function, invokeImmediately : boolean = false) : Function`

Observes the observable property `key` of `object`. This is useful if you want to observe properties created using the `observable` annotation or the `props` method, 
since for those properties their own `observe` method is not publicly available.

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
`watch` returns a tuple consisting of the initial return value of `func` and an unsubscriber to be able to abort the watch.
The `onInvalidate` function will be called only once, after that, the watch has finished. 

`watch` is useful in functions where you want to have a function that responds to change, 
but where the function is actually invoked as side effect or as part of a bigger change flow or where unnecessary recalculations of `func` or either pointless or expensive, 
for example in the `render` method of a React component.

### mobservable.batch

`mobservable.batch<T>(workerFunction : ()=>T):T` 

Batch postpones the updates of computed properties until the (synchronous) `workerFunction` has completed. 
This is useful if you want to apply a bunch of different updates throughout your model before needing the updated computed values, 
for example while refreshing a data from the database.

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
This mixin basically turns the `.render` function of the component into an observable function, and makes sure that the component itself becomes an observer of that function, 
so that the component is re-rendered each time an observable has changed. 
In general, this mixin combines very well with the [React PureRender mixin](https://facebook.github.io/react/docs/pure-render-mixin.html) if observable objects or arrays are passed into the component.
This allows for React apps that perform well in apps with large amount of complex data, while avoiding the need to manage a lot of subscriptions.

See the [above example](#example_observermixin_for_react_components)

TODO see this fiddle and blogpost for some nice examples and extensive explanation. 

### mobservable.debugLevel

Numeric property, setting this to value to '1' or higher will cause additional debug information to be printed.

### mobservable.SimpleEventEmitter
Utility class for managing an event. Its methods are:

* `emit(...data : any[])`. Invokes all registered listeners with the given arguments
* `on(listener:(...data : any[]) => void) : () => void`. Registers a new callback that will be invoked on each `emit`. Returns a method that can be used to unsubscribe the listener.
* `once(listener:(...data : any[]) => void) : () => void`. Similar to `.on`, but automatically removes the listener after one invocation.

# Tips & tricks

## Use local variables in computations

Each time an observable value is read, there is a small performance overhead to keep the dependency tree of computations up to date.
Although this might not be noticable in practice, if you want to squeeze the last bit of performance out of the library; 
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

// Also fast:
var sum2 = mobservable(function() {
    return numbers.reduce(function(a, b) { // single observable read
        return a + b;
    }, 0);
});
``` 
## `.value` versus `.props`

Using `mobservable.value` or `mobservable.props` to create observables inside objects might be a matter of taste.
Here is a small comparison list between the two approaches.

| .value | .props |
| ---- | ---|
| ES3 complient | requires ES 5 |
| explicit getter/setter functions: `obj.amount(2)`  | object properties with implicit getter/setter: `obj.amount = 2 ` |
| easy to make mistakes; e.g. `obj.amount = 3` instead of `obj.amount(3)`, or `7 * obj.amount` instead of `7 * obj.amount()` wilt both not achieve the intended behavior | Use property reads / assignments |
| easy to observe: `obj.amount.observe(listener)` | `mobservable.observeProperty(obj,'amount',listener)`  |

## `.reference` versus `.array`

Do *not* confuse `mobservable.primitive([])` (or `mobservable([])`) with `mobservable.array([])`, 
the first creates an observable reference to an array, but does not observe its contents. 
The later observes the contents from the array you pass into it.

