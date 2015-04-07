# MOBservable

*Changes are coming!*

MOBservable is light-weight stand alone observable implementation, based on the ideas of observables in bigger frameworks like `knockout`, `ember`, but this time without 'strings attached'. Furthermore it should fit well in any typescript project.

# Observable values

The `mobservable.value(valueToObserve)` method (or just its shorthand: `mobservable(valueToObserve)`) takes a value or function and creates an observable value from it. A quick example:

```typescript
import mobservable = require('mobservable');

var vat = mobservable(0.20);

var order = {};
order.price = mobservable(10),
order.priceWithVat = mobservable(() => order.price() * (1 + vat()));

order.priceWithVat.observe((price) => console.log("New price: " + price));

order.price(20);
// Prints: New price: 24
vat(0.10);
// Prints: New price: 22
```

### mobservable.value(value, scope?)

Constructs a new observable value. The value can be everything that is not a function, or a function that takes no arguments and returns a value. In the body of the function, references to other properties will be tracked, and on change, the function will be re-evaluated. The returned value is an `IProperty` function/object. Passing an array or object into the `value` method will only observe the reference, not the contents of the objects itself. To observe the contents of an array, use `mobservable.array`, to observe the contents of an object, just make sure its (relevant) properties are observable values themselves.

The method optionally accepts a scope parameter, which will be returned by the setter for chaining, and which will be used as scope for calculated properties, for example:

```javascript
var value = mobservable.value;

function OrderLine(price, amount) {
	this.price = value(price);
	this.amount = value(amount);
	this.total = value(function() {
		return this.price() * this.amount();
	}, this)
}
```

### mobservable.array(valueArray?)

TODO

### mobservable.defineProperty(object, name, value)

Defines a property using ES5 getters and setters. This is useful in constructor functions, and allows for direct assignment / reading from observables:

```javascript
var vat = mobservable.value(0.2);

var Order = function() {
	mobservable.defineProperty(this, 'price', 20);
	mobservable.defineProperty(this, 'amount', 2);
	mobservable.defineProperty(this, 'total', function() {
		return (1+vat()) * this.price * this.amount; // price and amount are now properties!
	});
};

var order = new Order();
order.price = 10;
order.amount = 3;
// order.total now equals 36
```

In typescript, it might be more convenient for the typesystem to directly define getters and setters instead of using `mobservable.defineProperty`:

```typescript
class Order {
	_price = new mobservable.property(20, this);
	get price() {
		return this._price();
	}
	set price(value) {
		this._price(value);
	}
}
```

### mobservable.watch(func, onInvalidate)

`watch` invokes `func` and returns a tuple consisting of the return value of `func` and an unsubscriber. `watch` will track which observables `func` was observing, but it will *not* recalculate `func` if necessary, instead, it will fire the `onInvalidate` callback to notify that the output of `func` can no longer be trusted.

The `onInvalidate` function will be called only once, after that, the watch has finished. To abort a watch, use the returned unsubscriber.

`Watch` is useful in functions where you want to have a function that responds to change, but where the function is actually invoked as side effect or part of a bigger change flow or where unnecessary recalculations of `func` or either pointless or expensive, for example in React component render methods

### mobservable.batch(workerFunction)

Batch postpones the updates of computed properties until the (synchronous) `workerFunction` has completed. This is useful if you want to apply a bunch of different updates throughout your model before needing the updated computed values, for example while refreshing a value from the database.

### mobservable.onReady(listener) / mobservable.onceReady(listener)

The listener is invoked each time the complete model has become stable. The listener is always invoked asynchronously, so that even without `batch` the listener is only invoked after a bunch of changes have been applied

`onReady` returns a function with wich the listener can be unsubscribed from future events

### IProperty()

Returns the current value of the property

### IProperty(value)

Sets a new value to the property. Returns the scope with which this property was created for chaining.

### IProperty.subscribe(listener,fireImmediately=false)

Registers a new listener to change events. Listener should be a function, its first argument will be the new value, and second argument the old value.

Returns a function that upon invocation unsubscribes the listener from the property.
