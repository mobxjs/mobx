# modifiers for makeReactive

By default, `makeReactive` recursively makes all the values of plain objects and arrays recursively reactive.
Besides that it automatically converts functions without arguments into reactive views or derived properties.
For all other types of values just a reference is stored.
In general, this should just do what you need, but if you want you can override the default behavior using _modifiers_.
Note that modifiers are 'sticky', they are interpreted as being annotations.
They do not only apply to the current value, but also to all values that are assigned in the future to the same attribute.

## asReference

The most common modifier is `asReference`.
If this modifier is used, `makeReactive` will not attempt to make the value reactive.
Use this for example if you want to store a reference to a function, instead of creating a view based on that function. 
Or use it if you want to prevent that objects or arrays are made reactive (ok, not sure whether thats a use-case, but alas).

```javascript

var test = makeReactive({
	x : 3,
	doubler: function() {
		return this.x;
	},
	someFunc: asReference(function() {
		return this.x;
	})
});

test.doubler; // === 6
test.someFunc; // still a function
```

## asStructure

Can be used on non-cyclic, plain javascript values.
Instead of comparing old values with new values based on whether the reference has changed, values are compared using deep equality before notifying any observers.
This is useful if you are working with 'struct' like objects like colors or coordinates.
`asStructure` can be used on reactive functions, plain objects and arrays.

```javascript
var vector1 = makeReactive({ x: 10, y : 10 });
var vector2 = makeReactive({ x: 0, y: 20 });

var boundingVector = makeReactive(asStructure(() => {
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

Similar to `asReference`, except that `asFlat` does not prevent its value to become reactive, but only the children of the value.
Can be used for example to create an reactive array or object that should not automatically make its children reactive.

```javascript
var todos = makeReactive(asFlat([{
	title: "make coffee",
	completed: false
}]));

isReactive(todos); // true
isReactive(todos[0]); // false
```