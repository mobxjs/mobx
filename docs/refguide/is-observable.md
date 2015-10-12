# isObservable

Returns true if the given value was made observable by mobservable.
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
