
## Objects

Things to remember about `makeReactive`.

`makeReactive` always returns a reactive _copy_ of the thing you pass to it.
But you can also create reactive properties on existing object by using `extendReactive(target, properties)`.
This is useful in constructor functions where you can `this` as target to create reactive properties on a fresh instance.
Or you can use it to turn existing objects into reactive ones, by using the same object both as `target` and as `properties` parameter.
(Yup, `makeReactive(object)` is just a shorthand for `extendReactive({}, object)`). 

## Arrays

## Functions