---
title: Observable Arrays
sidebar_label: arrays
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# Observable Arrays

Usage:

-   `observable.array(initialValues?, options?)`
-   `observable(initialValues)`

Similar to objects, arrays can be made observable using `observable.array(values)` or by passing an array to [`observable`](observable.md).
This works recursively as well, so all (future) values of the array will also be observable. If you want to create an empty observable array, create it using
`observable.array()` without arguments.

```javascript
import { observable, autorun } from "mobx"

var todos = observable([
    { title: "Spoil tea", completed: true },
    { title: "Make coffee", completed: false }
])

autorun(() => {
    console.log(
        "Remaining:",
        todos
            .filter(todo => !todo.completed)
            .map(todo => todo.title)
            .join(", ")
    )
})
// Prints: 'Remaining: Make coffee'

todos[0].completed = false
// Prints: 'Remaining: Spoil tea, Make coffee'

todos[2] = { title: "Take a nap", completed: false }
// Prints: 'Remaining: Spoil tea, Make coffee, Take a nap'

todos.shift()
// Prints: 'Remaining: Make coffee, Take a nap'
```

Besides all built-in functions, the following goodies are available as well on observable arrays:

-   `clear()` Remove all current entries from the array.
-   `replace(newItems)` Replaces all existing entries in the array with new ones.
-   `find(predicate: (item, index, array) => boolean, thisArg?)` Basically the same as the ES7 `Array.find` proposal.
-   `findIndex(predicate: (item, index, array) => boolean, thisArg?)` Basically the same as the ES7 `Array.findIndex` proposal.
-   `remove(value)` Remove a single item by value from the array. Returns `true` if the item was found and removed.
-   `intercept(interceptor)`. Can be used to intercept any change before it is applied to the array. See [observe & intercept](observe.md)
-   `observe(listener, fireImmediately? = false)` Listen to changes in this array. The `listener` callback will receive arguments that express an array splice or array change, conforming to [ES7 proposal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe). It returns a disposer function to stop the listener.

Unlike the built-in implementation of the functions `sort` and `reverse`, `observableArray.sort` and `observableArray.reverse` do not change the array in-place, but return a sorted / reversed copy only. From MobX 5 and higher this shows a warning. It is recommended to use `array.slice().sort()` instead.

## `observable.array(values, { deep: false })`

Any values assigned to an observable array will be default passed through [`observable`](observable.md) to make them observable.
Create a shallow array to disable this behavior and store a values as-is. You
can also use `observable.shallow` for this; see also [modifiers](modifiers.md).

## `observable.array(values, { name: "my array" })`

The `name` option can be used to give the array a friendly debug name, to be used in for example `spy` or the MobX dev tools.

## `isObservableArray`

Usage:

-   `isObservableArray(value)`

Returns `true` if `value` is an observable array.

## `isArrayLike`

[Without Proxy support]

Usage:

-   `isArrayLike(thing)`

Returns `true` if the given thing is either a true JS-array or an observable (MobX-)array. This is intended as convenience/shorthand. Note that observable arrays can be `.slice()`d to turn them into true JS-arrays.

## Array limitations in environments without Proxy support

If your environment does not support Proxies, then MobX cannot make its observable array be a real JS Array.

[More information](../best/limitations-without-proxies.md).
