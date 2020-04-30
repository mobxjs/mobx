---
sidebar_label: toJS
title: toJS
hide_title: true
---

# toJS

<div id='codefund'></div>

`toJS(value, options?)`

Recursively converts an (observable) object to a javascript _structure_.
Supports observable arrays, objects, maps and primitives.
Computed values and other non-enumerable properties won't be part of the result.
Cycles are detected and properly supported by default, but this can be disabled to improve performance.

`toJS` accepts three options

1. `exportMapsAsObjects` whether to serialize observable maps to objects (`true`) or javascript Map objects (`false`) default `true`.
2. `detectCycles` if a cycle is detected, reuse the already serialized object. Which prevents endless recursion. Default `true`.
3. `recurseEverything` detects and converts observable objects that are "behind" non-observable objects.

For more complex (de)serialization scenario's, one can use [serializr](https://github.com/mobxjs/serializr)

```javascript
var obj = mobx.observable({
    x: 1
})

var clone = mobx.toJS(obj)

console.log(mobx.isObservableObject(obj)) // true
console.log(mobx.isObservableObject(clone)) // false
```

Note: this method was named `toJSON` before MobX 2.2
