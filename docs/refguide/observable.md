# observable

`observable` is to MobX as `$` is to jQuery.
Making data observable starts with this function.
If data is observable, views that depend on that data will update automatically.

`observable` provides overloads for different kinds of data.
Probably you will only use the version that takes objects,
but these are the available variations:

## Objects

If a plain javascript object is passed to `observable` (that is, an object that wasn't created using a constructor function),
MobX will recursively pass all its values through `observable`.
This way the complete object (tree) is in-place instrumented to make it observable.

So we can rewrite the previous example as:

```javascript
import {observable, autorun} from "mobx";

var person = observable({
	name: "John",
	age: 42,
	showAge: false,
	labelText: function() {
		return this.showAge ? `${this.name} (age: ${this.age})` : this.name;
	}
});

// object properties don't expose an 'observe' method,
// but don't worry, 'mobx.autorun' is even more powerful
autorun(() => console.log(person.labelText));

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
* Argumentless functions will be automatically turned into views, just like [`@computed`](computed-decorator) would do. For view `this` will be automatically bound to the object it is defined on.
However, if a function expression (ES6 / typescript) is used, `this` will be bound to undefined, so you probably want to either refer to the object directly, or use a classic function.
* `observable` is applied recursively, both on instantiation and to any new values that will be assigned to observable properties in the future.
* These defaults are fine in 95% of the cases, but for more fine-grained on how and which properties should be made observable, see the [modifiers](modifiers.md) section.

## Arrays

Similar to objects, arrays can be made observable using `observable`.
This works recursively as well, so all (future) values of the array will be observable as well.

```javascript
import {observable, autorun} from "mobx";

var todos = observable([
	{ title: "Spoil tea", completed: true },
	{ title: "Make coffee", completed: false }
]);

autorun(() => {
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
it is a good idea to _create a shallow copy before passing it to other libraries or built-in functions_ (which is good practice anyway) by using `array.slice()` or `array.peek()`.
So `Array.isArray(observable([]).slice())` will yield `true`.

Unlike the built-in implementation of the functions `sort` and `reverse`, observableArray.sort and reverse  will not change the array in-place, but only will return a sorted / reversed copy. 

Besides all built-in functions, the following goodies are available as well on observable arrays:

* `observe(listener, fireImmediately? = false)` Listen to changes in this array. The callback will receive arguments that express an array splice or array change, conforming to [ES7 proposal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe). It returns a disposer function to stop the listener.
* `clear()` Remove all current entries from the array.
* `replace(newItems)` Replaces all existing entries in the array with new ones.
* `find(predicate: (item, index, array) => boolean, thisArg?, fromIndex?)` Basically the same as the ES7 `Array.find` proposal, except for the additional `fromIndex` parameter.
* `remove(value)` Remove a single item by value from the array. Returns `true` if the item was found and removed.
* `peek()` Returns an array with all the values which can safely be passed to other libraries, similar to `slice()`.  
In contrast to `slice`, `peek` peek doesn't create a defensive copy. Use this in performance critical applications if you know for sure that you use the array in a read-only manner.  
In performance cricital sections it is recommend to use [fastArray](../refguide/fast-array.md) as well.


## Primitive values and references

For all type of values, with the exception of _plain objects_, _arrays_ and _functions without arguments_ this overload is run.
In practice, you probably won't use this overload as it is often more convenient to use `observable` on an object or 
[`extendObservable`](../refguide/extend-observable.md) (or `@observable`) to introduce observable properties on existing objects.

`observable` accepts scalar values and returns an object with a getter / setter function that holds this value.
Furthermore you can register a callback using its `.observe` method to listen to changes on the stored value.
But in most cases it is better to use [`mobx.autorun`](autorun.md) instead.

So the signature of object returned by `observable(scalar)` is:
* `.get()` Returns the current value.
* `.set(value)` Replaces the currently stored value. Notifies all observers.
* `.observe(callback: (newValue, previousValue) => void, fireImmediately = false): disposerFunction`. Registers an observer function that will fire each time the stored value is replaced. Returns a function to cancel the observer.

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
