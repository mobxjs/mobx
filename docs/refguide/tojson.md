# toJSON

`toJSON(value, supportCycles = true)`
 
Recursively converts an (observable) object to a JSON _structure_.
Supports observable arrays, objects, maps and primitives.
Computed values and other non-enumerable properties won't be part of the result.
Cycles are supported by default, but this can be disabled to improve performance.

```
var obj = mobx.observable({
    x: 1
});

var clone = mobx.toJSON(obj);

console.log(mobx.isObservableObject(obj)); // true
console.log(mobx.isObservableObject(clone)); // false
```