# extendObservable

Quite similar to `Object.assign`, `extendObservable` takes two or more arguments, a `target` object and one or more `properties` maps.
It adds all key-value pairs from the properties to the `target` as observable properties.

If an argumentless function is passed as value of a property, `extendObservable` will introduce a [`computed`](./computed-decorator.md) property instead of an observable property.

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
