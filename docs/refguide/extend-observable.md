# extendObservable

Quite similar to `Object.assign`, `extendObservable` takes two arguments, a `target` object and a `properties` map, and addes all key-value pairs from the properties to the `target` as observable properties.
This is very useful in constructor functions or to extend already observable objects.

```javascript
var Person = function(firstName, lastName) {
	// initialize observable properties on a new instance
	extendObservable(this, {
		firstName: firstName,
		lastName: lastName
	});
}

var matthew = new Person("Matthew", "Henry");

// add a observable property to an already observable object
extendObservable(matthew, {
	age: 353
});
```

(N.b:  `observable(object)` is actually an alias for `extendObservable(object, object)`)
