# extendReactive

Quite similar to `Object.assign`, `extendReactive` takes two arguments, a `target` object and a `properties` map, and addes all key-value pairs from the properties to the `target` as reactive properties.
This is very useful in constructor functions or to extend already reactive objects.

```javascript
var Person = function(firstName, lastName) {
	// initialize reactive properties on a new instance
	extendReactive(this, {
		firstName: firstName,
		lastName: lastName
	});
}

var matthew = new Person("Matthew", "Henry");

// add a reactive property to an already reactive object
extendReactive(matthew, {
	age: 353
});
```

Note that `makeReactive(object)` is actually an alias for `extendReactive(object, object)`.