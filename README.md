# ts-model

ts-model is a collection of utilities that helps managing the M of MVC. ts-model provides observable properties and structures, and utilities to create derived data which are updated reactively.

# Properties

The `model.property` method takes a value or function and creates an observable value from it.
This way properties that listen that observe each other can be created. A quick example:

```typescript
import model = require('ts-model');
var property = model.property;

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

### model.property(value)

Constructs a new `Property`, value can either be a string, number, boolean or function that takes no arguments and returns a value. In the body of the function, references to other properties will be tracked, and onChange, the function will be re-evaluated. The returned value is an `IProperty` function/object.

### model.batch(workerFunction)

Batch postpones the updates of computed properties until the (synchronous) `workerFunction` has completed. This is useful if you want to apply a bunch of different updates throughout your model before needing the updated computed values, for example while refreshing a value from the database.

### model.onReady(listener) / model.onceReady(listener)

The listener is invoked each time the complete model has become stable. The listener is always invoked asynchronously, so that even without `batch` the listener is only invoked after a bunch of changes have been applied

`onReady` returns a function with wich the listener can be unsubscribed from future events

### IProperty()

Returns the current value of the property

### IProperty(value)

Sets a new value to the property

### IProperty.onChange(listener,fireImmediately=false)

Registers a new listener to change events. Listener should be a function, its first argument will be the new value, and second argument the old value.

Returns a function that upon invocation unsubscribes the listener from the property.
