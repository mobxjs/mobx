---
"mobx": patch
---

Convert the `index` and `deleteCount` arguments of `splice` on observable arrays like `Array.prototype.splice` does. Fractional, `null`, `NaN` and numeric string arguments no longer leave the array in an inconsistent state or report non-integer indices to observers
