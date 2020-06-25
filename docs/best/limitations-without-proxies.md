---
title: Limitations without Proxy support
sidebar_label: Limitations without Proxy support
hide_title: true
---

# Limitations without Proxy support

MobX 6 works on any ES 5 environment, but if your environment or browser does not have [Proxy support](https://kangax.github.io/compat-table/es6/#test-Proxy), there are some limitations:

-   Observable arrays are not real arrays, so they won't pass the `Array.isArray()` check. The practical consequence is that you often need to `.slice()` the array first (to get a real array shallow copy) before passing to third party libraries.
-   Adding properties to existing observable objects after creation is not automatically picked up. Either use observable maps instead, or use the the build in [utility functions](https://mobx.js.org/refguide/object-api.html) to read / write / iterate objects that you want to dynamically add properties to.

Luckily, most environments support Proxies these days.

See below for more details.

## `Array.isArray(observable([1,2,3])) === false`

_This limitation only applies if MobX runs in an environment without Proxy support_

In ES5 there is no way to reliably inherit from arrays, and hence observable arrays inherit from objects.
This means that regularly libraries are not able to recognize observable arrays as normal arrays (like lodash, or built-in operations like `Array.concat`).
This can simply be fixed by passing calling `observable.toJS()` or `observable.slice()` before passing the array to another library.
As long as the external library has no intent to modify the array, this will further work completely as expected.
You can use `isObservableArray(observable)` to check whether something is an observable array.

## `object.someNewProp = value` is not picked up

_This limitation only applies if MobX run in an environment without Proxy support.
If you are sure you are in an environment that does have Proxy support and it
still does not work, it could be you forgot to mark the object observable._

MobX observable _objects_ do not detect or react to property assignments that weren't declared observable before.
So MobX observable objects act as records with predefined keys.
You can use `extendObservable(target, props)` to introduce new observable properties to an object.
However object iterators like `for .. in` or `Object.keys()` won't react to this automatically.
If you need a dynamically keyed object in an environment without Proxy support, for example to store users by id, create observable _maps_ using [`observable.map`](../refguide/map.md) or use the utility methods as exposed by the [Object API](../refguide/object-api.md).
For more info see [what will MobX react to?](https://mobx.js.org/best/react.html#what-does-mobx-react-to).
