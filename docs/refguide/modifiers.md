# Modifiers for observable

By default, `observable` recursively makes all the values of _plain_ objects and arrays recursively observable.
Besides that it automatically converts functions without arguments into reactive views or derived properties.
For all other types of values just a reference is stored.
In general, this should just do what you need, but if you want you can override the default behavior using _modifiers_.
Note that modifiers are 'sticky', they are interpreted as being annotations.
They do not only apply to the current value, but also to all values that are assigned in the future to the same attribute.

Note that the attributes class instances (all objects that have a prototype) will not be made observable automatically by `observable`.
It is considered to be the responsibility of the class definition / constructor function to mark the necessary attributes of an class instance observable / computed.

## asReference

The most common modifier is `asReference`.
If this modifier is used, `observable` will not attempt to make the value observable.
Use this for example if you want to store a reference to a function, instead of creating a view based on that function.
You can also use it to prevent that plain objects or arrays are made observable automatically.

```javascript

var test = observable({
	x : 3,
	doubler: function() {
		return this.x*2;
	},
	someFunc: asReference(function() {
		return this.x;
	})
});

console.log(test.doubler); // === 6
console.log(test.someFunc); // still a function
```

## asStructure

Can be used on non-cyclic, plain JavaScript values.
Instead of comparing old values with new values based on whether the reference has changed, values are compared using deep equality before notifying any observers.
This is useful if you are working with 'struct' like objects like colors or coordinates.
`asStructure` can be used on reactive functions, plain objects and arrays.

```javascript
var vector1 = observable({ x: 10, y : 10 });
var vector2 = observable({ x: 0, y: 20 });

var boundingVector = observable(asStructure(() => {
	return {
		x: Math.max(vector1.x, vector2.x),
		y: Math.max(vector1.y, vector2.y)
	}
});

boundingVector.observe((vector) => console.log(vector.x, vector.y));

vector1.x = 30;
// prints '30 20'

vector2.x = 10;
// doesn't print, but without 'asStructure' it would print because 'boundingVector' always returns a new object.
```

## asFlat

Similar to `asReference`, except that `asFlat` does not prevent its value to become observable, but only the children of the value.
It can be used for example to create an observable array or object that should not automatically make its children observable.

```javascript
var todos = observable(asFlat([{
	title: "make coffee",
	completed: false
}]));

isObservable(todos); // true
isObservable(todos[0]); // false
isObservable(todos[0], "title"); // false
```
