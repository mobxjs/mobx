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
