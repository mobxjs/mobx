---
title: Observable Maps
sidebar_label: maps
hide_title: true
---

# Observable Maps

<div id='codefund'></div><div class="re_2020"><a class="re_2020_link" href="https://www.react-europe.org/#slot-2149-workshop-typescript-for-react-and-graphql-devs-with-michel-weststrate" target="_blank" rel="sponsored noopener"><div><div class="re_2020_ad" >Ad</div></div><img src="/img/reacteurope.svg"><span>Join the author of MobX at <b>ReactEurope</b> to learn how to use <span class="link">TypeScript with React</span></span></a></div>

## `observable.map(values, options?)`

`observable.map(values?)` creates a dynamic keyed observable map.
Observable maps are very useful if you don't want to react just to the change of a specific entry, but also to the addition or removal of entries.
Optionally takes an object, entries array or string keyed [ES6 map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) with initial values.

Using ES6 Map constructor you can initialize observable map using `observable(new Map())` or for class properties using the decorator `@observable map = new Map()`.

The following methods are exposed according to the [ES6 Map spec](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map):

-   `has(key)` Returns whether this map has an entry with the provided key. Note that the presence of a key is an observable fact in itself.
-   `set(key, value)`. Sets the given `key` to `value`. The provided key will be added to the map if it didn't exist yet.
-   `delete(key)`. Deletes the given key and its value from the map.
-   `get(key)`. Returns the value at the given key (or `undefined`).
-   `keys()`. Returns an iterator over all keys present in this map. Insertion order is preserved.
-   `values()`. Returns an iterator all values present in this map. Insertion order is preserved.
-   `entries()`. Returns an iterator (insertion ordered) over array that for each key/value pair in the map contains an array `[key, value]`.
-   `forEach(callback:(value, key, map) => void, thisArg?)`. Invokes the given callback for each key / value pair in the map.
-   `clear()`. Removes all entries from this map.
-   `size`. Returns the amount of entries in this map.

The following functions are not in the ES6 spec but are available in MobX:

-   `toJS()`. Converts the observable map back to an normal Map.
-   `toJSON()`. Returns a shallow plain object representation of this map. (For a deep copy use `mobx.toJS(map)`).
-   `intercept(interceptor)`. Registers an interceptor that will be triggered before any changes are applied to the map. See [observe & intercept](observe.md).
-   `observe(listener, fireImmediately?)`. Registers a listener that fires upon each change in this map, similarly to the events that are emitted for [Object.observe](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/observe). See [observe & intercept](observe.md) for more details.
-   `merge(values)`. Copies all entries from the provided object into this map. `values` can be a plain object, array of entries or string-keyed ES6 Map.
-   `replace(values)`. Replaces the entire contents of this map with the provided values.

## `observable.map(values, { deep: false })`

Any values assigned to an observable map will be default passed through [`observable`](observable.md) to make them observable.
Create a shallow map to disable this behavior and store are values as-is. See also [decorators](modifiers.md) for more details on this mechanism.

## `observable.map(values, { name: "my map" })`

The `name` option can be used to give the map a friendly debug name, to be used in for example `spy` or the MobX dev tools.
