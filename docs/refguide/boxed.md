## Primitive values and references

All primitive values in JavaScript are immutable and hence per definition not observable.
Usually that is fine, as MobX usually can just make the _property_ that contains the value observable.
See also [observable objects](object.md).
In rare cases it can be convenient to have an observable "primitive" that is not owned by an object.
For these cases it is possible to create an observable box that manages such a primitive. 

So `observable` accepts scalar values as well and returns an object with a getter / setter function that holds this value.
Furthermore you can register a callback using its `.observe` method to listen to changes on the stored value.
But in most cases it is better to use [`mobx.autorun`](autorun.md) instead.

So the signature of object returned by `observable(scalar)` is:
* `.get()` Returns the current value.
* `.set(value)` Replaces the currently stored value. Notifies all observers.
* `intercept(interceptor)`. Can be used to intercept changes before they are applied. See [observe & intercept](observe.md)
* `.observe(callback: (newValue, previousValue) => void, fireImmediately = false): disposerFunction`. Registers an observer function that will fire each time the stored value is replaced. Returns a function to cancel the observer. See [observe & intercept](observe.md)

Example:

```javascript
import {observable} from "mobx";

const cityName = observable("Vienna");

console.log(cityName.get());
// prints 'Vienna'

cityName.observe(function(newCity, oldCity) {
	console.log(oldCity, "->", newCity);
});

cityName.set("Amsterdam");
// prints 'city: Vienna -> Amsterdam'
```
