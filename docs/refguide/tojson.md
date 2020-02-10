---
sidebar_label: toJS
title: toJS
hide_title: true
---

# toJS

<div id='codefund'></div><div class="re_2020"><a class="re_2020_link" href="https://www.react-europe.org/#slot-2149-workshop-typescript-for-react-and-graphql-devs-with-michel-weststrate" target="_blank" rel="sponsored noopener"><div><div class="re_2020_ad" >Ad</div></div><img src="/img/reacteurope.svg"><span>Join the author of MobX at <b>ReactEurope</b> to learn how to use <span class="link">TypeScript with React</span></span></a></div>

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
