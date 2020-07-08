---
title: Limitations without Proxy support
sidebar_label: Limitations without Proxy support
hide_title: true
---

# Limitations without Proxy support

MobX 6 works on any ES 5 environment, but if your environment or browser does not have [Proxy support](https://kangax.github.io/compat-table/es6/#test-Proxy), there are some limitations:

-   Observable arrays are not real arrays, so they won't pass the `Array.isArray()` check. The practical consequence is that you often need to `.slice()` the array first (to get a real array shallow copy) before passing to third party libraries.
-   Adding properties to existing observable objects after creation is not automatically picked up. Either use observable maps instead, or use the the build in [utility functions](https://mobx.js.org/refguide/object-api.html) to read / write / iterate objects that you want to dynamically add properties to.

Luckily, most environments support Proxies these days. MobX is configured
to fail if `Proxy` is not available, but you can [change that](../refguide/configure.md#useproxies), for instance:

```javascript
import { configure } from "mobx"

configure({ useProxies: "never" }) // or "ifavailable"
```

## Arrays

_This limitation only applies if MobX runs in an environment without Proxy support_

Due to limitations of native arrays, if Proxy support is not available, `observable.array` will create a faux-array (array-like object) instead of a real array.
In practice, these arrays work just as well as native arrays and all native methods are supported, including index assignments, up-to and including the length of the array.

Bear in mind however that `Array.isArray(observable([1, 2, 3]))` returns `false`.
Some native array manipulation methods as well as external libraries use `Array.isArray` and fail to work properly if it returns `false`. Examples include `Array.concat` as well as libraries like `lodash`.

So whenever you need to pass an observable array to an external library or use the observable array as an argument to native array manipulation methods, you should _create a shallow copy by using `array.slice()`_, which will cause `Array.isArray(observable([]).slice())` to yield `true`. Alternatively you can use the `toJS`
method on observable array. As long as the external library has no intent to modify the array, this works as expected.

You can use [`isObservableArray(observable)`](../refguide/array.md#isobservablearray) to check whether something is an observable array, and [`isArrayLike`](../refguide/array.md#isarraylike) to check whether something is an array at all, observable or not.

## Objects

_This limitation only applies if MobX run in an environment without Proxy support.
If you are sure you are in an environment that does have Proxy support and it
still does not work, it could be you forgot to mark the object observable._

In an environment that does not support Proxies, MobX observable _objects_ do not detect or react to property assignments that weren't declared observable before. So, if you do:

```javascript
object.someNewProp = value
```

is not picked up by MobX.

So MobX observable objects act as records with predefined keys.

You can use `extendObservable(target, props)` to introduce new observable properties to an object.
However object iterators like `for .. in` or `Object.keys()` won't react to this automatically.
If you need a dynamically keyed object in an environment without Proxy support, for example to store users by id, create observable _maps_ using [`observable.map`](../refguide/map.md) or use the utility methods as exposed by the [Object API](../refguide/object-api.md).
For more info see [what will MobX react to?](https://mobx.js.org/best/react.html#what-does-mobx-react-to).

See this [blog post](https://medium.com/@trekinbami/observe-changes-in-dynamically-keyed-objects-with-mobx-and-react-24b4f857bae9) for the different options available to work with dynamically keyed objects in environments without Proxy support.
