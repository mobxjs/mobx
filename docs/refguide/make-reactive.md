
## Objects

Things to remember about `makeReactive`.

`makeReactive` always returns a reactive _copy_ of the thing you pass to it.
But you can also create reactive properties on existing object by using `extendReactive(target, properties)`.
This is useful in constructor functions where you can `this` as target to create reactive properties on a fresh instance.
Or you can use it to turn existing objects into reactive ones, by using the same object both as `target` and as `properties` parameter.
(Yup, `makeReactive(object)` is just a shorthand for `extendReactive({}, object)`). 

## Arrays

## Functions

Remember that only properties that exist on the moment that an object is passed to `makeReactive` will be made reactive.
Properties that are added to the object _after_ making it reactive won't become reactive automatically.
To check whether an object or property is reactive use [`isReactive`](../refguide/is-reactive.md).

Mobservable will _not_ make object properties automatically reactive if the object was created by a constructor function.
The assumption is that for such objects it is the responsibility of the constructor to define which properties should be reactive. 
To find out how to define reactive properties on an already existing object or in a constructor function, see [`extendReactive`](../refguide/extend-reactive).
