# fastArray

*** Deprecated in 2.0, use `observable(asFlat([]))` instead ***

`fastArray` creates observable arrays, similar to [`observable([])`](observable.md) with two differences:
1. The indices of arrays created by `fastArray` are not enumerable, so `Object.keys(array)` will always return an empty set.  
This means that `for .. in ` loops won't work on them (but normal `for ;; ` loops will).  
This reduces the overhead of adding new items to to an observable array significantly.
2. Arrays created by using `fastArray` will apply the [flat modifier](modifiers.md#asflat) by default; values added to the array will not be made reactive automatically.

`fastArray` will become the default behavior in the next major release.
For more info on observable arrays, see: [observable](observable.md#arrays).