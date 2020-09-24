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

Creates a new observable [ES6 Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set) based on the provided value. Use the `{ deep: false }` option if the values in the set should not be turned into observables.

Use `set` whenever you want to create a dynamic set where the addition and removal of values needs to be observed, but where values can appear only once in the entire collection.

**Note:** your browser needs to support ES6 sets, or you have to use a polyfill to make them work.

## `isObservableSet`

Usage:

-   `isObservableSet(value)`

Returns `true` if `value` is an observable set.
