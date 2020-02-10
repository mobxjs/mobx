---
title: Observable Arrays
sidebar_label: arrays
hide_title: true
---

## Observable Arrays

<div id='codefund'></div><div class="re_2020"><a class="re_2020_link" href="https://www.react-europe.org/#slot-2149-workshop-typescript-for-react-and-graphql-devs-with-michel-weststrate" target="_blank" rel="sponsored noopener"><div><div class="re_2020_ad" >Ad</div></div><img src="/img/reacteurope.svg"><span>Join the author of MobX at <b>ReactEurope</b> to learn how to use <span class="link">TypeScript with React</span></span></a></div>

Similar to objects, arrays can be made observable using `observable.array(values?)` or by passing an array to `observable`.
This works recursively as well, so all (future) values of the array will also be observable.

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

-   `intercept(interceptor)`. Can be used to intercept any change before it is applied to the array. See [observe & intercept](observe.md)
-   `observe(listener, fireImmediately? = false)` Listen to changes in this array. The callback will receive arguments that express an array splice or array change, conforming to [ES7 proposal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe). It returns a disposer function to stop the listener.
-   `clear()` Remove all current entries from the array.
-   `replace(newItems)` Replaces all existing entries in the array with new ones.
-   `find(predicate: (item, index, array) => boolean, thisArg?)` Basically the same as the ES7 `Array.find` proposal.
-   `findIndex(predicate: (item, index, array) => boolean, thisArg?)` Basically the same as the ES7 `Array.findIndex` proposal.
-   `remove(value)` Remove a single item by value from the array. Returns `true` if the item was found and removed.
-   _[MobX 4 and lower]_ `peek()` Returns an array with all the values which can safely be passed to other libraries, similar to `slice()`.

Unlike the built-in implementation of the functions `sort` and `reverse`, observableArray.sort and reverse will not change the array in-place, but only will return a sorted / reversed copy. From MobX 5 and higher this will show a warning. It is recommended to use `array.slice().sort()` instead.

## `observable.array(values, { deep: false })`

Any values assigned to an observable array will be default passed through [`observable`](observable.md) to make them observable.
Create a shallow array to disable this behavior and store a values as-is. See also [modifiers](modifiers.md) for more details on this mechanism.

## `observable.array(values, { name: "my array" })`

The `name` option can be used to give the array a friendly debug name, to be used in for example `spy` or the MobX dev tools.

## Array limitations in MobX 4 and below

Due to limitations of native arrays in ES5 `observable.array` will create a faux-array (array-like object) instead of a real array.
In practice, these arrays work just as fine as native arrays and all native methods are supported, including index assignments, up-to and including the length of the array.

Bear in mind however that `Array.isArray(observable([]))` will yield `false`, which some native array manipulation methods require and which some external libraries may also require.
E.g. `[].concat(observable([]))` will not work as expected since the native array concat method expects the test to return `true`.
So whenever you need to pass an observable array to an external library or use the observable array as an argument to native array manipulation methods, you should _create a shallow copy by using `array.slice()`_, which will cause `Array.isArray(observable([]).slice())` to yield `true`.
