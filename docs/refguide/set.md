---
title: Observable Sets
sidebar_label: sets
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# Observable Sets

Usage:

-   `observable.set(initialSet?, options?)`
-   `observable(set)`

Creates a new observable ES6 Set based on the provided value. Use the `{deep: false}` option if the values in the set should not be turned into observables.

Use `set` whenever you want to create a dynamic set where the addition / removal of values needs to be observed, and where values can appear only once in the collection.

Note that your browser needs to support ES6 sets, or polyfill them, to make sets work.

Sets use the [ES6 Set API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set)

## `isObservableSet`

Usage:

-   `isObservableSet(value)`

Returns `true` if `value` is an observable set.
