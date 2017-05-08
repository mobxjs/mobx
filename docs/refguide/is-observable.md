# isObservable

Returns true if the given value was made observable by MobX.
Optionally accepts a second string parameter to see whether a specific property is observable.

```javascript
var person = observable({
	firstName: "Sherlock",
	lastName: "Holmes"
});

person.age = 3;

isObservable(person); // true
isObservable(person, "firstName"); // true
isObservable(person.firstName); // false (just a string)
isObservable(person, "age"); // false
```

# isObservableMap

Returns true if the given object is created using `mobx.map`.

# isObservableArray

Returns true if the given object is an array that was made observable using `mobx.observable(array)`.

# isObservableObject

Returns true if the given object is an object that was made observable using `mobx.observable(object)`.

# isBoxedObservable

Takes an object, returns true if the provided object is a boxed observable. N.b. does not return true for boxed computed values.

# isComputed

Accepts an `object` and optional `propertyName` argument. Returns `true` if either:

* The `object` passed in is an boxed computed property
* If the property with name `propertyName` of `object` is a computed property.