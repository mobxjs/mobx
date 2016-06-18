# Observable Maps

`observable(asMap(values?, modifier?))` (and `map(values?, modifier?)`) creates a dynamic keyed observable map.
Observable maps are very useful if you don't want to react just to the change of a specific entry, but also to the addition or removal of entries.
Optionally takes an object or entries array with initial values.
Unlike ES6 maps, only strings are accepted as keys.
The modifier param can be one of the MobX [modifiers](modifiers.md), such as `asReference`.

The following methods are exposed according to the [ES6 Map spec](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map):

* `has(key)` Returns whether this map has an entry the provided key. Note that the presence of a key is an observable fact in itself.
* `set(key, value)`. Sets the given `key` to `value`. The provided key will be added to the map if it didn't exist yet.
* `delete(key)`. Deletes the given key and its value from the map.
* `get(key)`. Returns the value at the given key (or `undefined`). Make sure that you guard `get` calls with `has`.
* `keys()`. Returns all keys present in this map. The insertion order is preserved.
* `values()`. Returns all values present in this map. Insertion order is preserved.
* `entries()`. Returns an (insertion ordered) array that for each key/value pair in the map contains an array `[key, value]`.
* `forEach(callback:(value, key, map) => void, thisArg?)`. Invokes the given callback for each key / value pair in the map.
* `clear()`. Removes all entries from this map.
* `size`. Returns the amount of entries in this map.

The following functions are not in the ES6 spec but are available in MobX:
* `toJS()`. Returns a shallow plain object representation of this map. (For a deep copy use `mobx.toJSON(map)`).

* `intercept(interceptor)`. Registers an interceptor that will be triggered before any changes are applied to the map. See [observe & intercept](observe.md). 
* `observe(listener, fireImmediately?)`. Registers a listener that fires upon each change in this map, similarly to the events that are emitted for [Object.observe](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/observe). See [observe & intercept](observe.md) for more details.
* `merge(object | map)`. Copies all entries from the provided object into this map.
