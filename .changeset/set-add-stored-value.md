---
"mobx": patch
---

`observe`/`spy` `add` events of an observable Set now report the value that was actually stored (e.g. the observable copy of a plain object), matching ObservableMap and observable arrays, so `set.has(change.newValue)` holds
