# observable

`observable` is to Mobservable as `$` is to jQuery.
Making data observable starts with this function.
If data is observable, views that depend on that data will update automatically.

`observable` provides overloads for different kinds of data.
Probably you will only use the version that takes objects,
but these are the available variations:

## Primitive values and references

For all type of values, with the exception of _plain objects_, _arrays_ and _functions without arguments_ this overload is run.
`observable` accepts a value and returns a getter / setter function that holds this value.
The returned function can be invoked without arguments to get the currently stored value,
or it can be invoked with one argument to update the currently stored value.

Furthermore you can register a callback using its `.observe` method to listen to changes on the stored value.
But usually it is more convenient to use [`mobservable.observe`](observe.md) instead.

So the signature of the return value of `observable` is:
* `func()` Returns the current value.
* `func(value)` Replaces the currently stored value. Notifies all observers.
* `func.observe(callback: (newValue, previousValue) => void, fireImmediately = false): disposerFunction`. Registers an observer function that will fire each time the stored value is replaced. Returns a function to cancel the observer.

Example:

```javascript
const cityName = observable("Vienna");

console.log(cityName());
// prints 'Vienna'

cityName.observe(function(newCity, oldCity) {
	console.log(oldCity, "->", newCity);
});

cityName("Amsterdam");
// prints 'city: Vienna -> Amsterdam'


```

## View functions

If an argumentless function is passed to `observable`,
Mobservable will make sure that that function is run each time that any of the values used by the function is changed.
A new function is returned which has the same signature as the function returned for primitives, except that it is not allowed to assign a new value manually.

Example:
```javascript
var name = observable("John");
var age = observable(42);
var showAge = observable(false);

var labelText = observable(() =>
	showAge() ? `${name()} (age: ${age()})` : name();
);

var disposer = labelText.observe(newLabel => console.log(newLabel));

name("Dave");
// prints: 'Dave'

age(21);
// doesn't print

showAge(true);
// prints: 'Dave (age: 21)'

age(42);
// prints: 'Dave (age: 42)'

// cancel the observer
disposer();

name("Matthew");
// doesn't print anymore...

// ... but the value can still be inspected if needed.
console.log(labelText());
```

Note how the function now automatically reacts to data changes,
but only if they occurred in data that was actually used to produce the output.
Hence the first change to `age` didn't result in a re-evaluation of the `labelText` function.
Mobservable will automatically determine whether the function should run _eagerly_ or _lazily_ based on how the views are used throughout your application,
so make sure your code doesn't rely on any side effects in those functions.


---

These two forms of `observable`, one for primitives and references, and one for functions, form the core of Mobservable.
The rest of the api is just syntactic sugar around these two core operations.
Nonetheless, you will rarely use these forms; using objects is just a tat more convenient.

## Objects

If a plain javascript object is passed to `observable` (that is, an object that wasn't created using a constructor function),
Mobservable will recursively pass all its values through `observable`.
This way the complete object (tree) is in-place instrumented to make it observable.

So we can rewrite the previous example as:

```javascript
var person = observable({
	name: "John",
	age: 42,
	showAge: false,
	labelText: function() {
		return this.showAge ? `${this.name} (age: ${this.age})` : this.name;
	}
};

// object properties don't expose an 'observe' method,
// but don't worry, 'mobservable.observe' is even more powerful
mobservable.observe(() => console.log(person.labelText));

person.name = "Dave";
// prints: 'Dave'

person.age = 21;
// etc
```

Some things to keep in mind when making objects observable:

* When passing objects through `observable`, only the properties that exist at the time of making the object observable will be observable.
Properties that are added to the object at a later time won't become observable, unless [`extendObservable`](extend-observable.md) is used.
* Only plain objects will be made observable. For non-plain objects it is considered the responsibility of the constructor to initialize the observable properties.
Either use the [`@observable`](observable.md) annotation or the [`extendObservable`](extend-observable.md) function.
* Argumentless functions will be automatically turned into views. For view `this` will be automatically bound to the object it is defined on.
However, if a function expression (ES6 / typescript) is used, `this` will be bound to undefined, so you probably want to either refer to the object directly, or use a classic function.
* `observable` is applied recursively, both on instantiation and to any new values that will be assigned to observable properties in the future.
* These defaults are fine in 95% of the cases, but for more fine-grained on how and which properties should be made observable, see the [modifiers](modifiers.md) section.

## Arrays

Similar to objects, arrays can be made observable using `observable`.
This works recursively as well, so all (future) values of the array will be observable as well.

```javascript
var todos = observable([
	{ title: "Spoil tea", completed: true },
	{ title: "Make coffee", completed: false }
]);

mobservable.observe(() => {
	console.log("Remaining:", todos
		.filter(todo => !todo.completed)
		.map(todo => todo.title)
		.join(", ")
	);
});
// Prints: 'Remaining: Make coffee'

todos[0].completed = false;
// Prints: 'Remaining: Spoil tea, Make coffee'

todos[2] = { title: 'Take a nap', completed: false };
// Prints: 'Remaining: Spoil tea, Make coffee, Take a nap'

todos.shift();
// Prints: 'Remaining: Make coffee, Take a nap'
```

Due to limitations of native arrays in ES5 (`array.observe` is only available in ES7, and arrays cannot be extend),
`observable` will instrument a clone of the provided array instead of the original one.
In practice, these arrays work just as fine as native arrays and all native methods are supported, including index assignments, up-to and including the length of the array.

Bear in mind that `Array.isArray(observable([]))` will yield `false`, so whenever you need to pass an observable array to an external library,
it is a good idea to _create a shallow copy before passing it to other libraries or built-in functions_ (which is good practice anyway). So `Array.isArray(observable([]).slice())` will yield `true`.

Besides all built-in functions, the following goodies are available as well on observable arrays:

* `observe(listener, fireImmediately? = false)` Listen to changes in this array. The callback will receive arguments that express an array splice or array change, conforming to [ES7 proposal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe). It returns a disposer function to stop the listener.
* `clear()` Remove all current entries from the array.
* `replace(newItems)` Replaces all existing entries in the array with new ones.
* `find(predicate: (item, index, array) => boolean, thisArg?, fromIndex?)` Basically the same as the ES7 `Array.find` proposal, except for the additional `fromIndex` parameter.
* `remove(value)` Remove a single item by value from the array. Returns `true` if the item was found and removed.
