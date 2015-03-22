# MOBservable

*Changes are coming!*

MOBservable is simple observable implementation, based on the ideas of observables in bigger frameworks like `knockout`, `ember` etc, but this one does not have 'strings attached'. Furthermore it should fit well in any typescript project.

# Properties

The `mobservable.property` method takes a value or function and creates an observable value from it.
This way properties that listen that observe each other can be created. A quick example:

```typescript
import mobservable = require('mobservable');
var property = mobservable.property;

var vat = property(0.20);

var order = {};
order.price = property(10),
order.priceWithVat = property(() => order.price() * (1+vat()));

order.priceWithVat.onChange((price) => console.log("New price: " + price));

order.price(20);
// Prints: New price: 24
order.price(10);
// Prints: New price: 10
```

### mobservable.property(value, scope?)

Constructs a new `Property`, value can either be a string, number, boolean or function that takes no arguments and returns a value. In the body of the function, references to other properties will be tracked, and onChange, the function will be re-evaluated. The returned value is an `IProperty` function/object.

Optionally accepts a scope parameter, which will be returned by the setter for chaining, and which will used as scope for calculated properties.

### mobservable.defineProperty(object, name, value)

Defines a property using ES5 getters and setters. This is useful in constructor functions, and allows for direct assignment / reading from observables:

```javascript
var vat = property(0.2);
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

### mobservable.batch(workerFunction)

Batch postpones the updates of computed properties until the (synchronous) `workerFunction` has completed. This is useful if you want to apply a bunch of different updates throughout your model before needing the updated computed values, for example while refreshing a value from the database.

### mobservable.onReady(listener) / mobservable.onceReady(listener)

The listener is invoked each time the complete model has become stable. The listener is always invoked asynchronously, so that even without `batch` the listener is only invoked after a bunch of changes have been applied

`onReady` returns a function with wich the listener can be unsubscribed from future events

### IProperty()

Returns the current value of the property

### IProperty(value)

Sets a new value to the property. Returns the scope with which this property was created for chaining.

### IProperty.onChange(listener,fireImmediately=false)

Registers a new listener to change events. Listener should be a function, its first argument will be the new value, and second argument the old value.

Returns a function that upon invocation unsubscribes the listener from the property.
