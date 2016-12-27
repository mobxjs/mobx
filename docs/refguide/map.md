# Observable Maps

## `observable.map(values)`

`observable.map(values?)` creates a dynamic keyed observable map.
Observable maps are very useful if you don't want to react just to the change of a specific entry, but also to the addition or removal of entries.
Optionally takes an object, entries array or string keyed [ES6 map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) with initial values.
Unlike ES6 maps, only strings are accepted as keys.

The following methods are exposed according to the [ES6 Map spec](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map):

* `has(key)` Returns whether this map has an entry the provided key. Note that the presence of a key is an observable fact in itself.
* `set(key, value)`. Sets the given `key` to `value`. The provided key will be added to the map if it didn't exist yet.
* `delete(key)`. Deletes the given key and its value from the map.
* `get(key)`. Returns the value at the given key (or `undefined`).
* `keys()`. Returns all keys present in this map. The insertion order is preserved.
* `values()`. Returns all values present in this map. Insertion order is preserved.
* `entries()`. Returns an (insertion ordered) array that for each key/value pair in the map contains an array `[key, value]`.
* `forEach(callback:(value, key, map) => void, thisArg?)`. Invokes the given callback for each key / value pair in the map.
* `clear()`. Removes all entries from this map.
* `size`. Returns the amount of entries in this map.

The following functions are not in the ES6 spec but are available in MobX:
* `toJS()`. Returns a shallow plain object representation of this map. (For a deep copy use `mobx.toJS(map)`).

* `intercept(interceptor)`. Registers an interceptor that will be triggered before any changes are applied to the map. See [observe & intercept](observe.md).
* `observe(listener, fireImmediately?)`. Registers a listener that fires upon each change in this map, similarly to the events that are emitted for [Object.observe](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/observe). See [observe & intercept](observe.md) for more details.
* `merge(values)`. Copies all entries from the provided object into this map. `values` can be a plain object, array of entries or string-keyed ES6 Map.
* `replace(values)`. Replaces the entire contents of this map with the provided values. Short hand for `.clear().merge(values)`

## `observable.shallowMap(values)`

Any values assigned to an observable map will be default passed through [`observable`](observable.md) to make them observable.
Create a shallow map to disable this behavior and store are values as-is. See also [modifiers](modifiers.md) for more details on this mechanism.

## Name argument

Both `observable.map` and `observable.shallowMap` take a second parameter which is used as debug name in for example `spy` or the MobX dev tools.