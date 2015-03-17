# ts-model

ts-model is a collection of utilities that helps managing the M of MVC. ts-model provides observable properties and structures, and utilities to create derived data which are updated reactively.

## Property

The `property` method takes a value or function and creates an observable value from this.

```typescript
import model = require('ts-model');
var property = model.property;

var vat = property(0.20);

var order = {
  price: property(10),
  priceWithVat: property(() => this.price() * (1+vat()));
}

order.priceWithVat.onChange((price) => console.log("New price: " + price));

order.price(20);
// Prints: New price: 24
order.price(10);
// Prints: New price: 10
```

### model.property(value)

Constructs a new `Property`, value can either be a string, number, boolean or function that takes no arguments and returns a value. In the body of the function, references to other properties will be tracked, and onChange, the function will be re-evaluated.

### Property()

Returns the current value of the property

### Property(value)

Sets a new value to the property

### Property.onChange(listener)

Registers a new listener to change events. Listener should be a function, its first argument will be the new value, and second argument the old value.

Returns a function that upon invocation unsubscribes the listener from the property. 
