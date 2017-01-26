# extendObservable

Quite similar to `Object.assign`, `extendObservable` takes two or more arguments, a `target` object and one or more `properties` maps.
It adds all key-value pairs from the properties to the `target` as observable properties.

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

N.b:  `observable.object(object)` is actually an alias for `extendObservable({}, object)`.

Note that the property maps are not always copied literally onto the target, but they are considered property descriptor.
Most values are copied as-is, but values wrapped in a modifier as treated specially. And so are properties that have a getter.

## Modifiers

[Modifiers](modifiers.md) can be used to define special behavior for certain properties.
For example `observable.ref` creates an observable reference which doesn't automatically convert its values into observables, and `computed` introduces a derived property:

```javascript
var Person = function(firstName, lastName) {
	// initialize observable properties on a new instance
	extendObservable(this, {
		firstName: observable.ref(firstName),
		lastName: observable.ref(lastName),
		fullName: computed(function() {
			return this.firstName + " " + this.lastName
		})
	});
}
```

An overview of all available modifiers can be found in the [modifiers](modifiers.md) section.

## Computed properties

Computed properties can also be written by using a *getter* function. Optionally accompanied with a setter:

```javascript
var Person = function(firstName, lastName) {
	// initialize observable properties on a new instance
	extendObservable(this, {
		firstName: firstName,
		lastName: lastName,
		get fullName() {
			return this.firstName + " " + this.lastName
		},
		set fullName(newValue) {
			var parts = newValue.split(" ")
			this.firstName = parts[0]
			this.lastName = parts[1]
		}
	});
}
```

_Note: getter / setter is valid ES5 syntax and doesn't require a transpiler!_

## `extendShallowObservable`

`extendShallowObservable` is like `extendObservable`, except that by default the properties will by default *not* automatically convert their values into observables.
So it is similar to calling `extendObservable` with `observable.ref` modifier for each property.
Note that `observable.deep` can be used to get the automatic conversion back for a specific property.
